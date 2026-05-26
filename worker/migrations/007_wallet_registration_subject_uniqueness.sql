-- Enforce one completed wallet-first registration per Jomhoor pairwise subject.
--
-- Safe rollout plan:
-- 1. Collapse historical duplicates onto a canonical token per subject.
-- 2. Preserve optional email data on the canonical row when possible.
-- 3. Repoint any persisted PKCE rows that still reference duplicate tokens.
-- 4. Add a partial unique index for completed registrations only.

DROP TABLE IF EXISTS tmp_wallet_registration_duplicates;
DROP TABLE IF EXISTS tmp_wallet_registration_canonical;

CREATE TEMP TABLE tmp_wallet_registration_canonical AS
SELECT wr.sso_subject,
       wr.token AS canonical_token,
       (
         SELECT lower(trim(src.email))
           FROM wallet_registrations src
          WHERE src.sso_subject = wr.sso_subject
            AND src.email IS NOT NULL
            AND trim(src.email) != ''
          ORDER BY src.registered_at ASC,
                   src.created_at ASC,
                   src.token ASC
          LIMIT 1
       ) AS canonical_email
  FROM wallet_registrations wr
 WHERE wr.sso_subject IS NOT NULL
   AND trim(wr.sso_subject) != ''
   AND wr.registered_at IS NOT NULL
   AND wr.token = (
     SELECT wr2.token
       FROM wallet_registrations wr2
      WHERE wr2.sso_subject = wr.sso_subject
        AND wr2.registered_at IS NOT NULL
      ORDER BY wr2.registered_at ASC, wr2.created_at ASC, wr2.token ASC
      LIMIT 1
   );

CREATE TEMP TABLE tmp_wallet_registration_duplicates AS
WITH duplicates AS (
  SELECT wr.sso_subject,
         wr.token AS duplicate_token,
         canonical.canonical_token
    FROM wallet_registrations wr
    JOIN tmp_wallet_registration_canonical canonical ON canonical.sso_subject = wr.sso_subject
   WHERE wr.registered_at IS NOT NULL
     AND wr.token != canonical.canonical_token
)
SELECT * FROM duplicates;

UPDATE wallet_registrations
   SET email = (
     SELECT canonical_email
       FROM tmp_wallet_registration_canonical canonical
      WHERE canonical.canonical_token = wallet_registrations.token
   )
 WHERE token IN (
   SELECT DISTINCT canonical_token FROM tmp_wallet_registration_duplicates
 )
   AND (email IS NULL OR trim(email) = '')
   AND EXISTS (
     SELECT 1
       FROM tmp_wallet_registration_canonical canonical
      WHERE canonical.canonical_token = wallet_registrations.token
        AND canonical.canonical_email IS NOT NULL
        AND trim(canonical.canonical_email) != ''
   );

UPDATE sso_pkce
   SET signup_token = (
     SELECT d.canonical_token
       FROM tmp_wallet_registration_duplicates d
      WHERE d.duplicate_token = sso_pkce.signup_token
   )
 WHERE signup_token IN (
   SELECT duplicate_token FROM tmp_wallet_registration_duplicates
 );

DELETE FROM wallet_registrations
 WHERE token IN (
   SELECT duplicate_token FROM tmp_wallet_registration_duplicates
 );

DROP TABLE tmp_wallet_registration_duplicates;
DROP TABLE tmp_wallet_registration_canonical;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_registrations_completed_subject_uidx
  ON wallet_registrations (sso_subject)
  WHERE registered_at IS NOT NULL
    AND sso_subject IS NOT NULL
    AND trim(sso_subject) != '';
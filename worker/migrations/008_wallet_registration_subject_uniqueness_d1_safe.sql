-- D1-safe enforcement of one completed wallet-first registration per Jomhoor subject.
-- This migration avoids TEMP TABLE usage (which can fail with SQLITE_AUTH on D1).
--
-- It is safe to run whether or not migration 007 succeeded.

-- 1) Backfill canonical email onto canonical completed rows when missing.
WITH canonical AS (
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
     )
)
UPDATE wallet_registrations
   SET email = (
     SELECT canonical.canonical_email
       FROM canonical
      WHERE canonical.canonical_token = wallet_registrations.token
   )
 WHERE token IN (SELECT canonical_token FROM canonical)
   AND (email IS NULL OR trim(email) = '')
   AND EXISTS (
     SELECT 1
       FROM canonical
      WHERE canonical.canonical_token = wallet_registrations.token
        AND canonical.canonical_email IS NOT NULL
        AND trim(canonical.canonical_email) != ''
   );

-- 2) Repoint lingering PKCE rows from duplicate completed tokens to canonical tokens.
WITH canonical AS (
  SELECT wr.sso_subject,
         wr.token AS canonical_token
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
     )
), duplicates AS (
  SELECT wr.token AS duplicate_token,
         canonical.canonical_token
    FROM wallet_registrations wr
    JOIN canonical ON canonical.sso_subject = wr.sso_subject
   WHERE wr.registered_at IS NOT NULL
     AND wr.token != canonical.canonical_token
)
UPDATE sso_pkce
   SET signup_token = (
     SELECT duplicates.canonical_token
       FROM duplicates
      WHERE duplicates.duplicate_token = sso_pkce.signup_token
   )
 WHERE signup_token IN (
   SELECT duplicate_token FROM duplicates
 );

-- 3) Delete duplicate completed wallet registration rows per subject.
WITH canonical AS (
  SELECT wr.sso_subject,
         wr.token AS canonical_token
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
     )
)
DELETE FROM wallet_registrations
 WHERE registered_at IS NOT NULL
   AND sso_subject IS NOT NULL
   AND trim(sso_subject) != ''
   AND token != (
     SELECT canonical.canonical_token
       FROM canonical
      WHERE canonical.sso_subject = wallet_registrations.sso_subject
   )
   AND EXISTS (
     SELECT 1
       FROM canonical
      WHERE canonical.sso_subject = wallet_registrations.sso_subject
   );

-- 4) Enforce uniqueness for completed subjects going forward.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_registrations_completed_subject_uidx
  ON wallet_registrations (sso_subject)
  WHERE registered_at IS NOT NULL
    AND sso_subject IS NOT NULL
    AND trim(sso_subject) != '';

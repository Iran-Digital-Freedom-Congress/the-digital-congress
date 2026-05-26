-- Wallet-first registration: users connect Jomhoor wallet without prior email.
-- See guest endpoints in worker/src/sso.js.

CREATE TABLE IF NOT EXISTS wallet_registrations (
  token         TEXT    PRIMARY KEY,           -- random UUID used as session ref
  sso_subject   TEXT,                          -- pairwise subject (set after SSO completes)
  email         TEXT,                          -- optionally collected post-registration
  registered_at INTEGER,                       -- unix epoch seconds when SSO completed
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Allow sso_pkce rows to persist after guest callback so desktop polling detects completion.
-- Email-first rows are still deleted on use; wallet-first rows get completed_at stamped instead.
ALTER TABLE sso_pkce ADD COLUMN completed_at INTEGER;

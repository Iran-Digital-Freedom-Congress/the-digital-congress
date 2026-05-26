-- Jomhoor SSO integration columns + single-use PKCE table.
-- See docs in worker/src/sso.js and jomhoor/Platform docs/SSO/INTEGRATION.md.

ALTER TABLE signups ADD COLUMN sso_subject TEXT;
ALTER TABLE signups ADD COLUMN sso_verified_at DATETIME;

CREATE TABLE IF NOT EXISTS sso_pkce (
  state         TEXT    PRIMARY KEY,
  code_verifier TEXT    NOT NULL,
  signup_token  TEXT    NOT NULL,
  expires_at    INTEGER NOT NULL  -- unix epoch seconds
);

CREATE INDEX IF NOT EXISTS sso_pkce_expires_idx ON sso_pkce (expires_at);

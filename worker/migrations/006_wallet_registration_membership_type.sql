-- Persist participant type for wallet-first registration sessions.
-- Existing rows default to observer for backward compatibility.

ALTER TABLE wallet_registrations
ADD COLUMN membership_type TEXT NOT NULL DEFAULT 'observer';

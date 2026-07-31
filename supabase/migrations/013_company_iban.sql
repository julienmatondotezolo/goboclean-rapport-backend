-- 013_company_iban.sql — IBAN société pour le QR de paiement SEPA (EPC) affiché au client.
-- APPLIQUÉE en prod via MCP Supabase le 30/07/2026.
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS iban TEXT;
UPDATE company_settings SET iban = 'BE73068948314160' WHERE iban IS NULL;

-- 011_payment_and_bon_execution.sql — Lot 3 (Ali) : le bon d'exécution
-- part au PAIEMENT, pas à la complétion.
-- APPLIQUÉE en prod via MCP Supabase le 30/07/2026.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS payment JSONB;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS bon_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN missions.payment IS
  'Paiement enregistré par l''admin : { method: cash|virement|virement_instantane|autre, amount?: number, received_at, recorded_by }';
COMMENT ON COLUMN missions.bon_sent_at IS
  'Date d''envoi du bon d''exécution (PDF) au client — déclenché par l''enregistrement du paiement.';

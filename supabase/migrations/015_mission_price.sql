-- 015_mission_price.sql — prix de la mission (demande d'Ali, 08/10/2026) :
-- fixé au planning (Abou depuis le devis Falco) ou par l'admin ; modifiable
-- par l'admin uniquement ; imposé comme montant du paiement à la clôture
-- (l'ouvrier ne peut plus le changer). NULL = pas de prix fixé.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0);

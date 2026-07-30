-- 010_closure_checklist_and_fuel.sql — Lot 2 (Ali) : clôture bloquante
-- Checklist de fin de chantier + état essence/kilométrage + photos matériel/essence.
-- APPLIQUÉE en prod via MCP Supabase le 30/07/2026.

ALTER TYPE photo_type ADD VALUE IF NOT EXISTS 'material';
ALTER TYPE photo_type ADD VALUE IF NOT EXISTS 'fuel';

ALTER TABLE missions ADD COLUMN IF NOT EXISTS closure_checklist JSONB;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS fuel_state JSONB;

COMMENT ON COLUMN missions.closure_checklist IS
  'Checklist de clôture (tous requis) : nettoyage_client, toit_rince, panneaux_nettoyes, hydrofuge_applique, dibo_rince, camionnette_nettoyee';
COMMENT ON COLUMN missions.fuel_state IS
  'État essence à la clôture : { levels: {<equipment_id>: plein|moitie|vide}, mileage_km: number }';

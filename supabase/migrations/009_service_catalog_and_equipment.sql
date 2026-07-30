-- ============================================================================
-- 009_service_catalog_and_equipment.sql
-- 1) Extend mission_subtype enum with the 16 Roof Revive service catalog ids
--    (source: RoofRevive/Quote-Agent-Knowledge-Base/services.json).
--    'cleaning' / 'coating' are kept as legacy values for existing missions.
-- 2) Add missions.equipment — machines/vehicles assigned to the mission
--    (gros_dibo, petit_dibo, machine_peinture, camionnette). Conflict rules
--    (one machine per day, except machine_peinture ×2) are enforced by the
--    backend, not the DB.
-- ============================================================================

ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'demoussage';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'gouttieres';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'hydrofuge_wax';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'deplacement';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'peinture_toiture';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'facade';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'panneaux_solaires';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'nacelle';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'terrasse';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'mur';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'cheminee';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'piliers';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'velux';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'driveway';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'escalier';
ALTER TYPE mission_subtype ADD VALUE IF NOT EXISTS 'evac_mousse';

ALTER TABLE missions ADD COLUMN IF NOT EXISTS equipment TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN missions.equipment IS
  'Machines/véhicules affectés : gros_dibo, petit_dibo, machine_peinture, camionnette. Conflits gérés par le backend (capacités : 1,1,2,illimité).';

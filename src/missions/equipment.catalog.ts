/**
 * Machines et véhicules Roof Revive affectables à une mission.
 * capacity = nombre d'exemplaires disponibles par jour ; null = pas de limite.
 * Flotte réelle (confirmée par Julien) : 1 camionnette + 1 Hilux.
 * Règle d'Ali : deux équipes ne peuvent jamais avoir la même machine le même
 * jour — sauf la machine peinture, qui existe en deux exemplaires.
 */
export const EQUIPMENT_CATALOG: Record<string, { label: string; capacity: number | null }> = {
  gros_dibo: { label: 'Gros Dibo', capacity: 1 },
  petit_dibo: { label: 'Petit Dibo', capacity: 1 },
  machine_peinture: { label: 'Machine peinture', capacity: 2 },
  camionnette: { label: 'Camionnette', capacity: 1 },
  hilux: { label: 'Hilux', capacity: 1 },
};

export const EQUIPMENT_IDS = Object.keys(EQUIPMENT_CATALOG);

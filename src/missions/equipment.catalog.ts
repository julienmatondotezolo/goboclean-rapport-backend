/**
 * Machines et véhicules Roof Revive affectables à une mission.
 * capacity = nombre d'exemplaires disponibles par jour ; null = pas de limite
 * (les camionnettes ne sont pas comptées tant qu'Ali n'a pas donné leur nombre).
 * Règle d'Ali : deux équipes ne peuvent jamais avoir la même machine le même
 * jour — sauf la machine peinture, qui existe en deux exemplaires.
 */
export const EQUIPMENT_CATALOG: Record<string, { label: string; capacity: number | null }> = {
  gros_dibo: { label: 'Gros Dibo', capacity: 1 },
  petit_dibo: { label: 'Petit Dibo', capacity: 1 },
  machine_peinture: { label: 'Machine peinture', capacity: 2 },
  camionnette: { label: 'Camionnette', capacity: null },
};

export const EQUIPMENT_IDS = Object.keys(EQUIPMENT_CATALOG);

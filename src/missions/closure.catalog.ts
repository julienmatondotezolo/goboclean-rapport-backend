/**
 * Clôture de chantier — règles d'Ali (vocaux du 30/07/2026) :
 * la clôture est BLOQUANTE tant que la checklist n'est pas entièrement cochée,
 * qu'il n'y a pas au moins une photo du matériel nettoyé, et que l'état
 * d'essence (+ kilométrage + photo) n'est pas renseigné.
 */
export const CLOSURE_CHECKLIST_IDS = [
  'nettoyage_client', // Nettoyage après le client
  'toit_rince', // Toit à rincer
  'panneaux_nettoyes', // Panneaux solaires à nettoyer
  'hydrofuge_applique', // Hydrofuge à appliquer
  'dibo_rince', // Dibo à rincer
  'camionnette_nettoyee', // Camionnette à nettoyer
] as const;

export const FUEL_LEVELS = ['plein', 'moitie', 'vide'] as const;

/** Matériel dont on suit l'essence (la machine peinture n'a pas de réservoir suivi). */
export const FUEL_EQUIPMENT = ['gros_dibo', 'petit_dibo', 'camionnette'];

export interface FuelState {
  levels: Record<string, (typeof FUEL_LEVELS)[number]>;
  mileage_km: number;
}

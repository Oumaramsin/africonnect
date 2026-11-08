// Événements internes entre écrans (DeviceEventEmitter)

/** Une proposition de devis vient d'être envoyée : la liste des annonces se met à jour. */
export const PROPOSALS_UPDATED_EVENT = "dabari_proposals_updated";

/** Une offre vient d'être acceptée (devis signé) : l'écran des commandes ouvre ce devis. */
export const OPEN_DEVIS_EVENT = "dabari_open_devis";

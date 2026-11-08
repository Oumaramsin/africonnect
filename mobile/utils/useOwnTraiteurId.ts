import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { getSecureToken } from "./storage";

/**
 * Identifiant du profil traiteur de l'utilisateur connecté (null pour un invité ou un client) :
 * un traiteur ne peut ni se demander un devis ni commander ses propres plats (l'API le refuse aussi).
 */
export function useOwnTraiteurId(): string | null {
  const [ownTraiteurId, setOwnTraiteurId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getSecureToken("token");
        if (!token) return;
        // Contrôle facultatif sur une page publique : un jeton expiré ne doit ni déconnecter
        // l'utilisateur ni le renvoyer vers la connexion (skipAuth : pas de traitement global du 401)
        const res = await apiFetch("/traiteur/me", {
          skipAuth: true,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.traiteur?.id === "string") {
          setOwnTraiteurId(data.traiteur.id);
        }
      } catch {
        // Sans incidence : l'API refuse de toute façon une demande à soi-même
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ownTraiteurId;
}

"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

/**
 * Vrai si le profil traiteur affiché appartient à l'utilisateur connecté : il ne peut ni se demander
 * un devis ni commander ses propres plats (l'API le refuse aussi).
 */
export function useIsOwnTraiteur(traiteurId: string | null | undefined): boolean {
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    if (!traiteurId) return;
    let cancelled = false;
    void getCurrentUser().then((user) => {
      if (!cancelled) setIsOwn(Boolean(user?.traiteurIds.includes(traiteurId)));
    });
    return () => {
      cancelled = true;
    };
  }, [traiteurId]);

  return isOwn;
}

"use client";

import { useEffect } from "react";

/**
 * Custom hook réutilisable écoutant la touche "Escape" pour fermer une modale ou un dialogue.
 * Gère automatiquement l'attachement et le détachement (cleanup) de l'écouteur d'événements window,
 * évitant tout risque de fuite de mémoire (memory leak) et tout boilerplate redondant.
 *
 * @param onEscape Fonction exécutée lors de l'appui sur Échap
 * @param isActive Indique si l'écouteur doit être actif (ex: isOpen && !loading)
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, isActive]);
}

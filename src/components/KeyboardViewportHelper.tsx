"use client";

import { useEffect } from "react";

/**
 * KeyboardViewportHelper
 * Garantit que sur TOUTES les pages de l'application Web mobile, dès qu'un champ
 * (input, textarea, select) est touché et que le clavier virtuel apparaît :
 * 1. Un padding bas dynamique est injecté sur document.body pour donner de la marge de scroll.
 * 2. Le champ actif est immédiatement et doucement recentré au milieu de l'écran visible.
 * 3. À la fermeture du clavier, la disposition revient exactement à son état normal.
 */
export default function KeyboardViewportHelper() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let scrollTimeouts: any[] = [];

    const clearAllTimeouts = () => {
      scrollTimeouts.forEach(clearTimeout);
      scrollTimeouts = [];
    };

    const scrollToActiveElement = (el: HTMLElement) => {
      if (!el) return;
      try {
        // block: "center" garantit que le champ est placé bien au milieu de la zone visible
        el.scrollIntoView({
          behavior: "auto",
          block: "center",
          inline: "nearest",
        });
      } catch {
        try {
          el.scrollIntoView(true);
        } catch {}
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const isMobile = window.innerWidth <= 1024;

      if (!isMobile) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (!isInputElement) return;

      const inputType = (target as HTMLInputElement).type;
      if (
        inputType === "checkbox" ||
        inputType === "radio" ||
        inputType === "button" ||
        inputType === "submit"
      )
        return;

      clearAllTimeouts();

      // 1. Ajouter un espace bas dynamique sur mobile pour permettre à la page de remonter sans restriction
      document.body.classList.add("keyboard-active");
      const keyboardEstimate = Math.max(
        420,
        Math.round(window.innerHeight * 0.55)
      );
      document.body.style.paddingBottom = `${keyboardEstimate}px`;

      // 2. Déclencher le recentrage en plusieurs vagues pour couvrir toute la durée d'ouverture du clavier
      [20, 100, 250, 400, 600].forEach((delay) => {
        const tid = setTimeout(() => {
          scrollToActiveElement(target);
        }, delay);
        scrollTimeouts.push(tid);
      });
    };

    const handleFocusOut = () => {
      clearAllTimeouts();
      const tid = setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        const stillInput =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT");

        if (!stillInput) {
          document.body.classList.remove("keyboard-active");
          document.body.style.paddingBottom = "";
        }
      }, 200);
      scrollTimeouts.push(tid);
    };

    const handleViewportResize = () => {
      const isMobile = window.innerWidth <= 1024;
      if (!isMobile) return;

      const active = document.activeElement as HTMLElement | null;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT");

      if (isInput) {
        document.body.classList.add("keyboard-active");
        const extraPadding = Math.max(
          420,
          Math.round(window.innerHeight * 0.55)
        );
        document.body.style.paddingBottom = `${extraPadding}px`;
        scrollToActiveElement(active);
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", handleViewportResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      clearAllTimeouts();
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", handleViewportResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
      document.body.classList.remove("keyboard-active");
      document.body.style.paddingBottom = "";
    };
  }, []);

  return null;
}

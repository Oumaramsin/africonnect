"use client";

import { useEffect, useState } from "react";
import { NETWORK_EVENT } from "../lib/network";

type Status = "online" | "offline" | "restored";

/**
 * Bandeau de connexion : s'affiche quand le navigateur passe hors ligne ou qu'un appel à l'API
 * échoue faute de réponse, puis confirme brièvement le retour de la connexion.
 */
export default function NetworkStatusBanner() {
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;

    const goOffline = () => {
      clearTimeout(restoreTimer);
      setStatus("offline");
    };
    const goOnline = () => {
      setStatus((current) => {
        if (current !== "offline") return current;
        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => setStatus("online"), 3000);
        return "restored";
      });
    };
    const onApiStatus = (event: Event) => {
      const online = (event as CustomEvent<{ online: boolean }>).detail?.online;
      if (online) goOnline();
      else goOffline();
    };

    if (!navigator.onLine) goOffline();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    window.addEventListener(NETWORK_EVENT, onApiStatus);
    return () => {
      clearTimeout(restoreTimer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener(NETWORK_EVENT, onApiStatus);
    };
  }, []);

  if (status === "online") return null;

  const offline = status === "offline";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg max-w-[calc(100%-2rem)] text-center ${
        offline ? "bg-amber-500 text-white" : "bg-[#1D6B45] text-white"
      }`}
    >
      {offline
        ? "Connexion perdue : vérifiez votre réseau, puis relancez votre action."
        : "Connexion rétablie"}
    </div>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { authFetch, getCurrentUser, hasSession, type CurrentUser } from "@/lib/auth";

/*
 * Session et compteur de notifications partagés par la barre de navigation (Navbar) et la barre
 * du bas (BottomNav) : l'utilisateur courant est mis en cache par lib/auth.ts et le compteur de
 * notifications est lu par une seule requête à la fois pour toute la page, au plus toutes les
 * 30 secondes lors de la navigation (immédiatement sur l'événement « notifications-updated »).
 */

const NOTIFICATIONS_EVENT = "notifications-updated";
const UNREAD_REFRESH_INTERVAL_MS = 30_000;

let unreadCount = 0;
let unreadFetchedAt = 0;
let unreadRequest: Promise<void> | null = null;
let unreadRefreshQueued = false;
const unreadListeners = new Set<() => void>();
let eventSubscribers = 0;

const setUnreadCount = (count: number) => {
  if (count === unreadCount) return;
  unreadCount = count;
  unreadListeners.forEach((listener) => listener());
};

/**
 * Relit le nombre de notifications non lues. Sans `force`, une valeur lue il y a moins de 30 s
 * est conservée. Hors ligne, la dernière valeur connue est gardée.
 */
function refreshUnreadCount(force = false): void {
  if (unreadRequest) {
    // Lecture déjà en cours : une valeur plus récente est demandée, elle sera relue à la fin
    if (force) unreadRefreshQueued = true;
    return;
  }
  if (!force && Date.now() - unreadFetchedAt < UNREAD_REFRESH_INTERVAL_MS) return;

  unreadRequest = authFetch("/api/notifications", { cache: "no-store" })
    .then(async (res) => {
      if (res.status === 401) {
        setUnreadCount(0);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      unreadFetchedAt = Date.now();
      setUnreadCount(Number(data?.unread_count) || 0);
    })
    .catch(() => undefined)
    .finally(() => {
      unreadRequest = null;
      if (unreadRefreshQueued) {
        unreadRefreshQueued = false;
        refreshUnreadCount(true);
      }
    });
}

const onNotificationsUpdated = () => refreshUnreadCount(true);

const subscribeUnread = (listener: () => void) => {
  unreadListeners.add(listener);
  return () => {
    unreadListeners.delete(listener);
  };
};

const getUnreadSnapshot = () => unreadCount;
const getServerUnreadSnapshot = () => 0;

export interface NavSession {
  /** Session ouverte. Reste vrai si l'API est injoignable (hors ligne) tant que la session n'a pas expiré. */
  isLoggedIn: boolean;
  /** Utilisateur courant, ou null tant qu'il n'a pas pu être lu (chargement, hors ligne). */
  user: CurrentUser | null;
  /** Notifications non lues (0 si déconnecté). */
  unreadCount: number;
}

/** Session et notifications non lues pour les barres de navigation, relues à chaque changement de page. */
export function useNavSession(pathname: string): NavSession {
  const [session, setSession] = useState<{ isLoggedIn: boolean; user: CurrentUser | null }>({
    isLoggedIn: false,
    user: null,
  });
  const count = useSyncExternalStore(subscribeUnread, getUnreadSnapshot, getServerUnreadSnapshot);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      if (user) {
        setSession({ isLoggedIn: true, user });
      } else if (hasSession()) {
        // /auth/me sans réponse exploitable (hors ligne, délai dépassé, panne) alors que la session
        // n'a pas été refusée par l'API (un 401 l'aurait effacée) : l'utilisateur reste connecté
        setSession((previous) => ({ isLoggedIn: true, user: previous.user }));
      } else {
        setSession({ isLoggedIn: false, user: null });
      }
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const { isLoggedIn } = session;

  // Relecture du compteur à la navigation (limitée à une toutes les 30 s)
  useEffect(() => {
    if (isLoggedIn) refreshUnreadCount();
  }, [isLoggedIn, pathname]);

  // Un seul écouteur de « notifications-updated » pour toutes les barres affichées
  useEffect(() => {
    if (!isLoggedIn) return;
    eventSubscribers += 1;
    if (eventSubscribers === 1) window.addEventListener(NOTIFICATIONS_EVENT, onNotificationsUpdated);
    return () => {
      eventSubscribers -= 1;
      if (eventSubscribers === 0) window.removeEventListener(NOTIFICATIONS_EVENT, onNotificationsUpdated);
    };
  }, [isLoggedIn]);

  return { ...session, unreadCount: isLoggedIn ? count : 0 };
}

import React, { useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NETWORK_EVENT } from "../utils/network";

type Status = "online" | "offline" | "restored";

/** Intervalle des vérifications de reconnexion tant que l'API reste injoignable. */
const PROBE_INTERVAL_MS = 15000;

/**
 * Bandeau de connexion : s'affiche quand un appel à l'API échoue faute de réponse, vérifie
 * régulièrement le retour du réseau (sans dépendance native), puis confirme la reconnexion.
 */
export default function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>("online");
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      NETWORK_EVENT,
      (event: { online: boolean }) => {
        if (restoreTimer.current) clearTimeout(restoreTimer.current);
        if (!event.online) {
          setStatus("offline");
          return;
        }
        setStatus((current) => {
          if (current !== "offline") return current;
          restoreTimer.current = setTimeout(() => setStatus("online"), 3000);
          return "restored";
        });
      }
    );
    return () => {
      subscription.remove();
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
    };
  }, []);

  // Hors ligne : sonde légère de l'API ; toute réponse signifie que la connexion est revenue
  useEffect(() => {
    if (status !== "offline") return;
    const baseUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/$/, "");
    const interval = setInterval(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        await fetch(`${baseUrl}/health`, { signal: controller.signal });
        DeviceEventEmitter.emit(NETWORK_EVENT, { online: true });
      } catch {
        // Toujours hors ligne : nouvelle tentative au prochain intervalle
      } finally {
        clearTimeout(timeout);
      }
    }, PROBE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "online") return null;

  const offline = status === "offline";
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { top: insets.top + 8 }, offline ? styles.offline : styles.restored]}
    >
      <Text style={styles.text}>
        {offline
          ? "Connexion perdue : vérifiez votre réseau, puis relancez votre action."
          : "Connexion rétablie"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "92%",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    zIndex: 1000,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  offline: {
    backgroundColor: "#D97706",
  },
  restored: {
    backgroundColor: "#1D6B45",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});

import { useEffect } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { apiFetch } from "../utils/api";
import { openNotificationTarget } from "../utils/notificationRoutes";
import { configureNotifications, registerForPushNotifications } from "../utils/pushNotifications";
import { getSecureToken, SESSION_STARTED_EVENT } from "../utils/storage";

/** Notifications push déjà ouvertes (évite une double navigation au démarrage). */
const handledResponses = new Set<string>();

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const id = response.notification.request.identifier;
  if (handledResponses.has(id)) return;
  handledResponses.add(id);

  const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
  // La notification correspondante est marquée comme lue (même effet que depuis l'écran Notifications)
  if (typeof data.notification_id === "string") {
    apiFetch(`notifications/${encodeURIComponent(data.notification_id)}/read`, { method: "PATCH" })
      .then(() => DeviceEventEmitter.emit("dabari_notifications_updated"))
      .catch(() => undefined);
  }
  openNotificationTarget({ type: typeof data.type === "string" ? data.type : null, data });
}

/**
 * Branche les notifications push de l'application : enregistrement de l'appareil à l'ouverture de
 * session (et au lancement si une session existe), rafraîchissement des badges à la réception, et
 * ouverture de l'écran concerné quand l'utilisateur touche une notification.
 */
export default function PushNotificationsManager() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void configureNotifications();

    getSecureToken("token")
      .then((token) => {
        if (token) void registerForPushNotifications();
      })
      .catch(() => undefined);

    const sessionSubscription = DeviceEventEmitter.addListener(SESSION_STARTED_EVENT, () => {
      void registerForPushNotifications();
    });
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      DeviceEventEmitter.emit("dabari_notifications_updated");
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Application lancée par le toucher d'une notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) setTimeout(() => handleNotificationResponse(response), 0);
      })
      .catch(() => undefined);

    return () => {
      sessionSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return null;
}

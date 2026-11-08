import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { apiFetch } from "./api";
import { deleteSecureToken, getSecureToken, saveSecureToken } from "./storage";

/*
 * Notifications push : l'appareil demande l'autorisation, obtient son jeton Expo et le rattache au
 * compte connecté (POST /push-tokens). Le serveur envoie alors un push pour chaque notification
 * créée pour ce compte (devis, commandes, GP...). Le jeton est détaché à la déconnexion.
 *
 * Non disponible sur le web, ni dans Expo Go sur Android (il faut un build EAS) ; sur iOS, seulement
 * sur un appareil réel. L'envoi Android passe par Firebase : le build doit inclure google-services.json
 * (voir app.config.js).
 */

/** Dernier jeton enregistré sur ce téléphone, pour pouvoir le détacher à la déconnexion. */
const PUSH_TOKEN_KEY = "dabari_push_token";
export const ANDROID_CHANNEL_ID = "default";

/** Application lancée dans Expo Go (et non dans un build EAS) : les push y sont indisponibles. */
const isExpoGo = (): boolean =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === "expo";

export function isPushSupported(): boolean {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android" && isExpoGo()) return false;
  if (Platform.OS === "ios" && !Device.isDevice) return false;
  return true;
}

let configured = false;

/** Affichage des notifications reçues pendant que l'application est ouverte, et canal Android. */
export async function configureNotifications(): Promise<void> {
  if (configured || Platform.OS === "web") return;
  configured = true;
  // Expo Go sur Android n'a plus de module de notifications fonctionnel (SDK 53+) : la création du
  // canal y lève une erreur native. Rien à configurer : les push ne marchent que dans un build EAS.
  if (Platform.OS === "android" && isExpoGo()) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      // Le canal doit exister avant la demande d'autorisation (Android 13+)
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Notifications Dabari",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1D6B45",
      });
    }
  } catch (error) {
    // Jamais bloquant : l'application reste utilisable sans notifications
    console.warn("Configuration des notifications impossible :", error instanceof Error ? error.message : error);
  }
}

let registration: Promise<void> | null = null;

/**
 * Demande l'autorisation si besoin puis rattache le jeton de l'appareil au compte connecté.
 * Silencieux en cas d'échec (refus, hors ligne, build sans Firebase) : l'application reste utilisable.
 */
export function registerForPushNotifications(): Promise<void> {
  if (!isPushSupported()) return Promise.resolve();
  if (!registration) {
    registration = doRegister().finally(() => {
      registration = null;
    });
  }
  return registration;
}

async function doRegister(): Promise<void> {
  try {
    await configureNotifications();

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted" && current.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Notifications push : projectId EAS absent (lancez `eas init`).");
      return;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const res = await apiFetch("push-tokens", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    if (res.ok) await saveSecureToken(PUSH_TOKEN_KEY, token);
  } catch (error) {
    console.warn("Notifications push indisponibles :", error instanceof Error ? error.message : error);
  }
}

/** Déconnexion : le téléphone ne doit plus recevoir les notifications du compte. */
export async function unregisterPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const token = await getSecureToken(PUSH_TOKEN_KEY);
    if (token) {
      await apiFetch("push-tokens", {
        method: "DELETE",
        body: JSON.stringify({ token }),
        timeoutMs: 8000,
      });
    }
  } catch {
    // Hors ligne : le jeton sera réattribué au prochain compte connecté sur ce téléphone
  } finally {
    await deleteSecureToken(PUSH_TOKEN_KEY);
  }
}

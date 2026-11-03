import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function saveSecureToken(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getSecureToken(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

export async function deleteSecureToken(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage remove error:", e);
    }
  } else {
    // Depuis le SDK 58, iOS rejette la promesse si le trousseau refuse la suppression : on garde
    // l'ancien comportement (pas d'exception) pour que la déconnexion et la redirection aboutissent.
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("SecureStore delete error:", e);
    }
  }
}

/** Panier de plats en cours (fiche traiteur → écran de commande). */
export const CART_STORAGE_KEY = "dabari_cart";

/**
 * Déconnexion : supprime le jeton et les données propres à l'utilisateur (panier), pour que le
 * compte suivant sur cet appareil ne retrouve pas le panier du précédent.
 */
export async function clearUserSession(): Promise<void> {
  await deleteSecureToken("token");
  await deleteSecureToken(CART_STORAGE_KEY);
}

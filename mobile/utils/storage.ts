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
    await SecureStore.deleteItemAsync(key);
  }
}

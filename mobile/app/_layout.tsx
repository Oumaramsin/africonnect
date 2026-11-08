import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import NetworkBanner from "../components/NetworkBanner";
import PushNotificationsManager from "../components/PushNotificationsManager";
import { hideSplash } from "../utils/splash";

export default function RootLayout() {
  // Filet de sécurité : ouverture directe d'un autre écran (lien, notification), ou lecture lente
  useEffect(() => {
    const timer = setTimeout(hideSplash, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          backgroundColor: "#0B3B24",
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#0B3B24",
            },
          }}
        />
        <BottomNav />
        <NetworkBanner />
        <PushNotificationsManager />
      </View>
    </SafeAreaProvider>
  );
}

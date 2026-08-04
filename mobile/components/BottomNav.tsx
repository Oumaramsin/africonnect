import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  DeviceEventEmitter,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSecureToken } from "../utils/storage";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = await getSecureToken("token");
      if (!token) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUnreadCount(0);
        return;
      }

      setIsLoggedIn(true);

      try {
        // Décodage sommaire du payload JWT
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const decoded = JSON.parse(
            decodeURIComponent(
              atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"))
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
            )
          );
          if (decoded.role === "admin") {
            setIsAdmin(true);
          }
        }

        // Fetch des notifications non lues
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        // Fallback silencieux en cas d'erreur de décodage ou réseau
      }
    };

    fetchUserData();

    const sub = DeviceEventEmitter.addListener(
      "dabari_orders_updated",
      fetchUserData,
    );
    return () => sub.remove();
  }, [pathname]);

  // Masquer le BottomNav sur les pages de connexion/inscription
  const hideOn = ["/login", "/register", "/(auth)/login", "/(auth)/register"];
  if (hideOn.some((route) => pathname.includes(route))) {
    return null;
  }

  const items = [
    {
      href: "/accueil",
      label: "Accueil",
      iconActive: "home",
      iconInactive: "home-outline",
    },
    {
      href: "/services",
      label: "Services",
      iconActive: "grid",
      iconInactive: "grid-outline",
    },
    {
      href: "/commandes",
      label: "Commandes",
      iconActive: "cube",
      iconInactive: "cube-outline",
    },
  ];

  if (isLoggedIn) {
    items.push({
      href: "/profil",
      label: "Profil",
      iconActive: "person",
      iconInactive: "person-outline",
    });
    if (isAdmin) {
      items.push({
        href: "/admin",
        label: "Admin",
        iconActive: "shield-checkmark",
        iconInactive: "shield-checkmark-outline",
      });
    }
  } else {
    items.push({
      href: "/(auth)/login",
      label: "Connexion",
      iconActive: "log-in",
      iconInactive: "log-in-outline",
    });
  }

  return (
    <View
      style={[
        styles.navBarContainer,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.navBarRow}>
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/accueil" && pathname.startsWith(item.href));

          const isCommandes = item.label === "Commandes";

          return (
            <TouchableOpacity
              key={item.href}
              style={styles.navItem}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={(isActive ? item.iconActive : item.iconInactive) as any}
                  size={22}
                  color={isActive ? "#1D6B45" : "#9CA3AF"}
                />

                {/* Badge rouge notifications non lues sur Commandes */}
                {isCommandes && unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.navItemText,
                  isActive && styles.navItemTextActive,
                ]}
              >
                {item.label}
              </Text>

              {/* Petit point vert sous l'icône active */}
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navBarContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  navBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    position: "relative",
    gap: 2,
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  navItemText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  navItemTextActive: {
    color: "#1D6B45",
    fontWeight: "700",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1D6B45",
    marginTop: 2,
  },
});

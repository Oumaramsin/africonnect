import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LoadErrorStateProps {
  /** Message affiché sous le titre (message de l'API ou de la couche réseau). */
  message: string;
  /** Relance le chargement. */
  onRetry: () => void;
  title?: string;
  /** Erreur de connexion (hors ligne, délai dépassé) : icône « hors ligne » au lieu de l'alerte. */
  offline?: boolean;
  /** Nouvelle tentative en cours : bouton désactivé avec indicateur. */
  retrying?: boolean;
  /** Action secondaire facultative (ex. revenir à l'écran précédent). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Conteneur (fond, marges, flex) selon l'écran. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Carte « chargement impossible » avec bouton Réessayer, à afficher à la place du contenu d'un
 * écran de lecture quand ses données n'ont pas pu être chargées (modèle de l'espace traiteur).
 */
export default function LoadErrorState({
  message,
  onRetry,
  title = "Chargement impossible",
  offline = false,
  retrying = false,
  secondaryLabel,
  onSecondary,
  style,
}: LoadErrorStateProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, offline && styles.iconCircleOffline]}>
          <Ionicons
            name={offline ? "cloud-offline-outline" : "alert-circle-outline"}
            size={38}
            color={offline ? "#D97706" : "#DC2626"}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, retrying && styles.retryBtnDisabled]}
          onPress={onRetry}
          disabled={retrying}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        {secondaryLabel && onSecondary ? (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onSecondary}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircleOffline: {
    backgroundColor: "#FEF3C7",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0B3B24",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnDisabled: {
    opacity: 0.6,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

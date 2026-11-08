import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NegociationEntry } from "../utils/types/traiteur";
import { describeNegociationEntry } from "../utils/negociation";

type Props = {
  entries: NegociationEntry[];
  /** Point de vue : les étapes de l'utilisateur sont alignées à droite */
  viewer: "client" | "traiteur";
  traiteurName?: string | null;
};

const formatStepDate = (value: string): string => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

/** Historique de la négociation du prix d'une offre (contre-propositions et réponses du traiteur). */
export default function NegociationThread({ entries, viewer, traiteurName }: Props) {
  if (entries.length === 0) return null;

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Ionicons name="swap-vertical" size={13} color="#6D28D9" />
        <Text style={styles.title}>Négociation du prix</Text>
      </View>
      {entries.map((entry, index) => {
        const mine = (entry.auteur === "client") === (viewer === "client");
        return (
          <View key={`${entry.at}-${index}`} style={[styles.step, mine ? styles.stepMine : styles.stepOther]}>
            <Text style={styles.stepTitle}>{describeNegociationEntry(entry, viewer, traiteurName)}</Text>
            {entry.message ? <Text style={styles.stepMessage}>« {entry.message} »</Text> : null}
            <Text style={styles.stepDate}>{formatStepDate(entry.at)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 12, fontWeight: "800", color: "#5B21B6" },
  step: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, maxWidth: "92%", gap: 2 },
  stepMine: { alignSelf: "flex-end", backgroundColor: "#EDE9FE" },
  stepOther: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E9D5FF" },
  stepTitle: { fontSize: 12.5, fontWeight: "800", color: "#1E1B4B" },
  stepMessage: { fontSize: 12.5, color: "#334155", lineHeight: 17, fontStyle: "italic" },
  stepDate: { fontSize: 10.5, color: "#64748B" },
});

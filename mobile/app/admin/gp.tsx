import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";

type Profile = {
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
};

type GpListing = {
  id: string;
  gp_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  available_kg: number;
  price_per_kg: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  gp?: Profile | null;
};

export default function AdminGpScreen() {
  const router = useRouter();

  const [gpListings, setGpListings] = useState<GpListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suppression
  const [deleteGpId, setDeleteGpId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chargement des annonces GP
  const loadGpListings = async () => {
    setIsLoading(true);
    setError(null);

    const token = await getSecureToken("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/admin`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Erreur de chargement des trajets GP");
        return;
      }

      setGpListings(data.data?.gpListings || []);
    } catch (err) {
      setError("Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGpListings();
    }, [])
  );

  // 🔄 Basculer l'état Actif / Inactif de la publication GP
  const toggleGpStatus = async (id: string, currentStatus: boolean) => {
    const token = await getSecureToken("token");
    const newStatus = !currentStatus;

    // Optimistic UI update
    setGpListings((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_active: newStatus } : g))
    );

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/admin/gp`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: id,
          is_active: newStatus,
        }),
      });

      if (!response.ok) {
        setGpListings((prev) =>
          prev.map((g) => (g.id === id ? { ...g, is_active: currentStatus } : g))
        );
        const data = await response.json();
        setError(data.error || "Erreur lors de la modification du statut");
      }
    } catch (err) {
      setGpListings((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_active: currentStatus } : g))
      );
      setError("Impossible de contacter le serveur.");
    }
  };

  // 🗑️ Supprimer un trajet GP
  const handleDeleteGp = async () => {
    if (!deleteGpId) return;
    setIsDeleting(true);
    const token = await getSecureToken("token");

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/admin/gp`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: deleteGpId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setGpListings((prev) => prev.filter((g) => g.id !== deleteGpId));
      setDeleteGpId(null);
    } catch (err: any) {
      setError(err.message || "Erreur de suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <View style={styles.topWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* 🟢 HEADER ADMIN GP */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/admin" as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Tableau de bord</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="airplane" size={24} color="#1D6B45" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Gestion des GP Colis</Text>
              <Text style={styles.headerSubtitle}>
                {gpListings.length} annonces de transport publiées
              </Text>
            </View>
          </View>
        </View>

        {/* 📜 LISTE DES ANNONCES GP */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#B91C1C" />
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#1D6B45" />
              <Text style={styles.loadingText}>Chargement des trajets GP...</Text>
            </View>
          ) : gpListings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="airplane-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Aucune annonce GP publiée</Text>
              <Text style={styles.emptySub}>
                Aucun trajet de transport de colis n'est actuellement disponible.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {gpListings.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.routeRow}>
                      <View style={styles.cityCol}>
                        <Text style={styles.cityName}>
                          {item.departure_city}
                        </Text>
                        <Text style={styles.countryName}>
                          {item.departure_country || "France"}
                        </Text>
                      </View>

                      <Ionicons name="arrow-forward" size={18} color="#94A3B8" />

                      <View style={styles.cityCol}>
                        <Text style={[styles.cityName, { color: "#1D6B45" }]}>
                          {item.arrival_city}
                        </Text>
                        <Text style={[styles.countryName, { color: "rgba(29, 107, 69, 0.7)" }]}>
                          {item.arrival_country || ""}
                        </Text>
                      </View>
                    </View>

                    {/* Switch d'activation */}
                    <View style={styles.switchCol}>
                      <Text
                        style={[
                          styles.switchLabel,
                          item.is_active ? styles.switchActive : styles.switchInactive,
                        ]}
                      >
                        {item.is_active ? "Actif" : "Masqué"}
                      </Text>
                      <Switch
                        value={item.is_active}
                        onValueChange={() =>
                          toggleGpStatus(item.id, item.is_active)
                        }
                        trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                        thumbColor={item.is_active ? "#1D6B45" : "#94A3B8"}
                      />
                    </View>
                  </View>

                  {/* Profil Transporteur */}
                  <View style={styles.transporteurRow}>
                    <Ionicons name="person-circle-outline" size={18} color="#64748B" />
                    <Text style={styles.transporteurText}>
                      Transporteur : {item.gp?.full_name || "GP Anonyme"}
                    </Text>
                  </View>

                  {/* Métriques */}
                  <View style={styles.metricsBox}>
                    <View style={styles.metricItem}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.metricItemText}>
                        {formatDate(item.departure_date)}
                      </Text>
                    </View>

                    <View style={styles.dividerVertical} />

                    <View style={styles.metricItem}>
                      <Ionicons name="cube-outline" size={14} color="#64748B" />
                      <Text style={styles.metricItemText}>
                        {Number(item.available_kg)} kg dispo
                      </Text>
                    </View>

                    <View style={styles.dividerVertical} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricItemLabel}>Tarif/kg</Text>
                      <Text style={styles.metricItemPrice}>
                        {Number(item.price_per_kg)} €
                      </Text>
                    </View>
                  </View>

                  {/* Footer Actions */}
                  <View style={styles.cardFooter}>
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color="#64748B" />
                      <Text style={styles.contactText}>
                        {item.gp?.phone || item.gp?.whatsapp || "Non renseigné"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                      onPress={() => setDeleteGpId(item.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={styles.deleteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 🗑️ MODALE SUPPRESSION GP */}
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(deleteGpId)}
          onRequestClose={() => !isDeleting && setDeleteGpId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={28} color="#DC2626" />
              </View>

              <Text style={styles.modalTitle}>Supprimer ce trajet GP ?</Text>
              <Text style={styles.modalSub}>
                Cette action supprimera définitivement l'annonce de transport.
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  disabled={isDeleting}
                  onPress={() => setDeleteGpId(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  disabled={isDeleting}
                  onPress={handleDeleteGp}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDeleteBtnText}>Oui, supprimer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topWrapper: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  headerCard: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },

  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },

  loadingWrapper: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    padding: 14,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },

  listContainer: {
    gap: 14,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cityCol: {
    alignItems: "flex-start",
  },
  cityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  countryName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  switchCol: {
    alignItems: "flex-end",
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 2,
  },
  switchActive: {
    color: "#1D6B45",
  },
  switchInactive: {
    color: "#94A3B8",
  },

  transporteurRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  transporteurText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },

  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricItemText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  metricItemLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  metricItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D6B45",
  },
  dividerVertical: {
    width: 1,
    height: 18,
    backgroundColor: "#CBD5E1",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* Modale Overlay General */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  deleteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalDeleteBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

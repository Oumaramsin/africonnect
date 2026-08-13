import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../../utils/storage";
import { GpListing } from "../../../utils/types/gp";

export default function GpBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<GpListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [weight_kg, setWeight_kg] = useState("");
  const [content_desc, setContent_desc] = useState("");
  const [declared_value, setDeclared_value] = useState("");
  const [notes, setNotes] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!id) return;
        const token = await getSecureToken("token");
        if (token) {
          setIsLoggedIn(true);
        }

        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/gp/${id}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          const data = await response.json();
          if (!response.ok) {
            setError(data.message || "Erreur lors du chargement du GP");
            setLoading(false);
            return;
          }
          setListing(data.data.gp);
        } catch (err) {
          setError("Erreur de connexion au serveur");
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [id])
  );

  const total = listing
    ? parseFloat(weight_kg || "0") * listing.price_per_kg
    : 0;

  const cleanWeightStr = weight_kg.trim().replace(",", ".");
  const cleanDeclaredStr = declared_value.trim().replace(",", ".");

  const weightNum = parseFloat(cleanWeightStr);
  const declaredValNum = parseFloat(cleanDeclaredStr);

  const isValidNumberFormat = (str: string) => /^\d+([.,]\d+)?$/.test(str);

  const isWeightInvalid =
    !weight_kg.trim() ||
    !isValidNumberFormat(weight_kg.trim()) ||
    isNaN(weightNum) ||
    weightNum <= 0 ||
    Boolean(listing && weightNum > listing.available_kg);

  const isDeclaredValInvalid =
    declared_value.trim() !== "" &&
    (!isValidNumberFormat(declared_value.trim()) ||
      isNaN(declaredValNum) ||
      declaredValNum < 0);

  const isSubmitDisabled =
    submitting ||
    isWeightInvalid ||
    !content_desc.trim() ||
    isDeclaredValInvalid;

  const handlePreSubmit = async () => {
    if (!weight_kg.trim() || !isValidNumberFormat(weight_kg.trim()) || isNaN(weightNum) || weightNum <= 0) {
      setError("Le poids doit être un nombre valide supérieur à 0 (ex: 2.5)");
      return;
    }

    if (listing && weightNum > listing.available_kg) {
      setError(`Le poids ne peut pas dépasser les ${listing.available_kg} kg disponibles.`);
      return;
    }

    if (!content_desc.trim()) {
      setError("La description du contenu est requise");
      return;
    }

    if (isDeclaredValInvalid) {
      setError(
        "La valeur déclarée doit être un nombre positif valide (ex: 100)",
      );
      return;
    }

    setShowConfirmModal(true);
    setError(null);
  };

  const confirmOrder = async () => {
    setSubmitting(true);
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      setSubmitting(false);
      return;
    }

    const safeDeclaredValue =
      declared_value.trim() !== "" && !isDeclaredValInvalid
        ? declaredValNum
        : 0;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/gp/${id}/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            weight_kg: weightNum,
            content_desc: content_desc,
            declared_value: safeDeclaredValue,
            total_amount: total,
            notes: notes || null,
            status: "pending",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || "Erreur lors de l'envoi de la commande");
        setSubmitting(false);
        return;
      }
      setListing((prev) =>
        prev
          ? {
              ...prev,
              available_kg: Math.max(0, Number(prev.available_kg) - weightNum),
            }
          : null,
      );
      setSuccess(true);
    } catch (err) {
      setError("Erreur lors de l'envoi de la commande");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Chargement de l'annonce GP...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.centeredState}>
            <Ionicons name="alert-circle-outline" size={48} color="#FFFFFF" />
            <Text style={styles.notFoundText}>Annonce GP introuvable</Text>
            <TouchableOpacity
              style={styles.backBtnCentered}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnCenteredText}>← Retour aux annonces</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const gpProfile = listing.profiles;

  // ÉCRAN DE SUCCÈS
  if (success) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={64} color="#1D6B45" />
            </View>

            <Text style={styles.successTitle}>Demande envoyée ! 🎉</Text>
            <Text style={styles.successSub}>
              {gpProfile?.full_name || "Le GP"} a reçu votre demande et va vous contacter rapidement pour confirmer la prise en charge.
            </Text>

            {/* Bouton WhatsApp direct */}
            {gpProfile?.whatsapp && (
              <TouchableOpacity
                style={styles.whatsappBtn}
                activeOpacity={0.85}
                onPress={() => {
                  // Action WhatsApp
                }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.whatsappBtnText}>Contacter le GP sur WhatsApp</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.ordersLinkBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/commandes")}
            >
              <Text style={styles.ordersLinkText}>Voir mes commandes →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backListBtn}
              activeOpacity={0.7}
              onPress={() => setSuccess(false)}
            >
              <Text style={styles.backListText}>Retour à l'annonce</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* 🟢 HEADER HAUT (IDENTIQUE APP WEB) */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.headerRouteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {listing.departure_city} → {listing.arrival_city}
              </Text>
              <View style={styles.headerDateRow}>
                <Ionicons name="airplane-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.headerDateText}>
                  Départ le {formatDate(listing.departure_date)}
                </Text>
              </View>
            </View>

            {Boolean(listing.flight_type) && (
              <View style={styles.flightBadgeHeader}>
                <Text style={styles.flightBadgeHeaderText}>
                  {listing.flight_type === "direct" ? "Direct" : "Escale"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="person-outline" size={16} color="#1D6B45" /> À propos du GP
            </Text>

            <View style={styles.gpProfileRow}>
              <View style={styles.gpAvatarCircle}>
                <Text style={styles.gpAvatarInitial}>
                  {gpProfile?.full_name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.gpNameText}>
                  {gpProfile?.full_name || "GP Anonyme"}
                </Text>
                {Boolean(gpProfile?.phone) && (
                  <Text style={styles.gpPhoneText}>Téléphone :  {gpProfile?.phone}</Text>
                )}
                {listing.review_count > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#FBBF24" />
                    <Text style={styles.ratingScore}>{listing.rating}</Text>
                    <Text style={styles.ratingReviews}>
                      ({listing.review_count} avis)
                    </Text>
                  </View>
                )}
              </View>

              {/* Bouton WhatsApp */}
              {Boolean(gpProfile?.whatsapp) && (
                <TouchableOpacity
                  style={styles.miniWhatsappBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  <Text style={styles.miniWhatsappBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="cube-outline" size={16} color="#1D6B45" /> Détails de l'annonce
            </Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Kg disponibles</Text>
                <Text style={styles.detailBoxValue}>{Number(listing.available_kg)}</Text>
                <Text style={styles.detailBoxUnit}>kg</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Prix au kg</Text>
                <Text style={styles.detailBoxValue}>{listing.price_per_kg}</Text>
                <Text style={styles.detailBoxUnit}>€/kg</Text>
              </View>
            </View>

            {/* Adresses et lieux de remise */}
            <View style={styles.infoRowGroup}>
              {Boolean(listing.pickup_city) && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#1D6B45" />
                  <Text style={styles.infoRowText}>
                    Remise des colis à <Text style={{ fontWeight: "700" }}>{listing.pickup_city}</Text>
                  </Text>
                </View>
              )}

              {Boolean(listing.pickup_address) && (
                <View style={styles.infoRow}>
                  <Ionicons name="home-outline" size={16} color="#1D6B45" />
                  <Text style={styles.infoRowText}>{listing.pickup_address}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            {Boolean(listing.description) && (
              <View style={styles.descBox}>
                <Text style={styles.descText}>{listing.description}</Text>
              </View>
            )}
          </View>

          {isLoggedIn ? (
            !showForm ? (
              <TouchableOpacity
                style={styles.openFormBtn}
                activeOpacity={0.85}
                onPress={() => setShowForm(true)}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.openFormBtnText}>Envoyer un colis avec ce GP</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sectionCard}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.cardSectionTitle}>Ma demande de transport</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Message d'erreur */}
                {Boolean(error) && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Champ 1: Poids du colis */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>POIDS DU COLIS (KG) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Max ${listing.available_kg} kg`}
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={weight_kg}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9.,]/g, "");
                      setWeight_kg(clean);
                    }}
                  />
                </View>

                {/* Champ 2: Description du contenu */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DESCRIPTION DU CONTENU *</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Ex: Vêtements, chaussures, médicaments..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    value={content_desc}
                    onChangeText={setContent_desc}
                  />
                </View>

                {/* Champ 3: Valeur déclarée */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>VALEUR DÉCLARÉE (€)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 100"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={declared_value}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9.,]/g, "");
                      setDeclared_value(clean);
                    }}
                  />
                </View>

                {/* Champ 4: Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NOTES ET INSTRUCTIONS</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Instructions particulières, colis fragile..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                {/* TOTAL ESTIMÉ */}
                <View style={styles.totalEstimatedCard}>
                  <Text style={styles.totalEstimatedLabel}>Total estimé</Text>
                  <Text style={styles.totalEstimatedValue}>
                    {total.toFixed(2)} €
                  </Text>
                </View>

                {/* Bouton de Soumission */}
                <TouchableOpacity
                  style={[
                    styles.submitOrderBtn,
                    isSubmitDisabled && styles.submitOrderBtnDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={isSubmitDisabled}
                  onPress={handlePreSubmit}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.submitOrderBtnText}>
                    {submitting ? "Envoi..." : "Envoyer ma demande"}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <TouchableOpacity
              style={styles.loginRequiredCard}
              activeOpacity={0.85}
              onPress={() => router.push("/login")}
            >
              <View style={styles.loginLockCircle}>
                <Ionicons name="lock-closed" size={24} color="#1D6B45" />
              </View>
              <Text style={styles.loginRequiredTitle}>
                Se connecter pour envoyer un colis
              </Text>
              <Text style={styles.loginRequiredSub}>
                Connectez-vous pour passer votre demande en toute sécurité.
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* POP-UP (MODALE) DE CONFIRMATION DE LA DEMANDE */}
        <Modal
          transparent
          animationType="fade"
          visible={showConfirmModal}
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="cube-outline" size={28} color="#1D6B45" />
              </View>

              <Text style={styles.modalTitle}>Confirmer l'envoi</Text>
              <Text style={styles.modalSub}>
                Êtes-vous sûr(e) de vouloir envoyer cette demande pour{" "}
                <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                  {weight_kg || "0"} kg
                </Text>{" "}
                d'un montant estimé à{" "}
                <Text style={{ fontWeight: "800", color: "#1D6B45" }}>
                  {total.toFixed(2)} €
                </Text>{" "}
                ?
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => {
                    setShowConfirmModal(false);
                    confirmOrder();
                  }}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Oui, envoyer</Text>
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
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#165034",
  },
  container: {
    flex: 1,
    backgroundColor: "#165034",
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "600",
    fontSize: 14,
  },
  notFoundText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "700",
    fontSize: 16,
  },
  backBtnCentered: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
  },
  backBtnCenteredText: {
    color: "#A7F3D0",
    fontWeight: "700",
    fontSize: 13,
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#165034",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  headerDateText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  flightBadgeHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  flightBadgeHeaderText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* ScrollView Principale */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  /* Cards Générales */
  sectionCard: {
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
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  /* Profil GP */
  gpProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gpAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },
  gpAvatarInitial: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D6B45",
  },
  gpNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  gpPhoneText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingReviews: {
    fontSize: 11,
    color: "#64748B",
  },
  miniWhatsappBtn: {
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniWhatsappBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Détails Annonce Grid */
  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  detailBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailBoxLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  detailBoxValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D6B45",
  },
  detailBoxUnit: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  infoRowGroup: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoRowText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },
  descBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  descText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },

  /* Formulaire */
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  openFormBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  openFormBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  totalEstimatedCard: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  totalEstimatedLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D6B45",
  },
  totalEstimatedValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D6B45",
  },
  submitOrderBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  submitOrderBtnDisabled: {
    opacity: 0.5,
  },
  submitOrderBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Non Connecté Card */
  loginRequiredCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(29, 107, 69, 0.3)",
    padding: 24,
    alignItems: "center",
  },
  loginLockCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  loginRequiredTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D6B45",
    marginBottom: 4,
  },
  loginRequiredSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },

  /* Modal de Confirmation */
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
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
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
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#1D6B45",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Messages d'erreur */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },

  /* Écran de Succès */
  successContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D6B45",
    marginBottom: 8,
    textAlign: "center",
  },
  successSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 28,
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  whatsappBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  ordersLinkBtn: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  ordersLinkText: {
    color: "#1D6B45",
    fontSize: 14,
    fontWeight: "700",
  },
  backListBtn: {
    paddingVertical: 10,
  },
  backListText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});

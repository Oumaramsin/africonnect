import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CartItem } from "../../utils/types/traiteur";
import { deleteSecureToken, getSecureToken } from "../../utils/storage";
import { apiFetch } from "../../utils/api";
import AddressAutocomplete from "../../components/AddressAutocomplete";

let DateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch (e) {
    DateTimePicker = null;
  }
}

export default function CommanderScreen() {
  const router = useRouter();

  // États locaux
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Calendrier & Horloge
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 30, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Synchronisation automatique de la date et heure formatées
  useEffect(() => {
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    const hh = String(selectedDate.getHours()).padStart(2, "0");
    const min = String(selectedDate.getMinutes()).padStart(2, "0");

    setDeliveryDate(`${yyyy}-${mm}-${dd}`);
    setDeliveryTime(`${hh}:${min}`);
  }, [selectedDate]);

  const handleSelectDeliveryType = (type: "delivery" | "pickup") => {
    setDeliveryType(type);
    if (type === "pickup") {
      setDeliveryAddress(""); // Réinitialisation propre si retrait
    }
  };

  const isDateTimeInPast = useMemo(() => {
    if (!deliveryDate || !deliveryTime) return false;
    const [y, m, d] = deliveryDate.split("-").map(Number);
    const [hh, mm] = deliveryTime.split(":").map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return false;
    const scheduled = new Date(y, m - 1, d, hh, mm, 0);
    return scheduled.getTime() < Date.now();
  }, [deliveryDate, deliveryTime]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      const updated = new Date(selectedDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(updated);
      if (updated.getTime() < Date.now()) {
        setError("L'heure de livraison ne peut pas être antérieure à l'heure actuelle.");
      } else if (error === "L'heure de livraison ne peut pas être antérieure à l'heure actuelle.") {
        setError(null);
      }
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (time) {
      const updated = new Date(selectedDate);
      updated.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(updated);
      if (updated.getTime() < Date.now()) {
        setError("L'heure de livraison ne peut pas être antérieure à l'heure actuelle.");
      } else if (error === "L'heure de livraison ne peut pas être antérieure à l'heure actuelle.") {
        setError(null);
      }
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.dish.price * item.quantity,
    0,
  );

  const isFormValid =
    deliveryDate.trim() !== "" &&
    deliveryTime.trim() !== "" &&
    !isDateTimeInPast &&
    (deliveryType === "pickup" ||
      (deliveryType === "delivery" && deliveryAddress.trim() !== ""));

  useEffect(() => {
    const load = async () => {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/accueil");
        return;
      }
      const carts = await getSecureToken("dabari_cart");
      if (!carts) {
        router.push("/accueil");
        return;
      }
      setIsLoggedIn(true);
      const data = JSON.parse(carts);
      setCart(data);
    };
    load();
  }, []);

  const handlePreSubmit = () => {
    if (deliveryType === "delivery" && !deliveryAddress.trim()) {
      setError("Veuillez renseigner votre adresse de livraison.");
      return;
    }
    if (!deliveryDate.trim()) {
      setError("Veuillez renseigner la date souhaitée (ex: 2026-08-15).");
      return;
    }
    if (!deliveryTime.trim()) {
      setError("Veuillez renseigner l'heure souhaitée (ex: 12:30).");
      return;
    }

    const [y, m, d] = deliveryDate.split("-").map(Number);
    const [hh, mm] = deliveryTime.split(":").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm)) {
      const scheduled = new Date(y, m - 1, d, hh, mm, 0);
      if (scheduled.getTime() < Date.now()) {
        setError("L'heure de livraison ne peut pas être antérieure à l'heure actuelle.");
        return;
      }
    }

    setError(null);
    setShowConfirmModal(true);
  };

  const onSubmit = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const [y, m, d] = deliveryDate.split("-").map(Number);
      const [hh, mm] = deliveryTime.split(":").map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm)) {
        const scheduled = new Date(y, m - 1, d, hh, mm, 0);
        if (scheduled.getTime() < Date.now()) {
          setError("L'heure de livraison ne peut pas être antérieure à l'heure actuelle.");
          setLoading(false);
          return;
        }
      }
      const formattedDate = deliveryTime.includes(":")
        ? `${deliveryDate}T${deliveryTime}:00`
        : `${deliveryDate}T12:00:00`;

      const response = await apiFetch("/traiteur/order", {
        method: "POST",
        body: JSON.stringify({
          traiteur_id: cart[0].traiteur_id,
          delivery_address: deliveryAddress || "Retrait sur place",
          delivery_date: formattedDate,
          delivery_type: deliveryType,
          notes: notes,
          items: cart.map((item) => ({
            dish_id: item.dish.id,
            quantity: item.quantity,
            unit_price: Number(item.dish.price),
          })),
        }),
      });
      const dataR = await response.json();
      if (!response.ok) {
        setError(dataR.message || "Erreur dans la commande du panier");
        setLoading(false);
        return;
      }

      await deleteSecureToken("dabari_cart");
      setSuccess(true);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("Erreur commande:", err);
      setError(err?.message || "Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#1D6B45", fontWeight: "700" }}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={72} color="#1D6B45" />
          </View>
          <Text style={styles.successTitle}>Commande confirmée !</Text>
          <Text style={styles.successDesc}>
            Le traiteur a bien reçu votre commande et va la préparer très
            rapidement.
          </Text>

          <TouchableOpacity
            style={styles.successHomeBtn}
            onPress={() => router.replace("/accueil")}
          >
            <Text style={styles.successHomeBtnText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#165034" />

        {/* Top Header Card (Gradient Vert) */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Ma commande</Text>
          <Text style={styles.headerSubtitle}>
            {cart[0]?.traiteur_name
              ? `Chez ${cart[0].traiteur_name}`
              : "Commande Traiteur"}
          </Text>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Récapitulatif du Panier */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>
              Récapitulatif · {totalItems} article{totalItems > 1 ? "s" : ""}
            </Text>

            <View style={styles.cartItemsList}>
              {cart.map((item) => (
                <View key={item.dish.id} style={styles.cartItemRow}>
                  <View style={styles.cartItemLeft}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{item.quantity}</Text>
                    </View>
                    <Text style={styles.cartItemName}>{item.dish.name}</Text>
                  </View>
                  <Text style={styles.cartItemPrice}>
                    {(item.dish.price * item.quantity).toFixed(2)} €
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>{totalPrice.toFixed(2)} €</Text>
            </View>
          </View>

          {/* 2. Mode de Réception */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Mode de réception</Text>

            <View style={styles.deliveryTypeGrid}>
              <TouchableOpacity
                style={[
                  styles.deliveryOptionCard,
                  deliveryType === "delivery" && styles.deliveryOptionActive,
                ]}
                onPress={() => handleSelectDeliveryType("delivery")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="car-outline"
                  size={26}
                  color={deliveryType === "delivery" ? "#1D6B45" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.deliveryOptionText,
                    deliveryType === "delivery" &&
                      styles.deliveryOptionTextActive,
                  ]}
                >
                  Livraison
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deliveryOptionCard,
                  deliveryType === "pickup" && styles.deliveryOptionActive,
                ]}
                onPress={() => handleSelectDeliveryType("pickup")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="home-outline"
                  size={26}
                  color={deliveryType === "pickup" ? "#1D6B45" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.deliveryOptionText,
                    deliveryType === "pickup" &&
                      styles.deliveryOptionTextActive,
                  ]}
                >
                  Retrait sur place
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Adresse de Livraison (Si Livraison) */}
          {deliveryType === "delivery" && (
            <View style={[styles.sectionCard, { zIndex: 50 }]}>
              <Text style={styles.cardTitle}>Adresse de livraison</Text>
              <AddressAutocomplete
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                onSelectAddress={(item) => setDeliveryAddress(item.label)}
                placeholder="12 rue de la Paix, 75001 Paris..."
              />
            </View>
          )}

          {/* 4. Date et Heure souhaitées (Calendrier & Horloge) */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Date et heure souhaitées</Text>

            <View style={styles.dateTimeGrid}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Date</Text>
                {Platform.OS === "web" ? (
                  <TextInput
                    style={styles.textInput}
                    placeholder="AAAA-MM-JJ"
                    placeholderTextColor="#9CA3AF"
                    value={deliveryDate}
                    onChangeText={(val) => {
                      setDeliveryDate(val);
                      if (val && val.length === 10) {
                        const [y, m, d] = val.split("-").map(Number);
                        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                          const updated = new Date(selectedDate);
                          updated.setFullYear(y, m - 1, d);
                          setSelectedDate(updated);
                        }
                      }
                    }}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#1D6B45"
                    />
                    <Text style={styles.pickerBtnText}>
                      {selectedDate.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Heure</Text>
                {Platform.OS === "web" ? (
                  <TextInput
                    style={styles.textInput}
                    placeholder="12:30"
                    placeholderTextColor="#9CA3AF"
                    value={deliveryTime}
                    onChangeText={(val) => {
                      setDeliveryTime(val);
                      if (val && val.includes(":")) {
                        const [h, m] = val.split(":").map(Number);
                        if (!isNaN(h) && !isNaN(m)) {
                          const updated = new Date(selectedDate);
                          updated.setHours(h, m);
                          setSelectedDate(updated);
                        }
                      }
                    }}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={18} color="#1D6B45" />
                    <Text style={styles.pickerBtnText}>
                      {selectedDate.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* 5. Notes pour le traiteur */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.cardTitle}>Notes pour le traiteur</Text>
              <Text style={styles.optionalTag}> (optionnel)</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Allergies, préférences, instructions particulières..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Alert Error Box (si une erreur survient ou champ manquant) */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Bouton de Confirmation de la Commande */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!isFormValid || loading) && styles.submitBtnDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handlePreSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "Envoi de la commande..." : "Confirmer la commande"}
            </Text>
            <Text style={styles.submitBtnPrice}>{totalPrice.toFixed(2)} €</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Pop-up (Modale) de confirmation */}
        {showConfirmModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmer la commande</Text>
              <Text style={styles.modalDesc}>
                Êtes-vous sûr(e) de vouloir confirmer cette commande d'un
                montant total de{" "}
                <Text style={styles.modalPriceHighlight}>
                  {totalPrice.toFixed(2)} €
                </Text>{" "}
                ?
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={loading}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => {
                    setShowConfirmModal(false);
                    onSubmit();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.modalConfirmText}>
                    {loading ? "En cours..." : "Oui, confirmer"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* DatePicker Modale iOS / Native Android */}
        {Platform.OS === "ios" && DateTimePicker && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalCard}>
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>Date de livraison</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalConfirmText}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onValueChange={handleDateChange}
                  onDismiss={() => setShowDatePicker(false)}
                  textColor="#0F172A"
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === "ios" && DateTimePicker && (
          <Modal
            visible={showTimePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalCard}>
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.dateModalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>Heure de livraison</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.dateModalConfirmText}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="spinner"
                  onValueChange={handleTimeChange}
                  onDismiss={() => setShowTimePicker(false)}
                  textColor="#0F172A"
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === "android" && DateTimePicker && showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onValueChange={handleDateChange}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        {Platform.OS === "android" && DateTimePicker && showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="default"
            onValueChange={handleTimeChange}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}
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
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  optionalTag: {
    fontSize: 13,
    fontWeight: "400",
    color: "#9CA3AF",
    marginBottom: 12,
  },

  /* Cart List */
  cartItemsList: {
    gap: 10,
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  qtyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBadgeText: {
    color: "#1D6B45",
    fontSize: 12,
    fontWeight: "800",
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1D6B45",
  },

  /* Reception Mode Grid */
  deliveryTypeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  deliveryOptionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  deliveryOptionActive: {
    borderColor: "#1D6B45",
    backgroundColor: "#E8F5E9",
  },
  deliveryOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  deliveryOptionTextActive: {
    color: "#1D6B45",
  },

  /* Inputs */
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  pickerBtn: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: "top",
  },
  dateTimeGrid: {
    flexDirection: "row",
    gap: 12,
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  submitBtnPrice: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },

  /* Error Box */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  /* Modal Overlay */
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
    marginBottom: 20,
  },
  modalPriceHighlight: {
    fontWeight: "800",
    color: "#1D6B45",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  modalCancelText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#1D6B45",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Success Screen */
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
  successDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  successHomeBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  successHomeBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ── Date & Time Modals ── */
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  dateModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dateModalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  dateModalConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D6B45",
  },
});

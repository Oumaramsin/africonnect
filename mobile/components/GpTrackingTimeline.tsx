import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatWhatsAppUrl } from "../utils/types/traiteur";

export type GpTrackingStatus =
  | "pending"
  | "en_attente"
  | "accepted"
  | "acceptee"
  | "colis_recu"
  | "en_acheminement"
  | "arrive"
  | "livre"
  | "rejected"
  | "refusee"
  | "cancelled"
  | "annulee";

export interface GpTrackingStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export const GP_TRACKING_STEPS: GpTrackingStep[] = [
  {
    key: "accepted",
    label: "Demande acceptée · Dépôt à venir",
    shortLabel: "Acceptée",
    description: "Le transporteur GP a validé la demande. Le colis doit être déposé au point convenu.",
    iconName: "checkmark-circle",
  },
  {
    key: "colis_recu",
    label: "Colis réceptionné & vérifié",
    shortLabel: "Réceptionné",
    description: "Le GP a pris possession du colis et l'a vérifié avant le voyage.",
    iconName: "cube",
  },
  {
    key: "en_acheminement",
    label: "En cours d'acheminement",
    shortLabel: "En vol / Transit",
    description: "Le colis est en transit aérien vers le pays de destination.",
    iconName: "airplane",
  },
  {
    key: "arrive",
    label: "Arrivé à destination",
    shortLabel: "Arrivé",
    description: "Le transporteur est arrivé. Le colis est prêt pour la remise ou le retrait.",
    iconName: "location",
  },
  {
    key: "livre",
    label: "Colis livré & récupéré",
    shortLabel: "Livré",
    description: "Le colis a été remis en mains propres au destinataire final.",
    iconName: "checkmark-done-circle",
  },
];

export function getGpStepIndex(status: string): number {
  switch (status) {
    case "pending":
    case "en_attente":
      return 0;
    case "accepted":
    case "acceptee":
      return 1;
    case "colis_recu":
      return 2;
    case "en_acheminement":
      return 3;
    case "arrive":
      return 4;
    case "livre":
      return 5;
    case "rejected":
    case "refusee":
    case "cancelled":
    case "annulee":
      return -1;
    default:
      return 1;
  }
}

export function getGpStatusLabel(status: string): string {
  switch (status) {
    case "pending":
    case "en_attente":
      return "En attente de validation";
    case "accepted":
    case "acceptee":
      return "Acceptée · En attente de dépôt";
    case "colis_recu":
      return "Colis réceptionné par le GP";
    case "en_acheminement":
      return "En cours d'acheminement";
    case "arrive":
      return "Arrivé à destination";
    case "livre":
      return "Livré & récupéré";
    case "rejected":
    case "refusee":
      return "Demande refusée";
    case "cancelled":
    case "annulee":
      return "Demande annulée";
    default:
      return status;
  }
}

export function getNextGpStatus(currentStatus: string): {
  nextStatus: string;
  nextLabel: string;
  buttonLabel: string;
} | null {
  switch (currentStatus) {
    case "accepted":
    case "acceptee":
      return {
        nextStatus: "colis_recu",
        nextLabel: "Colis réceptionné & vérifié",
        buttonLabel: "Marquer Colis Réceptionné",
      };
    case "colis_recu":
      return {
        nextStatus: "en_acheminement",
        nextLabel: "En cours d'acheminement",
        buttonLabel: "Marquer En Vol / Transit",
      };
    case "en_acheminement":
      return {
        nextStatus: "arrive",
        nextLabel: "Arrivé à destination",
        buttonLabel: "Marquer Arrivé à destination",
      };
    case "arrive":
      return {
        nextStatus: "livre",
        nextLabel: "Colis livré & remis au destinataire",
        buttonLabel: "Confirmer la remise / livraison",
      };
    default:
      return null;
  }
}

interface GpTrackingTimelineProps {
  status: string;
  departureCity?: string | null;
  departureCountry?: string | null;
  arrivalCity?: string | null;
  arrivalCountry?: string | null;
  departureDate?: string | null;
  arrivalDate?: string | null;
  pickupAddress?: string | null;
  pickupCity?: string | null;
  dropoffAddress?: string | null;
  dropoffCity?: string | null;
  weightKg?: number | string | null;
  contentDesc?: string | null;
  totalAmount?: number | string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  isDelayed?: boolean | null;
  delayReason?: string | null;
  isGpMode?: boolean;
  onUpdateStatus?: (newStatus: string) => void;
  onSignalDelay?: () => void;
  updatingStatus?: boolean;
}

export default function GpTrackingTimeline({
  status,
  departureCity,
  arrivalCity,
  departureDate,
  arrivalDate,
  pickupAddress,
  pickupCity,
  dropoffAddress,
  dropoffCity,
  contactName,
  contactPhone,
  isDelayed = false,
  delayReason,
  isGpMode = false,
  onUpdateStatus,
  onSignalDelay,
  updatingStatus = false,
}: GpTrackingTimelineProps) {
  const currentStepIndex = getGpStepIndex(status);
  const nextAction = getNextGpStatus(status);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenWhatsApp = () => {
    const url = formatWhatsAppUrl(
      contactPhone,
      `Bonjour ${contactName || ""}, je vous contacte concernant le transport de colis GP (${departureCity || ""} ➔ ${arrivalCity || ""}) sur Dabari.`
    );
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        "WhatsApp non disponible",
        "Le numéro de téléphone du contact n'est pas renseigné ou est invalide."
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* ── BANNIÈRE RETARD DE VOL ── */}
      {isDelayed && (
        <View style={styles.delayBanner}>
          <View style={styles.delayBannerHeader}>
            <View style={styles.delayIconCircle}>
              <Ionicons name="warning" size={16} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.delayTitle}>Vol retardé par le transporteur</Text>
              <Text style={styles.delaySubtitle}>
                Nouvelle arrivée estimée :{" "}
                <Text style={styles.delayDateHighlight}>
                  {arrivalDate ? formatDate(arrivalDate) : "À confirmer"}
                </Text>
              </Text>
            </View>
          </View>
          {Boolean(delayReason) && (
            <View style={styles.delayReasonBox}>
              <Text style={styles.delayReasonText}>
                <Text style={{ fontWeight: "700" }}>Motif : </Text>
                {delayReason}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── STEPPER VISUEL HORIZONTAL ── */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperHeader}>
          <View style={styles.stepperTitleRow}>
            <Ionicons name="git-commit-outline" size={16} color="#1D6B45" />
            <Text style={styles.stepperTitle}>Suivi d&apos;acheminement</Text>
          </View>
          <View style={styles.currentStatusPill}>
            <Text style={styles.currentStatusText}>{getGpStatusLabel(status)}</Text>
          </View>
        </View>

        {/* Ligne des étapes */}
        <View style={styles.stepsRow}>
          {GP_TRACKING_STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStepIndex > stepNum;
            const isCurrent = currentStepIndex === stepNum;
            const isPending = currentStepIndex < stepNum;

            return (
              <React.Fragment key={step.key}>
                {/* Point d'étape */}
                <View style={styles.stepItemCol}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isCurrent && styles.stepCircleCurrent,
                      isPending && styles.stepCirclePending,
                    ]}
                  >
                    <Ionicons
                      name={
                        isCompleted
                          ? "checkmark"
                          : step.iconName
                      }
                      size={14}
                      color={
                        isCompleted
                          ? "#FFFFFF"
                          : isCurrent
                          ? "#1D6B45"
                          : "#94A3B8"
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.stepLabelText,
                      isCurrent && styles.stepLabelCurrent,
                      isCompleted && styles.stepLabelCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {step.shortLabel}
                  </Text>
                </View>

                {/* Trait de liaison (entre chaque étape) */}
                {idx < GP_TRACKING_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepConnectorLine,
                      currentStepIndex > stepNum
                        ? styles.connectorLineCompleted
                        : styles.connectorLinePending,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Détail de l'étape courante */}
        {currentStepIndex >= 1 && currentStepIndex <= GP_TRACKING_STEPS.length && (
          <View style={styles.currentStepDescBox}>
            <Ionicons name="information-circle-outline" size={14} color="#1D6B45" />
            <Text style={styles.currentStepDescText}>
              {GP_TRACKING_STEPS[currentStepIndex - 1]?.description}
            </Text>
          </View>
        )}
      </View>

      {/* ── POINTS DE DÉPÔT ET DE RETRAIT ── */}
      <View style={styles.locationsBox}>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: "#1D6B45" }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>
              Dépôt : {pickupCity || departureCity || "Ville de départ"}
              {departureDate ? ` (${formatDate(departureDate)})` : ""}
            </Text>
            {Boolean(pickupAddress) && (
              <Text style={styles.locationSub}>{pickupAddress}</Text>
            )}
          </View>
        </View>

        <View style={styles.locationDivider} />

        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: "#D4870A" }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>
              Retrait : {dropoffCity || arrivalCity || "Ville d'arrivée"}
              {arrivalDate ? ` (Est. ${formatDate(arrivalDate)})` : ""}
            </Text>
            {Boolean(dropoffAddress) && (
              <Text style={styles.locationSub}>{dropoffAddress}</Text>
            )}
          </View>
        </View>
      </View>

      {/* ── ACTIONS DU TRANSPORTEUR (MODE GP PRO) ── */}
      {isGpMode && (
        <View style={styles.gpActionsBox}>
          {nextAction && onUpdateStatus && (
            <TouchableOpacity
              style={styles.advanceStatusBtn}
              activeOpacity={0.85}
              disabled={updatingStatus}
              onPress={() => onUpdateStatus(nextAction.nextStatus)}
            >
              <Ionicons
                name="arrow-forward-circle"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.advanceStatusBtnText}>
                {updatingStatus ? "Mise à jour..." : nextAction.buttonLabel}
              </Text>
            </TouchableOpacity>
          )}

          {onSignalDelay && (
            <TouchableOpacity
              style={styles.signalDelayBtn}
              activeOpacity={0.85}
              onPress={onSignalDelay}
            >
              <Ionicons name="time-outline" size={16} color="#B45309" />
              <Text style={styles.signalDelayBtnText}>
                {isDelayed ? "Modifier le retard" : "Signaler un retard"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── CONTACT WHATSAPP EXPÉDITEUR / GP ── */}
      {Boolean(contactPhone) && (
        <TouchableOpacity
          style={styles.whatsappButton}
          activeOpacity={0.85}
          onPress={handleOpenWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
          <Text style={styles.whatsappButtonText}>
            {isGpMode
              ? `Contacter l'expéditeur (${contactName || "Client"})`
              : `Contacter le transporteur (${contactName || "GP"})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 10,
    gap: 10,
  },

  /* Bannière Retard */
  delayBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  delayBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  delayIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  delayTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  delaySubtitle: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  delayDateHighlight: {
    fontWeight: "800",
    color: "#78350F",
  },
  delayReasonBox: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  delayReasonText: {
    fontSize: 11,
    color: "#78350F",
    lineHeight: 15,
  },

  /* Stepper */
  stepperContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 10,
  },
  stepperHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepperTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stepperTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  currentStatusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  currentStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  stepItemCol: {
    alignItems: "center",
    width: 52,
  },
  stepIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: "#1D6B45",
  },
  stepCircleCurrent: {
    backgroundColor: "#DCFCE7",
    borderWidth: 2,
    borderColor: "#1D6B45",
  },
  stepCirclePending: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepConnectorLine: {
    flex: 1,
    height: 2,
    marginBottom: 18,
  },
  connectorLineCompleted: {
    backgroundColor: "#1D6B45",
  },
  connectorLinePending: {
    backgroundColor: "#E2E8F0",
  },
  stepLabelText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
  },
  stepLabelCurrent: {
    color: "#1D6B45",
    fontWeight: "800",
  },
  stepLabelCompleted: {
    color: "#0F172A",
    fontWeight: "700",
  },
  currentStepDescBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  currentStepDescText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    lineHeight: 15,
  },

  /* Lieux Dépôt / Retrait */
  locationsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 10,
    gap: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  locationSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  locationDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 16,
  },

  /* Actions GP Pro */
  gpActionsBox: {
    gap: 6,
  },
  advanceStatusBtn: {
    backgroundColor: "#1D6B45",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  advanceStatusBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  signalDelayBtn: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signalDelayBtnText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
  },

  /* WhatsApp */
  whatsappButton: {
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

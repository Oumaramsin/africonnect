import { Alert, Platform } from "react-native";

export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
) => {
  if (Platform.OS === "web") {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel", onPress: onCancel },
      {
        text: "Oui, confirmer",
        style: "default",
        onPress: onConfirm,
      },
    ]);
  }
};

export const showSuccessAlert = (
  title: string,
  message: string,
  onDismiss?: () => void,
) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onDismiss) onDismiss();
  } else {
    Alert.alert(title, message, [
      {
        text: "OK",
        onPress: onDismiss,
      },
    ]);
  }
};

export const showErrorAlert = (
  title: string,
  message: string,
  onDismiss?: () => void,
) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onDismiss) onDismiss();
  } else {
    Alert.alert(title, message, [
      {
        text: "OK",
        onPress: onDismiss,
      },
    ]);
  }
};

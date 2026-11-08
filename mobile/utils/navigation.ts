import { router } from "expo-router";

type Href = Parameters<typeof router.replace>[0];

/**
 * Retour à l'écran précédent ; si l'écran a été ouvert directement (lien, notification, rechargement
 * sur le web), il n'y a pas d'écran précédent : `fallback` le remplace.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

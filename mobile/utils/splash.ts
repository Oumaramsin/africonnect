import * as SplashScreen from "expo-splash-screen";

// L'écran de démarrage (logo) reste affiché jusqu'à ce que l'accueil sache où envoyer l'utilisateur
// (connecté ou non) : pas de passage par un écran de chargement intermédiaire.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Masque l'écran de démarrage (sans effet s'il l'est déjà). */
export function hideSplash(): void {
  SplashScreen.hideAsync().catch(() => {});
}

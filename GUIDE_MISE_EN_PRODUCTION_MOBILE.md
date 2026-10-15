# 📱 Guide Complet de A à Z : Mise en Production de l'Application Mobile Dabari

Ce guide détaille **l'intégralité du processus de A à Z** pour compiler, tester, signer et publier l'application mobile **Dabari** sur le **Google Play Store (Android)** et l'**Apple App Store (iOS)** à l'aide d'**Expo Application Services (EAS)**.

---

## 📑 Sommaire
1. [Architecture & Flux de Données](#1-architecture--flux-de-données)
2. [Prérequis & Comptes Développeurs](#2-prérequis--comptes-développeurs)
3. [Étape 1 : Connexion et Liaison Expo EAS](#3-étape-1--connexion-et-liaison-expo-eas)
4. [Étape 2 : Build de Test Direct (APK Android immédiat)](#4-étape-2--build-de-test-direct-apk-android-immédiat)
5. [Étape 3 : Préparation des Assets Graphiques & Visuels](#5-étape-3--préparation-des-assets-graphiques--visuels)
6. [Étape 4 : Compilation des Binaires de Production](#6-étape-4--compilation-des-binaires-de-production)
7. [Étape 5 : Déploiement sur le Google Play Store](#7-étape-5--déploiement-sur-le-google-play-store)
8. [Étape 6 : Déploiement sur l'Apple App Store](#8-étape-6--déploiement-sur-lapple-app-store)
9. [Étape 7 : Mises à Jour Futures (OTA & Nouvelles Versions)](#9-étape-7--mises-à-jour-futures-ota--nouvelles-versions)
10. [Checklist Récapitulative Avant Lancement](#10-checklist-récapitulative-avant-lancement)

---

## 1. Architecture & Flux de Données

L'application mobile Dabari est développée avec **React Native**, **Expo (SDK 52+)** et **Expo Router**.

```
[ 📱 Smartphone Utilisateur ]
           │
           │  (Requêtes HTTPS REST / Token JWT sécurisé)
           ▼
[ ☁️ API Backend Railway : https://dabari-api.up.railway.app/api ]
           │
           ├─► [ 🐘 Base de données PostgreSQL Railway ]
           ├─► [ ✉️ Emails Transactionnels Resend / OVH ]
           └─► [ ☁️ Médias et Photos Cloudflare R2 ]
```

> **Règle de sécurité fondamentale** : L'application mobile ne se connecte **jamais** directement à la base de données PostgreSQL. Toutes les requêtes transitent exclusivement par l'API sécurisée `https://dabari-api.up.railway.app/api`. Le fichier `mobile/.env` ne contient que cette URL d'API.

---

## 2. Prérequis & Comptes Développeurs

Pour publier publiquement sur les stores, vous devez disposer des comptes suivants :

### A. Compte Expo (Gratuit)
- Rendez-vous sur [expo.dev/signup](https://expo.dev/signup) et créez un compte gratuit.
- Ce compte hébergera vos builds dans le cloud (inutile d'avoir un Mac pour compiler iOS).

### B. Compte Google Play Developer (Android)
- **Frais** : 25 $ US (paiement unique à vie).
- **Lien** : [play.google.com/console/signup](https://play.google.com/console/signup)
- **Vérification d'identité** : Pièce d'identité ou documents de société.
- **Règle Google 2023+ (Comptes Personnels)** : Si votre compte Google Play est un compte personnel créé après novembre 2023, Google impose **14 jours consécutifs de test fermé avec 20 testeurs** avant d'ouvrir l'accès à la production publique. *(Si vous enregistrez un compte Organisation/Entreprise avec numéro D-U-N-S, cette contrainte de 14 jours ne s'applique pas).*

### C. Compte Apple Developer Program (iOS)
- **Frais** : 99 $ US / an.
- **Lien** : [developer.apple.com/programs](https://developer.apple.com/programs/)
- **Équipement** : **Pas besoin d'ordinateur Mac**. Les serveurs cloud d'Expo (EAS Build) compilent l'application sur des machines virtuelles macOS distantes pour vous.

---

## 3. Étape 1 : Connexion et Liaison Expo EAS

Ouvrez un terminal dans le dossier `mobile` de votre projet :

```powershell
cd c:\Users\Mirac\Desktop\stage\africonnect\mobile
```

### 1. Se connecter à votre compte Expo
```bash
npx eas login
```
*Saisissez votre nom d'utilisateur et mot de passe Expo créés sur expo.dev.*

### 2. Initialiser le projet EAS
```bash
npx eas project:init
```
*Cette commande va créer le projet sur votre tableau de bord Expo et ajouter automatiquement l'identifiant unique `projectId` dans `app.json`.*

### 3. Vérifier le fichier `mobile/app.json`
Assurez-vous que les identifiants de bundle correspondent bien à votre marque :
```json
{
  "expo": {
    "name": "Dabari",
    "slug": "dabari",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.dabari.app"
    },
    "android": {
      "package": "com.dabari.app"
    }
  }
}
```

---

## 4. Étape 2 : Build de Test Direct (APK Android immédiat)

Avant de publier sur les stores officiels, il est fortement conseillé de générer un **fichier APK exécutable** pour tester l'application directement sur un vrai téléphone Android.

### 1. Lancer la compilation de l'APK
Dans le dossier `mobile`, lancez :
```bash
npx eas build --profile preview --platform android
```

### 2. Déroulement du build
1. Le terminal compresse votre code et l'envoie sur les serveurs sécurisés d'Expo.
2. Expo génère automatiquement la clé de signature Android (Keystore) sans que vous ayez à manipuler de certificats complexes.
3. Après environ 5 à 10 minutes, le terminal affiche :
   - Un **lien de téléchargement direct** vers le fichier `.apk`.
   - Un **QR code** à scanner directement avec l'appareil photo de votre smartphone Android pour installer l'application immédiatement.

### 3. Validation sur téléphone
- Testez la connexion et l'inscription (email et téléphone).
- Testez la navigation (Traiteurs, Devis, Plats, Annonces GP).
- Vérifiez la réception des emails transactionnels et la mise à jour des badges de commande.

---

## 5. Étape 3 : Préparation des Assets Graphiques & Visuels

Les stores refusent les applications si les visuels ne respectent pas scrupuleusement leurs gabarits.

### Tableau des Assets Requis :

| Store | Asset | Dimensions exactes | Format | Rôle |
|---|---|---|---|---|
| **Google Play** | Icône de l'application | **512 x 512 px** | PNG 32-bit (sans transparence) | Icône affichée sur le store |
| **Google Play** | Graphique de fonctionnalité | **1024 x 500 px** | JPEG ou PNG 24-bit | Bannière en tête de votre fiche Play Store |
| **Google Play** | Captures d'écran | Min 2 (ex: **1080 x 1920 px**) | PNG ou JPEG | Montrant les fonctionnalités clés |
| **App Store** | Icône de l'application | **1024 x 1024 px** | PNG carré (sans transparence) | Icône App Store |
| **App Store** | Captures iPhone 6.7" | **1290 x 2796 px** | PNG ou JPEG | Écrans iPhone récents (14 Pro Max, 15 Plus/Pro Max) |
| **App Store** | Captures iPhone 6.5" / 5.5" | **1242 x 2688 px** ou **1242 x 2208 px** | PNG ou JPEG | Écrans iPhone avec encoche / bouton |

### Textes de présentation à préparer :
- **Titre de l'application** : `Dabari - Traiteur & Colis GP` (max 30 caractères)
- **Description courte** : `Commandez vos plats africains traiteur et expédiez vos colis GP en toute sécurité.` (max 80 caractères)
- **Description longue** : Présentation détaillée de Dabari, des fonctionnalités traiteur (carte des plats, devis sur-mesure chiffrés et signés, acomptes garantis sous séquestre) et GP (réservation de kilos vérifiés, suivi en temps réel).
- **Mots-clés (iOS)** : `traiteur,africain,gp,colis,livraison,plats,dabari,abidjan,dakar,paris`

---

## 6. Étape 4 : Compilation des Binaires de Production

Une fois les tests validés, vous générez les binaires officiels optimisés pour les stores :
- **Android** : format `.aab` (Android App Bundle, exigé par Google).
- **iOS** : format `.ipa` signé pour App Store Connect.

### Pour compiler Android (Production Play Store) :
```bash
npx eas build --profile production --platform android
```
> EAS Build génère automatiquement le fichier `.aab` optimisé avec compression native.

### Pour compiler iOS (Production App Store) :
```bash
npx eas build --profile production --platform ios
```
> EAS vous demandera de vous authentifier avec votre compte Apple Developer. Il générera automatiquement les certificats de distribution (`Distribution Certificate`) et profils d'approvisionnement (`Provisioning Profile`).

### Pour compiler les deux en même temps :
```bash
npx eas build --profile production --platform all
```

---

## 7. Étape 5 : Déploiement sur le Google Play Store

1. Rendez-vous sur la [Google Play Console](https://play.google.com/console).
2. Cliquez sur **Créer une application** :
   - Nom : `Dabari`
   - Langue par défaut : `Français (France)`
   - Type : `Application`
   - Gratuit / Payant : `Gratuit`
3. Complétez la section **Contenu de l'application** :
   - **Politique de confidentialité** : Renseignez l'URL (ex: `https://www.dabari.fr/politique-de-confidentialite`).
   - **Accès aux applications** : Choisissez *"Toutes les fonctionnalités ou certaines d'entre elles sont restreintes"* et fournissez un identifiant de test (ex: email `reviewer@dabari.app` et mot de passe de test) pour que les testeurs de Google puissent naviguer sans restriction.
   - **Public cible et contenu** : 18 ans et plus (ou tout public).
   - **Sécurité des données (Data Safety)** : Déclarez les données collectées par l'app (Nom, email, téléphone, photos/médias pour les annonces, adresses). Déclarez que les données sont chiffrées en transit (HTTPS) et que l'utilisateur peut supprimer son compte.
4. Remplir la **Fiche principale du Google Play Store** :
   - Téléchargez l'icône 512x512 px.
   - Téléchargez la bannière 1024x500 px.
   - Téléchargez vos captures d'écran de l'application.
5. Importer le binaire `.aab` :
   - Allez dans **Production** > **Créer une nouvelle version**.
   - Déposez le fichier `.aab` téléchargé depuis EAS (ou utilisez `npx eas submit -p android` pour l'envoyer automatiquement en une commande).
   - Cliquez sur **Enregistrer** puis **Examiner la version**.
6. Cliquez sur **Démarrer le déploiement vers la production** (ou vers les tests fermés selon votre compte).

---

## 8. Étape 6 : Déploiement sur l'Apple App Store

1. Rendez-vous sur [App Store Connect](https://appstoreconnect.apple.com).
2. Allez dans **Mes apps** > Cliquez sur **+** > **Nouvelle app** :
   - Plateforme : `iOS`
   - Nom : `Dabari`
   - Langue principale : `Français`
   - ID de bundle : Sélectionnez `com.dabari.app`
   - SKU : `dabari-mobile-01`
   - Accès : Accès complet
3. Envoi du build iOS :
   - Vous pouvez envoyer directement le build depuis votre terminal avec :
     ```bash
     npx eas submit -p ios
     ```
   - Le binaire apparaîtra dans l'onglet **TestFlight** après quelques minutes de traitement automatique par Apple.
4. Compléter les informations de soumission :
   - Téléversez les captures d'écran iPhone 6.7" et 6.5".
   - Indiquez les textes, mots-clés et l'URL de support (`https://www.dabari.fr`).
   - Remplissez la section **Confidentialité de l'app**.
   - Dans **Informations pour la vérification de l'app**, renseignez les identifiants du compte de démonstration pour l'équipe de review Apple.
5. Cliquez sur **Ajouter pour vérification** puis **Soumettre pour la vérification de l'app**.
   *(Le délai de validation d'Apple est généralement compris entre 24 et 48 heures).*

---

## 9. Étape 7 : Mises à Jour Futures (OTA & Nouvelles Versions)

### Mises à jour Over-The-Air (Sans repasser par la validation des stores) :
Pour des corrections de bugs rapides ou des modifications d'interface qui ne touchent pas au code natif :
```bash
npx eas update --branch production --message "Correction affichage modal"
```
> L'application se mettra à jour silencieusement sur les téléphones des utilisateurs lors du prochain lancement !

### Nouvelle version majeure (avec nouveau binaire) :
1. Incrémentez la version dans `mobile/app.json` (ex: `"version": "1.0.1"`).
2. Relancez :
   ```bash
   npx eas build --profile production --platform all
   ```
   *(Le `versionCode` Android et le `buildNumber` iOS sont automatiquement incrémentés grâce à `"autoIncrement": true` dans votre `eas.json`).*

---

## 10. Checklist Récapitulative Avant Lancement

- [x] Backend de production Railway en ligne et fonctionnel (`https://dabari-api.up.railway.app/api`)
- [x] Variable `DATABASE_URL` retirée de `mobile/.env` (sécurisé)
- [x] Suppression de compte fonctionnelle dans l'écran profil mobile
- [ ] Compte [expo.dev](https://expo.dev) créé et `npx eas login` exécuté
- [ ] Projet initialisé avec `npx eas project:init`
- [ ] Build APK test généré et validé sur un smartphone physique
- [ ] Compte Google Play Developer validé (25 $)
- [ ] Compte Apple Developer validé (99 $)
- [ ] Visuels créés aux dimensions requises (Icône 512x512, Bannière 1024x500, Screenshots)
- [ ] Page de Politique de Confidentialité en ligne accessible publiquement
- [ ] Compte utilisateur de test créé en base pour les évaluateurs Apple et Google

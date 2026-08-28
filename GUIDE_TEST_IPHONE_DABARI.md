# 📱 Guide : Comment Lancer l'Application Dabari sur iPhone (iOS)

Ce guide décrit les étapes simples et rapides pour exécuter l'application mobile **Dabari** sur un **iPhone physique**.

---

## 1. Prérequis sur l'iPhone

1. **Installer l'application Expo Go** :
   * Ouvrir l'**App Store** sur l'iPhone.
   * Rechercher et installer l'application gratuite **`Expo Go`** (édité par *650 Industries, Inc.*).
2. **Connexion Internet** : S'assurer que l'iPhone est connecté à Internet (Wi-Fi ou 4G/5G).

---

## 2. Configuration du Fichier `.env`

Créer un fichier nommé `.env` dans le dossier `mobile/` avec l'URL de l'API :

```env
EXPO_PUBLIC_API_URL=https://dabari-api.up.railway.app/api
```

> **Note :** Avec cette URL d'API en ligne, l'application est directement fonctionnelle sans avoir besoin de lancer de serveur back-end local sur votre ordinateur.

---

## 3. Lancer le Projet (Sur l'ordinateur)

Ouvrir un terminal et exécuter les commandes suivantes :

```bash
# 1. Aller dans le dossier mobile
cd mobile

# 2. Installer les dépendances (si ce n'est pas déjà fait)
npm install

# 3. Démarrer le serveur Expo
npx expo start
```

Un **QR Code** s'affiche dans votre terminal.

---

## 4. Ouvrir l'Application sur l'iPhone

1. Ouvrir l'application **Appareil Photo** sur l'iPhone.
2. Viser le **QR Code** affiché dans le terminal du PC.
3. Une notification jaune avec le texte **"Ouvrir dans Expo Go"** apparaît en haut de l'écran.
4. Appuyer sur la notification : **l'application Dabari s'ouvre sur l'iPhone.**

---

## 5. Astuces & Dépannage

* **Rechargement automatique (*Fast Refresh*) :** Toute modification de code enregistrée sur l'ordinateur se met à jour en direct sur l'iPhone.
* **Menu de développement :** **Secouer l'iPhone** pour afficher le menu Expo permettant de recharger l'application (*Reload*).
* **Si le QR Code ne charge pas (problème de réseau Wi-Fi) :**  
  Lancer la commande avec l'option tunnel :
  ```bash
  npx expo start --tunnel
  ```

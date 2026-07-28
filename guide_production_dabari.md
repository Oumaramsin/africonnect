# 🚀 Guide Master Déploiement Production — Dabari (de A à Z)

Ce document est le **guide officiel étape par étape** pour déployer l'application **Dabari** en production. En suivant ce guide dans l'ordre de la première à la dernière ligne, votre application sera 100 % opérationnelle, ultra-rapide, sécurisée et hébergée pour le public.

---

## 📑 Sommaire
1. [Choix des Hébergeurs & Coûts des Abonnements](#1-choix-des-hébergeurs--coûts-des-abonnements)
2. [Étape 1 : Base de Données PostgreSQL (Auto-Hébergée vs Cloud Neon)](#étape-1--base-de-données-postgresql-auto-hébergée-vs-cloud-neon)
3. [Étape 2 : Stockage des Images (Cloudflare R2)](#étape-2--stockage-des-images-cloudflare-r2)
4. [Étape 3 : Service d'Envoi d'Emails (Resend.com)](#étape-3--service-denvoi-demails-resendcom)
5. [Étape 4 : Déploiement du Backend Express (Railway.app)](#étape-4--déploiement-du-backend-express-railwayapp)
6. [Étape 5 : Déploiement du Frontend Next.js (Vercel)](#étape-5--déploiement-du-frontend-nextjs-vercel)
7. [Étape 6 : Création du Premier Compte Administrateur](#étape-6--création-du-premier-compte-administrateur)
8. [Récapitulatif des Fichiers de Variables d'Environnement (.env)](#récapitulatif-des-fichiers-de-variables-denvironnement-env)
9. [Checklist de Validation Finale](#checklist-de-validation-finale)

---

## 1. 💳 Choix des Hébergeurs & Coûts des Abonnements

Voici la grille tarifaire exacte et l'infrastructure haute performance retenue pour héberger Dabari :

| Composant | Service Sélectionné | Abonnement à Choisir | Coût Mensuel |
| :--- | :--- | :--- | :--- |
| **Backend API** | **Railway.app** (Performance & Vitesse Maximales) | Plan **Developer** ($5 de crédit offert - H24 sans veille) | **~5 $ / mois** (~4,50 €) |
| **Frontend** | **Vercel** | Plan **Hobby** (Gratuit) | **0 €** |
| **Base de Données** | **Option A : Auto-Hébergée (VPS/Docker)**<br>**Option B : Neon.tech** (Cloud Managé) | Votre propre serveur / Docker<br>Plan **Free Tier** (500 Mo) | **0 € supplémentaire**<br>**0 €** |
| **Stockage Images** | **Cloudflare R2** | Plan **Free** (10 Go stockés + 0€ frais de bande passante) | **0 €** |
| **Emails Transactionnels**| **Resend.com** | Plan **Free** (3 000 emails/mois - 100 emails/jour) | **0 €** |

> **💰 Budget Total Mensuel** : **~5 $ / mois (~4,50 € / mois)** pour une infrastructure professionnelle haute vitesse et sans latence.

---

## Étape 1 : Base de Données PostgreSQL (Auto-Hébergée vs Cloud Neon)

### 🔹 Option A : Héberger sa propre Base de Données (Self-Hosted PostgreSQL via Docker)
*Cette option est idéale si vous possédez votre propre serveur (VPS, machine dédiée ou serveur interne) et souhaitez conserver un contrôle total sur vos données sans limites de stockage tiers.*

1. **Lancement du conteneur PostgreSQL** sur votre serveur Linux / VPS :
   ```bash
   docker run -d \
     --name dabari-postgres \
     -e POSTGRES_USER=dabari_user \
     -e POSTGRES_PASSWORD=votre_mot_de_passe_ultra_securise \
     -e POSTGRES_DB=dabari \
     -p 5432:5432 \
     --restart always \
     postgres:16
   ```
2. **Construction de la variable `DATABASE_URL`** :
   ```env
   DATABASE_URL="postgresql://dabari_user:votre_mot_de_passe_ultra_securise@IP_DE_VOTRE_SERVEUR:5432/dabari"
   ```
3. **Exécution des migrations Prisma** :
   Depuis votre ordinateur, dans le dossier `/backend`, exécutez la commande pour créer toutes les tables sur votre serveur distant :
   ```bash
   npx prisma db push
   ```

---

### 🔹 Option B : Base de Données Cloud Managée (Neon.tech)
*Cette option est idéale si vous préférez ne pas gérer de serveur et bénéficier d'une base de données managée automatiquement.*

1. Rendez-vous sur **[Neon.tech](https://neon.tech)** et créez un compte gratuit.
2. Cliquez sur **New Project** et nommez le projet `dabari-prod`.
3. Choisissez la région la plus proche de vos utilisateurs (ex: `Europe / Frankfurt`).
4. Dans le tableau de bord de votre projet, copiez la chaîne de connexion **Connection String**.
5. Assurez-vous que la chaîne se termine par `?sslmode=require`.  
   *Exemple* :  
   `postgresql://dabari_owner:ABC123xyz@ep-cool-name-12345.eu-central-1.aws.neon.tech/dabari?sslmode=require`
6. Sur votre ordinateur, dans le dossier `/backend`, ouvrez le terminal et exécutez la migration Prisma initiale :
   ```bash
   npx prisma db push
   ```

---

## Étape 2 : Stockage des Images (Cloudflare R2)

1. Rendez-vous sur **[Cloudflare.com](https://dash.cloudflare.com)** et créez un compte.
2. Dans le menu de gauche, rendez-vous sur **R2 Object Storage**.
3. Cliquez sur **Create Bucket** et nommez le bucket `dabari-media`.
4. Dans l'onglet **Settings** du bucket :
   * Sous la section **Public Access**, cliquez sur **Allow Access** pour générer une URL publique R2 (ex: `https://pub-xxxxxx.r2.dev`).
5. Cliquez sur **Manage R2 API Tokens** (en haut à droite) ➔ **Create API Token**.
   * Autorisations : Sélectionnez **Object Read & Write**.
   * Nommez le jeton : `dabari-backend-token`.
6. Notez précieusement les informations générées :
   * **Endpoint S3** : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   * **Access Key ID** : Ex: `8a1b2c3d4e...`
   * **Secret Access Key** : Ex: `9z8y7x6w5v...`
   * **Bucket Name** : `dabari-media`
   * **Public Domain** : `https://pub-xxxxxx.r2.dev`

---

## Étape 3 : Service d'Envoi d'Emails (Resend.com)

1. Rendez-vous sur **[Resend.com](https://resend.com)** et créez un compte gratuit.
2. Cliquez sur **Domains** ➔ **Add Domain** et saisissez votre nom de domaine (ex: `dabari.app`).
3. Ajoutez les enregistrements DNS fournis par Resend (DKIM, SPF, MX) dans le panneau de votre registrar DNS (OVH, Cloudflare, Namecheap...).
4. Rendez-vous dans **API Keys** ➔ Cliquez sur **Create API Key**.
   * Name : `dabari-production`
   * Permission : **Full Access**
5. Copiez la clé API générée (format `re_123456789_xxxx...`).

---

## Étape 4 : Déploiement du Backend Express (Railway.app)

Railway.app est le service sélectionné pour sa **vitesse maximale (latence 20ms - 40ms)** et son exécution H24 sans temps de latence au démarrage.

1. Rendez-vous sur **[Railway.app](https://railway.app)** et connectez-vous avec votre compte GitHub.
2. Cliquez sur **New Project** ➔ **Deploy from GitHub repo**.
3. Sélectionnez votre dépôt GitHub du projet Dabari (dossier `backend`).
4. Rendez-vous dans l'onglet **Variables** du service Railway et ajoutez toutes les variables ci-dessous :

#### 🔑 Variables d'Environnement Railway Backend :
```env
PORT=3001
NODE_ENV=production

# Base de Données (Option A: Votre Serveur OU Option B: Neon.tech)
DATABASE_URL=postgresql://dabari_user:MOT_DE_PASSE@IP_OU_HOST:5432/dabari?sslmode=require

# Clé Secrète Authentification JWT (Remplacer par une phrase longue et unique)
JWT_SECRET=dabari_super_secret_jwt_key_prod_987654321_xzy

# URL du Frontend Vercel (Autorisation CORS)
CLIENT_URL=https://dabari.vercel.app

# Service Emails Resend
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASS=re_123456789_votre_cle_api_resend
EMAIL_FROM=Dabari <noreply@dabari.app>

# Stockage Médias Cloudflare R2
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=votre_access_key_id_r2
S3_SECRET_ACCESS_KEY=votre_secret_access_key_r2
S3_BUCKET_NAME=dabari-media
S3_PUBLIC_DOMAIN=https://pub-xxxxxx.r2.dev
```

5. Rendez-vous dans l'onglet **Settings** sur Railway ➔ **Networking** ➔ Cliquez sur **Generate Domain**.
6. Copiez l'URL publique générée pour l'API (ex: `https://dabari-api.up.railway.app`).

---

## Étape 5 : Déploiement du Frontend Next.js (Vercel)

1. Rendez-vous sur **[Vercel.com](https://vercel.com)** et connectez-vous avec GitHub.
2. Cliquez sur **Add New...** ➔ **Project**.
3. Importez votre dépôt GitHub du Frontend Dabari.
4. Dans le panneau de configuration du projet, ouvrez la section **Environment Variables** et ajoutez :

### 🔑 Variable d'Environnement Vercel Frontend :
```env
NEXT_PUBLIC_API_URL=https://dabari-api.up.railway.app/api
```
*(Remplacez par l'URL exacte générée à l'étape 4 par Railway).*

5. Cliquez sur **Deploy**.
6. Une fois le déploiement terminé, Vercel vous fournit l'URL officielle (ex: `https://dabari.vercel.app`).
7. *(Rappel)* : Vérifiez que la variable `CLIENT_URL` configurée sur Railway correspond bien à cette URL Vercel.

---

## Étape 6 : Création du Premier Compte Administrateur

1. Ouvrez votre application en ligne (`https://dabari.vercel.app/register`).
2. Créez votre premier compte utilisateur avec votre nom et email administrateur.
3. Pour promouvoir ce compte en **Administrateur** :
   * Connectez-vous sur votre outil de gestion SQL (Neon SQL Editor ou via `psql` / DBeaver sur votre serveur Postgres).
   * Exécutez la requête SQL suivante en remplaçant par votre email :
     ```sql
     UPDATE users SET role = 'admin' WHERE email = 'votre-email@dabari.app';
     UPDATE profiles SET role = 'admin' WHERE email = 'votre-email@dabari.app';
     ```
4. Déconnectez-vous puis reconnectez-vous sur l'application : l'onglet **Admin** apparaît désormais dans votre Navbar pour gérer la plateforme.

---

## 📄 Récapitulatif des Fichiers de Variables d'Environnement (.env)

### Fichier `backend/.env` (Production)
```env
PORT=3001
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/dabari?sslmode=require"
JWT_SECRET="votre_cle_secrete_jwt_longue_et_securisee"
CLIENT_URL="https://dabari.vercel.app"

EMAIL_HOST="smtp.resend.com"
EMAIL_PORT=587
EMAIL_USER="resend"
EMAIL_PASS="re_votre_cle_resend"
EMAIL_FROM="Dabari <noreply@dabari.app>"

S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="votre_key_id"
S3_SECRET_ACCESS_KEY="votre_secret_key"
S3_BUCKET_NAME="dabari-media"
S3_PUBLIC_DOMAIN="https://pub-xxxxxx.r2.dev"
```

### Fichier Frontend `.env.local` (Production)
```env
NEXT_PUBLIC_API_URL="https://dabari-api.up.railway.app/api"
```

---

## 📋 Checklist de Validation Finale

- [ ] La base PostgreSQL (Auto-hébergée ou Neon.tech) est créée et le schéma Prisma est à jour (`npx prisma db push`).
- [ ] Le bucket Cloudflare R2 est prêt et l'accès public est activé.
- [ ] Le domaine DNS chez Resend.com est vérifié (DKIM & SPF).
- [ ] Le serveur Backend Railway tourne H24 et répond `{"status":"healthy"}` sur `/api/health`.
- [ ] Le site Web Frontend sur Vercel est en ligne et communique sans erreur avec l'API.
- [ ] Le compte Administrateur est promu en base de données et accède au panneau `/admin`.

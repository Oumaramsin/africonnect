import "dotenv/config";
import path from "path";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { db } from "./db";
import authRouter from "./routes/authroutes";
import traiteurRouter from "./routes/traiteur";
import commandeRouter from "./routes/commande";
import gpRouter from "./routes/gp";
import adminRouter from "./routes/admin";
import uploadRouter from "./routes/upload";
import notificationRouter from "./routes/notification";
import pushTokensRouter from "./routes/pushTokens";

import { generalLimiter, authLimiter, uploadLimiter } from "./middlewares/rateLimiter";
import AuthMiddleware from "./middlewares/authMiddleware";
import { idempotency } from "./middlewares/idempotency";
import { hasDeclaredOrigins, isAllowedOrigin } from "./utils/origins";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("❌ JWT_SECRET manquant : le serveur refuse de démarrer sans secret de signature.");
  process.exit(1);
}
if (jwtSecret.length < 32) {
  console.warn("⚠️ JWT_SECRET trop court (32 caractères aléatoires minimum recommandés).");
}

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
// Railway (et la plupart des hébergeurs) placent l'API derrière un proxy : sans cela, toutes les
// requêtes partagent l'IP du proxy et le rate limiting bloque l'ensemble des utilisateurs.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

// Security Headers Middleware (Anti-Clickjacking, Anti-XSS, Anti-MIME Sniffing)
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  // L'API ne sert que du JSON et des images : aucun script ne doit pouvoir s'y exécuter
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

if (isProduction && !hasDeclaredOrigins()) {
  console.warn("⚠️ FRONTEND_URL / CORS_ORIGINS absents : le site web sera refusé (CORS et protection anti-CSRF).");
}
if (isProduction && !process.env.API_PROXY_SECRET) {
  console.warn(
    "⚠️ API_PROXY_SECRET absent : les visiteurs du site partageront l'IP du proxy Next.js pour le rate limiting.",
  );
}

// CORS : seuls les fronts déclarés (FRONTEND_URL + CORS_ORIGINS séparés par des virgules) sont autorisés.
// `credentials` reste volontairement désactivé : la session web (cookie httpOnly) n'est jamais envoyée
// en cross-origin, le site appelle l'API via son propre domaine (proxy Next.js sur /api).
app.use(
  cors({
    origin: (origin, callback) => {
      // Applications mobiles natives et appels serveur (SSR Next.js) : pas d'en-tête Origin
      callback(null, !origin || isAllowedOrigin(origin));
    },
    // En-têtes d'idempotence lisibles par un front appelant l'API en cross-origin (l'en-tête de
    // requête Idempotency-Key est déjà autorisé : la liste des en-têtes demandés est reflétée).
    exposedHeaders: ["Idempotency-Status", "Idempotent-Replayed"],
  }),
);

app.use(express.json({ limit: "300kb" }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), { index: false, dotfiles: "deny" }),
);

// Envoi de fichiers : quota propre (60 envois par heure et par utilisateur) puis authentification,
// montés AVANT le limiteur général pour que les envois ne consomment pas le quota des autres appels.
app.use(
  "/api/upload",
  AuthMiddleware.webOriginGuard,
  uploadLimiter,
  AuthMiddleware.authenticate,
  uploadRouter,
);

// Application du Rate Limiting Général sur toutes les requêtes API
app.use("/api", generalLimiter);

// Protection anti-CSRF des requêtes du site web (sessions par cookie)
app.use("/api", AuthMiddleware.webOriginGuard);

// Application du Rate Limiting Strict sur les routes d'authentification et de vérification
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-email", authLimiter);
app.use("/api/auth/resend-code", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Idempotence des écritures (en-tête Idempotency-Key) : après le parsing JSON, avant les routes
app.use("/api", idempotency);

// Mount API routes
app.use("/api/auth", authRouter);
// Routes Stripe (/api/stripe) et PayPal (/api/paypal) volontairement NON montées : aucun front ne
// les utilise et elles acceptaient un montant libre (exploitable pour du « card testing » de cartes
// volées). Les fichiers sont conservés pour une future intégration de paiement liée à une commande.
app.use("/api/traiteur", traiteurRouter);
app.use("/api/commande", commandeRouter);
app.use("/api/gp", gpRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/push-tokens", pushTokensRouter);

// Health Check Endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Perform a raw query to check connection status
    await db.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Health check: base de données injoignable:", error);
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date(),
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ message: "Ressource introuvable." });
});

// Gestionnaire d'erreurs global : jamais de stack trace ni de détail interne renvoyé au client
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Corps de requête JSON invalide." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Requête trop volumineuse." });
  }
  console.error("Erreur non gérée:", err);
  res.status(500).json({ message: "Erreur serveur." });
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await db.$disconnect();
  process.exit(0);
});

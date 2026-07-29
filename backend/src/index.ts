import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import authRouter from "./routes/authroutes";
import stripeRouter from "./routes/stripe";
import paypalRouter from "./routes/paypal";
import traiteurRouter from "./routes/traiteur";
import commandeRouter from "./routes/commande";
import gpRouter from "./routes/gp";
import adminRouter from "./routes/admin";
import uploadRouter from "./routes/upload";
import notificationRouter from "./routes/notification";

import { generalLimiter, authLimiter } from "./middlewares/rateLimiter";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Security Headers Middleware (Anti-Clickjacking, Anti-XSS, Anti-MIME Sniffing)
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none';");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Application du Rate Limiting Général sur toutes les requêtes API
app.use("/api", generalLimiter);

// Application du Rate Limiting Strict sur les routes d'authentification
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Mount API routes
app.use("/api/auth", authRouter);
app.use("/api/stripe", stripeRouter);
app.use("/api/paypal", paypalRouter);
app.use("/api/traiteur", traiteurRouter);
app.use("/api/commande", commandeRouter);
app.use("/api/gp", gpRouter);
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/notifications", notificationRouter);

// Health Check Endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Perform a raw query to check connection status
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date(),
    });
  }
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await prisma.$disconnect();
  process.exit(0);
});

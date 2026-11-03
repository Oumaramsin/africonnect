import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { getClientIp, getVerifiedTokenUserId } from "../utils/webClient";

/*
 * Idempotence des requêtes modifiantes (POST, PUT, PATCH, DELETE) portant un en-tête
 * `Idempotency-Key` : une même action relancée (double clic, nouvelle tentative après une coupure
 * réseau dont l'issue est inconnue) renvoie la réponse déjà produite au lieu de créer un doublon.
 * Sans en-tête, le comportement est inchangé.
 *
 * - Portée : méthode + chemin (sans query) + clé + principal (utilisateur d'un JWT vérifié, sinon IP).
 * - Même clé avec un autre corps → 422 ; requête identique encore en cours → 409 avec l'en-tête
 *   `Idempotency-Status: in-progress` ; réponse finale de statut < 500 mémorisée 24 h et rejouée
 *   avec l'en-tête `Idempotent-Replayed: true` ; statut >= 500 : entrée supprimée (une relance
 *   réexécute l'action).
 * - Stockage EN MÉMOIRE : propre à chaque instance du serveur et perdu au redémarrage. Avec plusieurs
 *   instances, une relance qui arrive sur une autre instance réexécute l'action (les mises à jour
 *   conditionnelles des services restent la protection de fond contre les doublons).
 */

const IDEMPOTENCY_HEADER = "Idempotency-Key";
const KEY_REGEX = /^[A-Za-z0-9_-]{8,128}$/;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const RESULT_TTL_MS = 24 * 60 * 60 * 1000;
// Au-delà, une requête « en cours » est considérée comme abandonnée (gestionnaire bloqué) : la clé
// redevient utilisable. Les clients abandonnent eux-mêmes une écriture au bout de 30 secondes.
const IN_PROGRESS_TTL_MS = 2 * 60 * 1000;
const MAX_ENTRIES = 20_000;
// Bornes mémoire : une réponse volumineuse (devis avec signature dessinée...) n'est mémorisée que
// dans la limite d'un budget global ; au-delà, les entrées les plus anciennes sont évincées.
const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Réponses produites avant l'exécution de l'action (session invalide, quota atteint) : non
// mémorisées, une relance après reconnexion ou après la fenêtre de rate limiting est réévaluée.
const NOT_MEMORIZED_STATUSES = new Set([401, 429]);
// En-têtes rejoués avec le corps (cookies de session du site web, politique de cache)
const REPLAYED_HEADERS = ["set-cookie", "cache-control"] as const;

const INVALID_KEY_MESSAGE =
  "En-tête Idempotency-Key invalide : 8 à 128 caractères (lettres, chiffres, « - » ou « _ »).";
const MISMATCH_MESSAGE = "Cette clé d'idempotence a déjà servi pour une autre requête.";
const IN_PROGRESS_MESSAGE =
  "Cette action est déjà en cours de traitement. Patientez quelques secondes puis actualisez la page.";

interface InProgressEntry {
  state: "in_progress";
  fingerprint: string;
  expiresAt: number;
  owner: symbol;
}

interface CompletedEntry {
  state: "completed";
  fingerprint: string;
  expiresAt: number;
  status: number;
  body: string;
  headers: Record<string, string | string[]>;
  bytes: number;
}

type IdempotencyEntry = InProgressEntry | CompletedEntry;

const entries = new Map<string, IdempotencyEntry>();
let totalBytes = 0;

const removeEntry = (scope: string) => {
  const entry = entries.get(scope);
  if (!entry) return;
  if (entry.state === "completed") totalBytes -= entry.bytes;
  entries.delete(scope);
};

const evictOldest = () => {
  // Une Map conserve l'ordre d'insertion : les premières entrées sont les plus anciennes
  for (const scope of entries.keys()) {
    if (entries.size <= MAX_ENTRIES && totalBytes <= MAX_TOTAL_BYTES) return;
    removeEntry(scope);
  }
};

const setEntry = (scope: string, entry: IdempotencyEntry) => {
  removeEntry(scope); // ré-insertion en fin de Map : l'entrée devient la plus récente
  entries.set(scope, entry);
  if (entry.state === "completed") totalBytes += entry.bytes;
  evictOldest();
};

const sweepExpired = () => {
  const now = Date.now();
  for (const [scope, entry] of entries) {
    if (entry.expiresAt <= now) removeEntry(scope);
  }
};

// Nettoyage périodique ; unref() : le timer n'empêche pas l'arrêt du processus
setInterval(sweepExpired, SWEEP_INTERVAL_MS).unref();

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const getPrincipal = (req: Request): string => {
  const userId = getVerifiedTokenUserId(req);
  return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
};

const sendJsonError = (res: Response, status: number, message: string, code?: string) =>
  res.status(status).json({ success: false, error: message, message, ...(code ? { code } : {}) });

/** Middleware à monter sur /api, après le parsing JSON et avant les routes. */
export const idempotency = (req: Request, res: Response, next: NextFunction) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  // Envois multipart (/api/upload) : corps non analysé ici, et routes montées avant ce middleware
  if (req.path === "/upload" || req.path.startsWith("/upload/")) return next();

  const rawKey = req.header(IDEMPOTENCY_HEADER);
  if (rawKey === undefined) return next();
  const key = rawKey.trim();
  if (!KEY_REGEX.test(key)) {
    return sendJsonError(res, 400, INVALID_KEY_MESSAGE);
  }

  const path = req.originalUrl.split("?")[0];
  const scope = sha256([req.method, path, key, getPrincipal(req)].join("\n"));
  const fingerprint = sha256(JSON.stringify(req.body ?? null) ?? "null");
  const now = Date.now();

  const existing = entries.get(scope);
  if (existing && existing.expiresAt > now) {
    if (existing.fingerprint !== fingerprint) {
      return sendJsonError(res, 422, MISMATCH_MESSAGE);
    }
    if (existing.state === "in_progress") {
      res.setHeader("Idempotency-Status", "in-progress");
      return sendJsonError(res, 409, IN_PROGRESS_MESSAGE, "IDEMPOTENCY_IN_PROGRESS");
    }
    for (const [name, value] of Object.entries(existing.headers)) {
      res.setHeader(name, value);
    }
    res.setHeader("Idempotent-Replayed", "true");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(existing.status).send(existing.body);
  }

  const owner = Symbol("idempotency-owner");
  setEntry(scope, { state: "in_progress", fingerprint, expiresAt: now + IN_PROGRESS_TTL_MS, owner });

  let settled = false;
  const settle = (status: number, serializedBody: string | undefined) => {
    if (settled) return;
    settled = true;

    // L'entrée a pu être évincée puis reprise par une autre requête : on ne touche qu'à la sienne
    const current = entries.get(scope);
    if (!current || current.state !== "in_progress" || current.owner !== owner) return;

    if (serializedBody === undefined || status >= 500 || NOT_MEMORIZED_STATUSES.has(status)) {
      removeEntry(scope);
      return;
    }
    const bytes = Buffer.byteLength(serializedBody);
    if (bytes > MAX_ENTRY_BYTES) {
      removeEntry(scope);
      return;
    }

    const headers: Record<string, string | string[]> = {};
    for (const name of REPLAYED_HEADERS) {
      const value = res.getHeader(name);
      if (value !== undefined) headers[name] = typeof value === "number" ? String(value) : value;
    }
    setEntry(scope, {
      state: "completed",
      fingerprint,
      expiresAt: Date.now() + RESULT_TTL_MS,
      status,
      body: serializedBody,
      headers,
      bytes,
    });
  };

  // Le résultat est capturé dès que le gestionnaire répond (même si le client s'est déconnecté)
  const originalJson = res.json.bind(res);
  res.json = ((body?: unknown) => {
    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(body);
    } catch {
      serialized = undefined;
    }
    settle(res.statusCode, serialized);
    return originalJson(body);
  }) as Response["json"];

  // Réponse terminée sans JSON : rien à rejouer, la clé est libérée
  res.on("finish", () => settle(res.statusCode, undefined));
  next();
};

import type { PrismaClient } from "@prisma/client";

/*
 * Notifications push mobiles via le service Expo (qui relaie vers FCM pour Android et APNs pour iOS).
 *
 * Chaque notification enregistrée en base (devis, commandes, GP, alertes admin...) est aussi envoyée
 * en push aux appareils du destinataire : le branchement est fait une seule fois dans src/db.ts.
 * L'envoi est différé et relit la notification hors transaction : si la transaction qui l'a créée
 * est annulée, aucun push ne part. Un échec d'envoi n'interrompt jamais l'action métier.
 *
 * Variables d'environnement facultatives :
 * - EXPO_ACCESS_TOKEN : jeton d'accès Expo si « Enhanced security for push notifications » est activé ;
 * - PUSH_NOTIFICATIONS_DISABLED=true : coupe les envois (tests, maintenance) ;
 * - EXPO_PUSH_URL : point d'envoi (par défaut le service Expo ; remplacé par un faux service en test).
 */

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK_SIZE = 100;
const SEND_TIMEOUT_MS = 10_000;
/** Relectures de la notification : laisse le temps à la transaction qui l'a créée d'être validée. */
const DISPATCH_DELAYS_MS = [500, 2_000, 6_000];
const MAX_BODY_LENGTH = 300;

/** Format des jetons Expo : ExponentPushToken[xxxx] (ou ExpoPushToken[xxxx]). */
export const EXPO_PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/;

export interface PushMessage {
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

const isPushDisabled = () => process.env.PUSH_NOTIFICATIONS_DISABLED === "true";

let missingTableWarned = false;
/** Table push_tokens absente (schéma pas encore poussé en base) : un seul avertissement, sans erreur. */
const isMissingTable = (error: unknown) => {
  if ((error as { code?: string })?.code !== "P2021") return false;
  if (!missingTableWarned) {
    missingTableWarned = true;
    console.warn("⚠️ Table push_tokens absente : lancez `npx prisma db push` pour activer les notifications push.");
  }
  return true;
};

const truncate = (text: string, max: number) => {
  // Découpe par caractères (et non par unités UTF-16) : un emoji n'est jamais coupé en deux
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
};

/** Données du push : uniquement des valeurs simples (identifiants, type) utiles à la navigation. */
const toPushData = (data: unknown): Record<string, unknown> => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (["string", "number", "boolean"].includes(typeof value)) result[key] = value;
  }
  return result;
};

/** Envoie un lot de messages au service Expo ; retire les jetons des appareils désinscrits. */
async function postToExpo(client: PrismaClient, messages: Array<Record<string, unknown> & { to: string }>) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  const payload = (await res.json().catch(() => null)) as { data?: ExpoTicket[]; errors?: unknown } | null;
  if (!res.ok || !Array.isArray(payload?.data)) {
    console.error(`Envoi push refusé par le service Expo (HTTP ${res.status}).`, payload?.errors ?? "");
    return;
  }

  const unregistered = payload.data
    .map((ticket, index) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? messages[index]?.to : null))
    .filter((token): token is string => Boolean(token));
  if (unregistered.length > 0) {
    await client.pushToken.deleteMany({ where: { token: { in: unregistered } } });
  }
  const otherErrors = payload.data.filter((ticket) => ticket.status === "error" && ticket.details?.error !== "DeviceNotRegistered");
  if (otherErrors.length > 0) {
    console.error(`Envoi push : ${otherErrors.length} erreur(s) Expo`, otherErrors.map((t) => t.details?.error || t.message));
  }
}

/** Envoie un push à tous les appareils des utilisateurs donnés. Ne lève jamais d'exception. */
export async function sendPushToUsers(client: PrismaClient, userIds: string[], message: PushMessage): Promise<void> {
  if (isPushDisabled() || userIds.length === 0) return;
  try {
    const tokens = await client.pushToken.findMany({
      where: { user_id: { in: [...new Set(userIds)] } },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map(({ token }) => ({
      to: token,
      title: truncate(message.title, 120),
      ...(message.body ? { body: truncate(message.body, MAX_BODY_LENGTH) } : {}),
      data: message.data ?? {},
      sound: "default",
      priority: "high",
      channelId: "default",
    }));
    for (let i = 0; i < messages.length; i += EXPO_CHUNK_SIZE) {
      await postToExpo(client, messages.slice(i, i + EXPO_CHUNK_SIZE));
    }
  } catch (error) {
    if (isMissingTable(error)) return;
    console.error("Erreur envoi notification push :", error instanceof Error ? error.message : error);
  }
}

/**
 * Envoi différé du push correspondant à une notification tout juste créée : la notification est
 * relue (hors transaction) jusqu'à ce qu'elle soit visible ; si elle n'apparaît pas, la
 * transaction a été annulée et rien n'est envoyé.
 */
export function queueNotificationPush(client: PrismaClient, notificationId: string): void {
  if (isPushDisabled()) return;
  let attempt = 0;
  const dispatch = async () => {
    const notification = await client.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, type: true, titre: true, message: true, user_id: true, data: true },
    });
    if (!notification) {
      attempt += 1;
      if (attempt < DISPATCH_DELAYS_MS.length) setTimeout(run, DISPATCH_DELAYS_MS[attempt]).unref();
      return;
    }
    if (!notification.user_id) return;
    await sendPushToUsers(client, [notification.user_id], {
      title: notification.titre,
      body: notification.message,
      data: { ...toPushData(notification.data), notification_id: notification.id, type: notification.type },
    });
  };
  const run = () => {
    dispatch().catch((error) => console.error("Erreur préparation notification push :", error instanceof Error ? error.message : error));
  };
  setTimeout(run, DISPATCH_DELAYS_MS[0]).unref();
}

/** Push des notifications créées en lot (createMany ne renvoie pas d'identifiant). */
export function queueBatchPush(
  client: PrismaClient,
  rows: Array<{ user_id?: string | null; titre?: string; message?: string | null; type?: string; data?: unknown }>
): void {
  if (isPushDisabled()) return;
  setTimeout(() => {
    for (const row of rows) {
      if (!row.user_id || !row.titre) continue;
      void sendPushToUsers(client, [row.user_id], {
        title: row.titre,
        body: row.message,
        data: { ...toPushData(row.data), ...(row.type ? { type: row.type } : {}) },
      });
    }
  }, DISPATCH_DELAYS_MS[0]).unref();
}

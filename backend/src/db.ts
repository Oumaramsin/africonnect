import { PrismaClient } from "@prisma/client";
import { queueBatchPush, queueNotificationPush } from "./services/pushService";

const prisma = new PrismaClient();

/**
 * Client Prisma de l'application. Toute notification enregistrée (dans ou hors transaction) part
 * aussi en notification push vers les appareils mobiles de son destinataire (services/pushService.ts).
 */
export const db = prisma.$extends({
  query: {
    notification: {
      async create({ args, query }) {
        const created = await query(args);
        const id = (created as { id?: unknown }).id;
        if (typeof id === "string") queueNotificationPush(prisma, id);
        return created;
      },
      // Lots créés hors transaction (alertes de sécurité aux administrateurs)
      async createMany({ args, query }) {
        const result = await query(args);
        queueBatchPush(prisma, Array.isArray(args.data) ? args.data : [args.data]);
        return result;
      },
    },
  },
});

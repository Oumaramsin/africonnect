import { db } from "../db";

export const getUserNotifications = async (userId: string) => {
  const notifications = await db.notification.findMany({
    where: {
      user_id: userId,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 20,
  });

  const unreadNotifCount = await db.notification.count({
    where: {
      user_id: userId,
      is_read: false,
    },
  });

  // Compter les commandes reçues en attente de traitement (Traiteur & GP)
  const profile = await db.profile.findUnique({
    where: { id: userId },
    include: {
      traiteurs: {
        include: {
          orders: { where: { status: "pending" } },
          commandes: { where: { statut: "en_attente" } },
        },
      },
      gp_listings: {
        include: {
          requests: { where: { status: "pending" } },
        },
      },
    },
  });

  const pendingTraiteurOrders = profile?.traiteurs?.reduce((acc, t) => acc + t.orders.length + t.commandes.length, 0) || 0;
  const pendingGpRequests = profile?.gp_listings?.reduce((acc, g) => acc + g.requests.length, 0) || 0;
  const pendingReceivedCount = pendingTraiteurOrders + pendingGpRequests;

  const totalBadgeCount = Math.max(unreadNotifCount, pendingReceivedCount);

  return {
    notifications,
    unread_count: totalBadgeCount,
    pending_received_count: pendingReceivedCount,
  };
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  return await db.notification.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
    },
    data: {
      is_read: true,
    },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return await db.notification.updateMany({
    where: {
      user_id: userId,
      is_read: false,
    },
    data: {
      is_read: true,
    },
  });
};

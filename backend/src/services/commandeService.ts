import { db } from "../db";

export const getRecentOrderByClientId = async (client_id: string) => {
  return await db.order.findMany({
    where: {
      client_id: client_id,
    },
    take: 5,
    include: {
      order_items: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const getAllOrderById = async (id: string) => {
  return await db.profile.findUnique({
    where: {
      id: id,
    },
    include: {
      gp_requests: {
        orderBy: {
          created_at: "desc",
        },
      },
      commandes: {
        orderBy: {
          created_at: "desc",
        },
      },
      orders: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          order_items: {
            include: {
              dish: true,
            },
          },
        },
      },

      traiteurs: {
        include: {
          orders: {
            orderBy: {
              created_at: "desc",
            },
            include: {
              order_items: {
                include: {
                  dish: true,
                },
              },
            },
          },
          commandes: {
            orderBy: {
              created_at: "desc",
            },
          },
        },
      },

      gp_listings: {
        include: {
          requests: {
            orderBy: {
              created_at: "desc",
            },
          },
        },
      },
    },
  });
};

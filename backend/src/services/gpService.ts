import { db } from "../db";
import { CreateGpListingInput, CreateGpRequestInput } from "../utils/types";

export const getAllGp = async () => {
  return await db.gpListing.findMany({
    where: {
      is_active: true,
    },
    include: {
      gp: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const getGpById = async (id: string) => {
  return await db.gpListing.findFirst({
    where: {
      id: id,
      is_active: true,
    },
    include: {
      gp: true,
    },
  });
};

export const createNewGp = async (gp: CreateGpListingInput) => {
  return await db.gpListing.create({
    data: {
      ...gp,
      departure_date: new Date(gp.departure_date),
    },
  });
};

export const createGpOrder = async (order: CreateGpRequestInput) => {
  return await db.$transaction(async (tx) => {
    const gpListing = await tx.gpListing.findUnique({
      where: { id: order.listing_id },
    });

    const newOrder = await tx.gpRequest.create({
      data: {
        listing_id: order.listing_id,
        sender_id: order.sender_id,
        weight_kg: order.weight_kg,
        content_desc: order.content_desc,
        declared_value: order.declared_value,
        notes: order.notes,
        total_amount: order.total_amount,
      },
    });

    if (gpListing?.gp_id) {
      await tx.notification.create({
        data: {
          user_id: gpListing.gp_id,
          type: "nouvelle_demande_colis",
          titre: "📦 Nouvelle demande de colis !",
          message: `Demande de transport : ${order.weight_kg} kg — ${order.content_desc}`,
          data: {
            request_id: newOrder.id,
            listing_id: order.listing_id,
            weight_kg: order.weight_kg,
            total_amount: order.total_amount,
          },
        },
      });
    }

    return newOrder;
  });
};

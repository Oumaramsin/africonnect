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
        departure_city: gpListing?.departure_city || null,
        departure_country: gpListing?.departure_country || null,
        arrival_city: gpListing?.arrival_city || null,
        arrival_country: gpListing?.arrival_country || null,
        departure_date: gpListing?.departure_date || null,
      } as any,
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

export const getGpByUserId = async (gp_id: string) => {
  return await db.gpListing.findMany({
    where: {
      gp_id: gp_id,
      is_active: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const updateGpListing = async (id: string, data: any) => {
  const updateData: any = { ...data };
  if (data.departure_date) {
    updateData.departure_date = new Date(data.departure_date);
  }
  return await db.gpListing.update({
    where: { id },
    data: updateData,
  });
};

export const deleteGpListing = async (id: string) => {
  const hasRequests = await db.gpRequest.findFirst({
    where: { listing_id: id },
  });

  if (hasRequests) {
    return await db.gpListing.update({
      where: { id },
      data: { is_active: false },
    });
  }

  return await db.gpListing.delete({
    where: { id },
  });
};

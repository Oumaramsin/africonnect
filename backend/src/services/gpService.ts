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

export const createNewGp = async (gp: CreateGpListingInput) => {
  return await db.gpListing.create({
    data: {
      ...gp,
      departure_date: new Date(gp.departure_date),
    },
  });
};

export const createGpOrder = async (order: CreateGpRequestInput) => {
  return await db.gpRequest.create({
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
};

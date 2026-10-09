import { db } from "../db";
import { Prisma } from "@prisma/client";
import {
  CreateGpListingInput,
  UpdateGpListingInput,
  CreateGpRequestInput,
  GP_REQUEST_STATUS,
} from "../utils/types";
import {
  sendNewGpRequestToGpMail,
  sendGpRequestStatusToSenderMail,
} from "./emailService";

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
      arrival_date: gp.arrival_date ? new Date(gp.arrival_date) : null,
      pickup_address: gp.pickup_address?.trim() || null,
      pickup_city: gp.pickup_city?.trim() || null,
      dropoff_address: gp.dropoff_address?.trim() || null,
      dropoff_city: gp.dropoff_city?.trim() || null,
      description: gp.description?.trim() || null,
    },
  });
};

export const createGpOrder = async (order: CreateGpRequestInput) => {
  return await db.$transaction(async (tx) => {
    const gpListing = await tx.gpListing.findUnique({
      where: { id: order.listing_id },
      include: { gp: true },
    });

    if (!gpListing) {
      throw new Error("Annonce GP introuvable");
    }

    if (!gpListing.is_active) {
      throw new Error("Cette annonce GP n'est plus active.");
    }

    // Sécurité Capacité : vérifier qu'il reste suffisamment de kilos
    const available = Number(gpListing.available_kg || 0);
    if (available < order.weight_kg) {
      throw new Error(
        `Capacité insuffisante sur ce trajet : il ne reste que ${available} kg disponibles.`,
      );
    }

    // Décrémentation atomique
    await tx.gpListing.update({
      where: { id: order.listing_id },
      data: {
        available_kg: {
          decrement: order.weight_kg,
        },
      },
    });

    const sender = order.sender_id
      ? await tx.profile.findUnique({ where: { id: order.sender_id } })
      : null;

    // Calcul fiable du montant total basé sur le tarif de l'annonce
    const pricePerKg = Number(gpListing.price_per_kg || 0);
    const calculatedTotal = order.total_amount && order.total_amount > 0
      ? order.total_amount
      : pricePerKg * order.weight_kg;

    const newOrder = await tx.gpRequest.create({
      data: {
        listing_id: order.listing_id,
        sender_id: order.sender_id,
        weight_kg: order.weight_kg,
        content_desc: order.content_desc.trim(),
        declared_value: order.declared_value ?? null,
        notes: order.notes?.trim() || null,
        total_amount: calculatedTotal,
        status: GP_REQUEST_STATUS.PENDING,
        departure_city: gpListing.departure_city || null,
        departure_country: gpListing.departure_country || null,
        arrival_city: gpListing.arrival_city || null,
        arrival_country: gpListing.arrival_country || null,
        departure_date: gpListing.departure_date || null,
        arrival_date: gpListing.arrival_date || null,
      },
    });

    if (gpListing.gp_id) {
      try {
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
              total_amount: calculatedTotal,
            },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification GP annonceur:", notifErr);
      }
    }

    // E-mails automatiques non bloquants
    if (gpListing.gp?.email) {
      sendNewGpRequestToGpMail({
        gpEmail: gpListing.gp.email,
        gpName: gpListing.gp.full_name || "Transporteur GP",
        senderName: sender?.full_name || "Expéditeur",
        senderPhone: sender?.phone || undefined,
        senderEmail: sender?.email || undefined,
        departureCity: gpListing.departure_city || undefined,
        arrivalCity: gpListing.arrival_city || undefined,
        weightKg: order.weight_kg,
        contentDesc: order.content_desc,
        totalAmount: calculatedTotal,
      }).catch((err) => console.error("Erreur e-mail GP:", err));
    }

    if (sender?.email) {
      sendGpRequestStatusToSenderMail({
        senderEmail: sender.email,
        senderName: sender.full_name || "Expéditeur",
        gpName: gpListing.gp?.full_name || "GP Transporteur",
        status: "CRÉE",
        departureCity: gpListing.departure_city || undefined,
        arrivalCity: gpListing.arrival_city || undefined,
        weightKg: order.weight_kg,
        totalAmount: calculatedTotal,
      }).catch((err) => console.error("Erreur e-mail expéditeur:", err));
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

export const updateGpListing = async (
  id: string,
  userId: string,
  isAdmin: boolean,
  data: UpdateGpListingInput,
) => {
  const listing = await db.gpListing.findUnique({
    where: { id },
  });

  if (!listing) {
    throw new Error("Annonce GP introuvable");
  }

  // Sécurité Ownership : vérifier que l'utilisateur est le créateur de l'annonce
  if (!isAdmin && listing.gp_id !== userId) {
    throw new Error("Accès refusé. Vous n'êtes pas autorisé à modifier cette annonce.");
  }

  const updateData: Prisma.GpListingUpdateInput = {};

  // Champs obligatoires non-nullables en base
  if (data.departure_city?.trim()) updateData.departure_city = data.departure_city.trim();
  if (data.departure_country?.trim()) updateData.departure_country = data.departure_country.trim();
  if (data.arrival_city?.trim()) updateData.arrival_city = data.arrival_city.trim();
  if (data.arrival_country?.trim()) updateData.arrival_country = data.arrival_country.trim();

  // Champs optionnels / nullables en base
  const nullableFields = [
    "pickup_address",
    "pickup_city",
    "dropoff_address",
    "dropoff_city",
    "description",
    "flight_type",
  ] as const;

  for (const field of nullableFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field]?.trim() || null;
    }
  }

  if (data.available_kg !== undefined) updateData.available_kg = Number(data.available_kg);
  if (data.price_per_kg !== undefined) updateData.price_per_kg = Number(data.price_per_kg);
  if (data.is_active !== undefined) updateData.is_active = Boolean(data.is_active);

  if (data.departure_date) {
    const dDate = new Date(data.departure_date);
    if (isNaN(dDate.getTime())) throw new Error("Date de départ invalide.");
    updateData.departure_date = dDate;
  }

  if (data.arrival_date !== undefined) {
    if (data.arrival_date) {
      const aDate = new Date(data.arrival_date);
      if (isNaN(aDate.getTime())) throw new Error("Date d'arrivée invalide.");
      updateData.arrival_date = aDate;
    } else {
      updateData.arrival_date = null;
    }
  }

  return await db.gpListing.update({
    where: { id },
    data: updateData,
  });
};

export const deleteGpListing = async (
  id: string,
  userId: string,
  isAdmin: boolean,
) => {
  const listing = await db.gpListing.findUnique({
    where: { id },
  });

  if (!listing) {
    throw new Error("Annonce GP introuvable");
  }

  // Sécurité Ownership : vérifier que l'utilisateur est le créateur de l'annonce
  if (!isAdmin && listing.gp_id !== userId) {
    throw new Error("Accès refusé. Vous n'êtes pas autorisé à supprimer cette annonce.");
  }

  const hasRequests = await db.gpRequest.findFirst({
    where: { listing_id: id },
  });

  // Si des demandes sont rattachées, désactivation douce (soft-delete) pour préserver l'historique
  if (hasRequests) {
    return await db.gpListing.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // Sinon suppression physique
  return await db.gpListing.delete({
    where: { id },
  });
};

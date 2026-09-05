import { db } from "../db";

export const updateStateTraiteur = async (id: string, is_active: boolean) => {
  return await db.traiteur.update({
    where: { id: id },
    data: {
      is_active: is_active ? true : false,
    },
  });
};
export const deleteTraiteur = async (id: string) => {
  return await db.$transaction(async (tx) => {
    const traiteur = await tx.traiteur.findUnique({
      where: { id: id },
    });

    if (!traiteur) {
      throw new Error("Traiteur introuvable");
    }

    if (traiteur.user_id) {
      const p = await tx.profile.findUnique({
        where: { id: traiteur.user_id },
      });
      if (p && p.role !== "admin") {
        await tx.profile.update({
          where: { id: traiteur.user_id },
          data: { role: "client" },
        });
      }
    }

    return await tx.traiteur.delete({
      where: { id: id },
    });
  });
};

export const createTraiteurFromUser = async (
  userId: string,
  data: {
    name: string;
    bio: string;
    cuisine_type: string[];
    delivery_zones: string[];
    whatsapp?: string;
    image_url?: string;
  },
) => {
  return await db.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new Error(
        "L'utilisateur spécifié n'existe pas en base de données.",
      );
    }

    const existing = await tx.traiteur.findFirst({
      where: { user_id: userId },
    });

    if (existing) {
      throw new Error("Cet utilisateur possède déjà un profil traiteur.");
    }

    const traiteur = await tx.traiteur.create({
      data: {
        user_id: userId,
        name: data.name,
        bio: data.bio,
        cuisine_type: data.cuisine_type,
        delivery_zones: data.delivery_zones,
        whatsapp: data.whatsapp || null,
        image_url: data.image_url || null,
        is_active: true,
      },
    });

    if (profile.role !== "admin") {
      await tx.profile.update({
        where: { id: userId },
        data: { role: "traiteur" },
      });
    }

    return traiteur;
  });
};

export const getAdminOverview = async () => {
  const [traiteurs, gpListings, profiles] = await Promise.all([
    db.traiteur.findMany({
      orderBy: { created_at: "desc" },
      include: { profile: true },
    }),
    db.gpListing.findMany({
      orderBy: { created_at: "desc" },
      include: { gp: true },
    }),
    db.profile.findMany({
      orderBy: { full_name: "asc" },
      include: {
        traiteurs: { select: { id: true, name: true, is_active: true } },
        gp_listings: { select: { id: true, is_active: true } },
      },
    }),
  ]);
  return { traiteurs, gpListings, profiles };
};

export const updateStateGp = async (id: string, is_active: boolean) => {
  return await db.gpListing.update({
    where: { id: id },
    data: {
      is_active: is_active,
    },
  });
};

export const setAdmin = async (id: string, makeAdmin?: boolean) => {
  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("Utilisateur introuvable.");
    }

    const shouldBeAdmin =
      makeAdmin !== undefined ? makeAdmin : user.role !== "admin";

    let targetRole = "admin";
    if (!shouldBeAdmin) {
      const hasTraiteur = await tx.traiteur.findFirst({
        where: { user_id: id },
      });
      const hasGp = await tx.gpListing.findFirst({
        where: { gp_id: id },
      });
      targetRole = hasTraiteur ? "traiteur" : hasGp ? "gp" : "client";
    }

    const updatedUser = await tx.user.update({
      where: { id },
      data: { role: targetRole },
    });

    const profile = await tx.profile.findUnique({ where: { id } });
    if (profile) {
      await tx.profile.update({
        where: { id },
        data: { role: targetRole },
      });
    }

    return {
      id: updatedUser.id,
      role: targetRole,
      is_admin: targetRole === "admin",
    };
  });
};

export const deleteGp = async (id: string) => {
  return await db.gpListing.delete({
    where: { id: id },
  });
};

export const createGpFromUser = async (
  userId: string,
  data: {
    departure_city: string;
    departure_country: string;
    arrival_city: string;
    arrival_country: string;
    departure_date: Date | string;
    available_kg: number;
    price_per_kg: number;
  },
) => {
  return await db.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new Error("L'utilisateur spécifié n'existe pas.");
    }

    const gpListing = await tx.gpListing.create({
      data: {
        gp_id: userId,
        departure_city: data.departure_city,
        departure_country: data.departure_country,
        arrival_city: data.arrival_city,
        arrival_country: data.arrival_country,
        departure_date: new Date(data.departure_date),
        available_kg: data.available_kg,
        price_per_kg: data.price_per_kg,
        is_active: true,
      },
      include: {
        gp: true,
      },
    });

    if (profile.role !== "admin") {
      await tx.profile.update({
        where: { id: userId },
        data: { role: "gp" },
      });
    }

    return gpListing;
  });
};

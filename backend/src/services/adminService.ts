import { db } from "../db";

export const getAllTraiteur = async () => {
  return await db.traiteur.findMany({
    orderBy: {
      name: "desc",
    },
  });
};

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
      await tx.profile.update({
        where: { id: traiteur.user_id },
        data: { role: "client" },
      });
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

    await tx.profile.update({
      where: { id: userId },
      data: { role: "traiteur" },
    });

    return traiteur;
  });
};

export const getAllGp = async () => {
  return await db.gpListing.findMany({
    orderBy: {
      created_at: "desc",
    },
    include: {
      gp: true,
    },
  });
};

export const updateStateGp = async (id: string, is_active: boolean) => {
  return await db.gpListing.update({
    where: { id: id },
    data: {
      is_active: is_active,
    },
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
  const profile = await db.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    throw new Error("L'utilisateur spécifié n'existe pas.");
  }

  return await db.gpListing.create({
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
  });
};

// A voir la création d'un nouveau utilisateur 
// export const createNewUser = async (
//   name: string,
//   phone: string,
//   email?: string,
// ) => {
//   return await db.user.create({
//     data: {
//         email:
//     }
//   });
// };

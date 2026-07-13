import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Début du peuplement de la base de données...");

  // Nettoyage des anciennes données
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.gpRequest.deleteMany();
  await prisma.gpListing.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.traiteur.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Base de données nettoyée.");

  // Hachage des mots de passe
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Création des Utilisateurs et Profils associés
  const userAdmin = await prisma.user.create({
    data: {
      email: "admin@africonnect.app",
      password: hashedPassword,
      role: "Admin",
      profile: {
        create: {
          full_name: "Administrateur AfriConnect",
          email: "admin@africonnect.app",
          phone: "+33100000000",
          city: "Paris",
          role: "Admin",
        },
      },
    },
    include: { profile: true },
  });

  const userClient = await prisma.user.create({
    data: {
      email: "client@email.com",
      phone: "+33612345678",
      password: hashedPassword,
      role: "client",
      profile: {
        create: {
          full_name: "Aminata Diallo",
          email: "client@email.com",
          phone: "+33612345678",
          whatsapp: "+33612345678",
          city: "Paris 18e",
          role: "client",
        },
      },
    },
    include: { profile: true },
  });

  const userTraiteur = await prisma.user.create({
    data: {
      email: "chef.fatou@email.com",
      phone: "+33798765432",
      password: hashedPassword,
      role: "traiteur",
      profile: {
        create: {
          full_name: "Fatou Diome",
          email: "chef.fatou@email.com",
          phone: "+33798765432",
          whatsapp: "+33798765432",
          city: "Aubervilliers",
          role: "traiteur",
        },
      },
    },
    include: { profile: true },
  });

  const userGp = await prisma.user.create({
    data: {
      email: "voyageur.kofi@email.com",
      phone: "+33655544433",
      password: hashedPassword,
      role: "gp",
      profile: {
        create: {
          full_name: "Kofi Mensah",
          email: "voyageur.kofi@email.com",
          phone: "+33655544433",
          whatsapp: "+33655544433",
          city: "Paris 10e",
          role: "gp",
        },
      },
    },
    include: { profile: true },
  });

  console.log("👥 Utilisateurs et profils créés.");

  // 2. Création du Traiteur
  const traiteur = await prisma.traiteur.create({
    data: {
      id: userTraiteur.profile!.id, // relation 1-to-1 sur l'id
      name: "Les Marmites de Fatou",
      bio: "Cuisine authentique du Sénégal et de l'Afrique de l'Ouest. Plats traditionnels préparés sur commande avec des ingrédients frais.",
      cuisine_type: ["Sénégal", "Afrique de l'Ouest", "Côte d'Ivoire"],
      rating: 4.8,
      review_count: 15,
      delivery_zones: ["Paris", "Aubervilliers", "Saint-Denis", "Pantin"],
      whatsapp: "+33798765432",
      image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
      is_active: true,
    },
  });

  // Plats (Dishes) associés au Traiteur
  const dish1 = await prisma.dish.create({
    data: {
      traiteur_id: traiteur.id,
      name: "Thiéboudienne Rouge au Poisson",
      description: "Le plat national sénégalais : riz rouge savoureux mijoté avec du poisson frais mariné (Rof), du manioc, du chou, des carottes et de l'aubergine.",
      price: 15.5,
      image_urls: ["https://images.unsplash.com/photo-1628294895550-9ec83e20078a?auto=format&fit=crop&w=600&q=80"],
      cuisine_type: "Sénégal",
      is_available: true,
      min_order_hours: 24,
    },
  });

  const dish2 = await prisma.dish.create({
    data: {
      traiteur_id: traiteur.id,
      name: "Poulet Yassa Traditionnel",
      description: "Poulet mariné au citron, à la moutarde et caramélisé avec une grande quantité d'oignons fondants, servi avec du riz blanc brisé parfumé.",
      price: 14.0,
      image_urls: ["https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=600&q=80"],
      cuisine_type: "Sénégal",
      is_available: true,
      min_order_hours: 12,
    },
  });

  const dish3 = await prisma.dish.create({
    data: {
      traiteur_id: traiteur.id,
      name: "Braisé d'Alloco & Brochettes de Bœuf",
      description: "Bananes plantains frites dorées et moelleuses servies avec des brochettes de bœuf épicées façon Suya/Kankankan.",
      price: 13.50,
      image_urls: ["https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"],
      cuisine_type: "Côte d'Ivoire",
      is_available: true,
      min_order_hours: 24,
    },
  });

  console.log("🍳 Traiteur et plats créés.");

  // 3. Création des Trajets GP (Listings)
  const listing1 = await prisma.gpListing.create({
    data: {
      gp_id: userGp.profile!.id,
      departure_city: "Paris",
      departure_country: "France",
      arrival_city: "Dakar",
      arrival_country: "Sénégal",
      departure_date: new Date(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]), // dans 15 jours
      available_kg: 20.0,
      price_per_kg: 8.0,
      flight_type: "direct",
      description: "Voyage régulier. Dépôt des colis sur Paris (Gare du Nord ou Châtelet) et retrait sur Dakar (Fann Résidence). Pas de liquides ni d'aérosols.",
      is_active: true,
      rating: 4.9,
      review_count: 7,
      pickup_city: "Paris 10e",
      pickup_address: "Gare du Nord, Rue de Dunkerque",
      latitude: 48.8809,
      longitude: 2.3553,
    },
  });

  const listing2 = await prisma.gpListing.create({
    data: {
      gp_id: userGp.profile!.id,
      departure_city: "Paris",
      departure_country: "France",
      arrival_city: "Abidjan",
      arrival_country: "Côte d'Ivoire",
      departure_date: new Date(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]), // dans 30 jours
      available_kg: 15.0,
      price_per_kg: 7.5,
      flight_type: "escale",
      description: "Voyage de retour vacances. Remise en main propre uniquement. Possibilité de livrer à Cocody.",
      is_active: true,
      rating: 4.7,
      review_count: 4,
      pickup_city: "Paris 12e",
      pickup_address: "Gare de Lyon",
      latitude: 48.8443,
      longitude: 2.3744,
    },
  });

  console.log("✈️ Trajets GP créés.");

  // 4. Création d'une commande d'exemple (Order)
  const order = await prisma.order.create({
    data: {
      client_id: userClient.profile!.id,
      traiteur_id: traiteur.id,
      status: "pending",
      delivery_type: "delivery",
      delivery_address: "15 Rue de la Paix, 75002 Paris",
      delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // dans 2 jours
      total_amount: 45.0,
      notes: "Livrer de préférence en fin d'après-midi, merci !",
      order_items: {
        create: [
          {
            dish_id: dish1.id,
            quantity: 2,
            unit_price: 15.5,
          },
          {
            dish_id: dish2.id,
            quantity: 1,
            unit_price: 14.0,
          },
        ],
      },
    },
  });

  console.log("📦 Commande d'exemple créée.");

  // 5. Création d'un message d'exemple
  await prisma.message.create({
    data: {
      sender_id: userClient.profile!.id,
      receiver_id: userGp.profile!.id,
      content: "Bonjour Kofi, est-il encore possible d'envoyer un colis de 3 kg pour Dakar sur votre vol du 15 ?",
      is_read: false,
    },
  });

  console.log("💬 Message d'exemple créé.");

  // 6. Création d'une notification d'exemple
  await prisma.notification.create({
    data: {
      user_id: userTraiteur.profile!.id,
      type: "new_order",
      titre: "Nouvelle commande reçue !",
      message: `${userClient.profile!.full_name} a commandé chez vous pour un total de 45.00 €.`,
      is_read: false,
      data: { orderId: order.id },
    },
  });

  console.log("🔔 Notification d'exemple créée.");

  console.log("🎉 Peuplement terminé avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le peuplement :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

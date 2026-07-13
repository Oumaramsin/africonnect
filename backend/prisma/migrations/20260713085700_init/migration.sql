-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "city" TEXT,
    "role" TEXT DEFAULT 'client',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "whatsapp" TEXT,
    "email" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traiteurs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "cuisine_type" TEXT[],
    "rating" DECIMAL DEFAULT 0,
    "review_count" INTEGER DEFAULT 0,
    "delivery_zones" TEXT[],
    "image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "whatsapp" TEXT,

    CONSTRAINT "traiteurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" UUID NOT NULL,
    "traiteur_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "image_urls" TEXT[],
    "cuisine_type" TEXT,
    "is_available" BOOLEAN DEFAULT true,
    "min_order_hours" INTEGER DEFAULT 24,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN DEFAULT false,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "client_id" UUID,
    "traiteur_id" UUID,
    "status" TEXT DEFAULT 'pending',
    "delivery_type" TEXT DEFAULT 'delivery',
    "delivery_address" TEXT,
    "delivery_date" TIMESTAMPTZ(6),
    "total_amount" DECIMAL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "dish_id" UUID,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gp_listings" (
    "id" UUID NOT NULL,
    "gp_id" UUID,
    "departure_city" TEXT NOT NULL,
    "departure_country" TEXT NOT NULL,
    "arrival_city" TEXT NOT NULL,
    "arrival_country" TEXT NOT NULL,
    "departure_date" DATE NOT NULL,
    "available_kg" DECIMAL NOT NULL,
    "price_per_kg" DECIMAL NOT NULL,
    "flight_type" TEXT DEFAULT 'direct',
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "rating" DECIMAL DEFAULT 0,
    "review_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "pickup_address" TEXT,
    "pickup_city" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,

    CONSTRAINT "gp_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gp_requests" (
    "id" UUID NOT NULL,
    "listing_id" UUID,
    "sender_id" UUID,
    "weight_kg" DECIMAL NOT NULL,
    "content_desc" TEXT NOT NULL,
    "declared_value" DECIMAL,
    "status" TEXT DEFAULT 'pending',
    "total_amount" DECIMAL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "sender_id" UUID,
    "receiver_id" UUID,
    "content" TEXT NOT NULL,
    "reference_id" UUID,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes_traiteur" (
    "id" UUID NOT NULL,
    "client_id" UUID,
    "traiteur_id" UUID,
    "date_evenement" DATE NOT NULL,
    "nb_personnes" INTEGER NOT NULL,
    "adresse" TEXT NOT NULL,
    "type_evenement" TEXT,
    "notes" TEXT,
    "statut" TEXT DEFAULT 'en_attente',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "message_traiteur" TEXT,

    CONSTRAINT "commandes_traiteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "data" JSONB,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "traiteurs" ADD CONSTRAINT "traiteurs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_traiteur_id_fkey" FOREIGN KEY ("traiteur_id") REFERENCES "traiteurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_traiteur_id_fkey" FOREIGN KEY ("traiteur_id") REFERENCES "traiteurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gp_listings" ADD CONSTRAINT "gp_listings_gp_id_fkey" FOREIGN KEY ("gp_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gp_requests" ADD CONSTRAINT "gp_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "gp_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gp_requests" ADD CONSTRAINT "gp_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_traiteur" ADD CONSTRAINT "commandes_traiteur_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_traiteur" ADD CONSTRAINT "commandes_traiteur_traiteur_id_fkey" FOREIGN KEY ("traiteur_id") REFERENCES "traiteurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

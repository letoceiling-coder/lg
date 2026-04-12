-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'manager', 'agent', 'client');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('FEED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('APARTMENT', 'PARKING', 'LAND', 'COMMERCIAL', 'HOUSE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'RESERVED', 'DRAFT');

-- CreateEnum
CREATE TYPE "BlockStatus" AS ENUM ('BUILDING', 'COMPLETED', 'PROJECT');

-- CreateEnum
CREATE TYPE "BlockImageKind" AS ENUM ('RENDER', 'PLAN');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'PLAN', 'RENDER', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('CONSULTATION', 'MORTGAGE', 'CALLBACK', 'SELECTION', 'CONTACT');

-- CreateEnum
CREATE TYPE "ParkingType" AS ENUM ('UNDERGROUND', 'GROUND', 'MULTILEVEL');

-- CreateEnum
CREATE TYPE "CommercialType" AS ENUM ('OFFICE', 'RETAIL', 'WAREHOUSE', 'RESTAURANT', 'OTHER');

-- CreateEnum
CREATE TYPE "HouseType" AS ENUM ('DETACHED', 'SEMI', 'TOWNHOUSE', 'DUPLEX');

-- CreateEnum
CREATE TYPE "SiteSettingFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'URL', 'PHONE', 'EMAIL', 'IMAGE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "ContentFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'RICHTEXT', 'NUMBER', 'URL', 'IMAGE', 'BOOLEAN', 'JSON_ARRAY');

-- CreateEnum
CREATE TYPE "ContentItemFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'URL', 'IMAGE', 'NUMBER', 'BOOLEAN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'client',
    "telegram_id" BIGINT,
    "telegram_username" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_regions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_imported_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "external_id" TEXT,
    "crm_id" INTEGER,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subways" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "external_id" TEXT,
    "crm_id" INTEGER,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builders" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "external_id" TEXT,
    "crm_id" BIGINT,
    "name" TEXT NOT NULL,
    "data_source" "DataSource" NOT NULL DEFAULT 'FEED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "crm_id" INTEGER,
    "name" TEXT NOT NULL,
    "name_one" TEXT,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finishings" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "crm_id" INTEGER,
    "name" TEXT NOT NULL,

    CONSTRAINT "finishings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_types" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "crm_id" INTEGER,
    "name" TEXT NOT NULL,

    CONSTRAINT "building_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "external_id" TEXT,
    "crm_id" BIGINT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "district_id" INTEGER,
    "builder_id" INTEGER,
    "status" "BlockStatus" NOT NULL DEFAULT 'BUILDING',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "is_promoted" BOOLEAN NOT NULL DEFAULT false,
    "sales_start_date" DATE,
    "data_source" "DataSource" NOT NULL DEFAULT 'FEED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_addresses" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "block_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_images" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "BlockImageKind" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "block_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_subways" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "subway_id" INTEGER NOT NULL,
    "distance_time" INTEGER,
    "distance_type" SMALLINT,

    CONSTRAINT "block_subways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "block_id" INTEGER NOT NULL,
    "external_id" TEXT,
    "crm_id" BIGINT,
    "name" TEXT,
    "queue" TEXT,
    "building_type_id" INTEGER,
    "deadline" DATE,
    "deadline_key" DATE,
    "subsidy" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "data_source" "DataSource" NOT NULL DEFAULT 'FEED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_addresses" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "street" TEXT,
    "house" TEXT,
    "housing" TEXT,
    "street_en" TEXT,
    "house_en" TEXT,
    "housing_en" TEXT,

    CONSTRAINT "building_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "kind" "ListingKind" NOT NULL,
    "block_id" INTEGER,
    "building_id" INTEGER,
    "builder_id" INTEGER,
    "district_id" INTEGER,
    "external_id" TEXT,
    "crm_id" BIGINT,
    "price" DECIMAL(15,2),
    "price_base" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "data_source" "DataSource" NOT NULL DEFAULT 'FEED',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_apartments" (
    "listing_id" INTEGER NOT NULL,
    "room_type_id" INTEGER,
    "finishing_id" INTEGER,
    "building_type_id" INTEGER,
    "floor" INTEGER,
    "floors_total" INTEGER,
    "number" TEXT,
    "area_total" DECIMAL(8,2),
    "area_given" DECIMAL(8,2),
    "area_rooms_total" DECIMAL(8,2),
    "area_kitchen" DECIMAL(8,2),
    "area_balconies" DECIMAL(8,2),
    "area_rooms_detail" TEXT,
    "ceiling_height" DECIMAL(4,2),
    "wc_count" INTEGER,
    "has_mortgage" BOOLEAN,
    "has_installment" BOOLEAN,
    "has_subsidy" BOOLEAN,
    "has_military_mortgage" BOOLEAN,
    "building_deadline" TIMESTAMP(3),
    "building_name" TEXT,
    "building_queue" TEXT,
    "block_address" TEXT,
    "block_name" TEXT,
    "block_is_city" BOOLEAN,
    "block_city_id" TEXT,
    "plan_url" TEXT,

    CONSTRAINT "listing_apartments_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing_apartment_banks" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "bank_external_id" TEXT NOT NULL,

    CONSTRAINT "listing_apartment_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_apartment_contracts" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "contract_external_id" TEXT NOT NULL,

    CONSTRAINT "listing_apartment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_parking" (
    "listing_id" INTEGER NOT NULL,
    "parking_type" "ParkingType",
    "area" DECIMAL(8,2),
    "floor" INTEGER,
    "number" TEXT,

    CONSTRAINT "listing_parking_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing_land" (
    "listing_id" INTEGER NOT NULL,
    "area_sotki" DECIMAL(10,2),
    "land_category" TEXT,
    "cadastral_number" TEXT,
    "has_communications" BOOLEAN,

    CONSTRAINT "listing_land_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing_commercial" (
    "listing_id" INTEGER NOT NULL,
    "commercial_type" "CommercialType",
    "area" DECIMAL(10,2),
    "floor" INTEGER,
    "has_separate_entrance" BOOLEAN,

    CONSTRAINT "listing_commercial_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing_houses" (
    "listing_id" INTEGER NOT NULL,
    "house_type" "HouseType",
    "area_total" DECIMAL(10,2),
    "area_land" DECIMAL(10,2),
    "floors_count" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "has_garage" BOOLEAN,
    "year_built" INTEGER,

    CONSTRAINT "listing_houses_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "field_overrides" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "field_name" TEXT NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(65,30),
    "value_boolean" BOOLEAN,
    "overridden_by" UUID,
    "overridden_at" TIMESTAMP(3),

    CONSTRAINT "field_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "original_filename" TEXT,
    "size_bytes" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "feed_exported_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "stats" JSONB,
    "error_message" TEXT,
    "triggered_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "type" "RequestType" NOT NULL DEFAULT 'CONSULTATION',
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "block_id" INTEGER,
    "listing_id" INTEGER,
    "source_url" TEXT,
    "assigned_to" UUID,
    "comment" TEXT,
    "telegram_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "image_url" TEXT,
    "source" TEXT,
    "source_url" TEXT,
    "published_at" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "SiteSettingFieldType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" SERIAL NOT NULL,
    "page_slug" TEXT NOT NULL,
    "block_type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_block_fields" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "field_key" TEXT NOT NULL,
    "field_type" "ContentFieldType" NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(65,30),
    "value_boolean" BOOLEAN,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_block_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_block_items" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "collection_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_block_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_block_item_fields" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "field_key" TEXT NOT NULL,
    "field_type" "ContentItemFieldType" NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(65,30),
    "value_boolean" BOOLEAN,
    "label" TEXT NOT NULL,

    CONSTRAINT "content_block_item_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menus" (
    "id" SERIAL NOT NULL,
    "location" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" SERIAL NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortgage_banks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rate_from" DECIMAL(5,2),
    "rate_to" DECIMAL(5,2),
    "logo_url" TEXT,
    "url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortgage_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_regions_code_key" ON "feed_regions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_region_id_external_id_key" ON "districts"("region_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "subways_region_id_external_id_key" ON "subways"("region_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "builders_region_id_external_id_key" ON "builders"("region_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_external_id_key" ON "room_types"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "finishings_external_id_key" ON "finishings"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "building_types_external_id_key" ON "building_types"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_slug_key" ON "blocks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_region_id_external_id_key" ON "blocks"("region_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "block_subways_block_id_subway_id_distance_type_key" ON "block_subways"("block_id", "subway_id", "distance_type");

-- CreateIndex
CREATE INDEX "buildings_block_id_idx" ON "buildings"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_region_id_external_id_key" ON "buildings"("region_id", "external_id");

-- CreateIndex
CREATE INDEX "listings_region_id_kind_idx" ON "listings"("region_id", "kind");

-- CreateIndex
CREATE INDEX "listings_region_id_price_idx" ON "listings"("region_id", "price");

-- CreateIndex
CREATE INDEX "listings_region_id_district_id_idx" ON "listings"("region_id", "district_id");

-- CreateIndex
CREATE INDEX "listings_block_id_idx" ON "listings"("block_id");

-- CreateIndex
CREATE INDEX "listings_building_id_idx" ON "listings"("building_id");

-- CreateIndex
CREATE INDEX "listings_builder_id_idx" ON "listings"("builder_id");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_data_source_idx" ON "listings"("data_source");

-- CreateIndex
CREATE UNIQUE INDEX "listings_region_id_external_id_key" ON "listings"("region_id", "external_id");

-- CreateIndex
CREATE INDEX "listing_apartments_room_type_id_idx" ON "listing_apartments"("room_type_id");

-- CreateIndex
CREATE INDEX "listing_apartments_finishing_id_idx" ON "listing_apartments"("finishing_id");

-- CreateIndex
CREATE INDEX "listing_apartments_building_type_id_idx" ON "listing_apartments"("building_type_id");

-- CreateIndex
CREATE INDEX "listing_apartments_floor_idx" ON "listing_apartments"("floor");

-- CreateIndex
CREATE INDEX "listing_apartments_floors_total_idx" ON "listing_apartments"("floors_total");

-- CreateIndex
CREATE INDEX "listing_apartments_area_total_idx" ON "listing_apartments"("area_total");

-- CreateIndex
CREATE INDEX "listing_apartments_area_given_idx" ON "listing_apartments"("area_given");

-- CreateIndex
CREATE INDEX "listing_apartments_area_rooms_total_idx" ON "listing_apartments"("area_rooms_total");

-- CreateIndex
CREATE INDEX "listing_apartments_area_kitchen_idx" ON "listing_apartments"("area_kitchen");

-- CreateIndex
CREATE INDEX "listing_apartments_ceiling_height_idx" ON "listing_apartments"("ceiling_height");

-- CreateIndex
CREATE INDEX "listing_apartments_wc_count_idx" ON "listing_apartments"("wc_count");

-- CreateIndex
CREATE INDEX "listing_apartments_building_deadline_idx" ON "listing_apartments"("building_deadline");

-- CreateIndex
CREATE INDEX "listing_apartments_block_is_city_idx" ON "listing_apartments"("block_is_city");

-- CreateIndex
CREATE UNIQUE INDEX "field_overrides_entity_type_entity_id_field_name_key" ON "field_overrides"("entity_type", "entity_id", "field_name");

-- CreateIndex
CREATE UNIQUE INDEX "news_slug_key" ON "news"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- CreateIndex
CREATE INDEX "site_settings_group_name_idx" ON "site_settings"("group_name");

-- CreateIndex
CREATE INDEX "content_blocks_page_slug_idx" ON "content_blocks"("page_slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_page_slug_block_type_key" ON "content_blocks"("page_slug", "block_type");

-- CreateIndex
CREATE INDEX "content_block_fields_block_id_idx" ON "content_block_fields"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_block_fields_block_id_field_key_key" ON "content_block_fields"("block_id", "field_key");

-- CreateIndex
CREATE INDEX "content_block_items_block_id_idx" ON "content_block_items"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_block_item_fields_item_id_field_key_key" ON "content_block_item_fields"("item_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_menus_location_key" ON "navigation_menus"("location");

-- CreateIndex
CREATE INDEX "navigation_items_menu_id_idx" ON "navigation_items"("menu_id");

-- CreateIndex
CREATE INDEX "navigation_items_parent_id_idx" ON "navigation_items"("parent_id");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_user_id_idx" ON "audit_events"("user_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subways" ADD CONSTRAINT "subways_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builders" ADD CONSTRAINT "builders_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_addresses" ADD CONSTRAINT "block_addresses_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_images" ADD CONSTRAINT "block_images_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_subways" ADD CONSTRAINT "block_subways_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_subways" ADD CONSTRAINT "block_subways_subway_id_fkey" FOREIGN KEY ("subway_id") REFERENCES "subways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_building_type_id_fkey" FOREIGN KEY ("building_type_id") REFERENCES "building_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_addresses" ADD CONSTRAINT "building_addresses_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_apartments" ADD CONSTRAINT "listing_apartments_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_apartments" ADD CONSTRAINT "listing_apartments_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_apartments" ADD CONSTRAINT "listing_apartments_finishing_id_fkey" FOREIGN KEY ("finishing_id") REFERENCES "finishings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_apartments" ADD CONSTRAINT "listing_apartments_building_type_id_fkey" FOREIGN KEY ("building_type_id") REFERENCES "building_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_apartment_banks" ADD CONSTRAINT "listing_apartment_banks_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing_apartments"("listing_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_apartment_contracts" ADD CONSTRAINT "listing_apartment_contracts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing_apartments"("listing_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_parking" ADD CONSTRAINT "listing_parking_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_land" ADD CONSTRAINT "listing_land_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_commercial" ADD CONSTRAINT "listing_commercial_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_houses" ADD CONSTRAINT "listing_houses_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_overrides" ADD CONSTRAINT "field_overrides_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_block_fields" ADD CONSTRAINT "content_block_fields_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_block_items" ADD CONSTRAINT "content_block_items_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_block_item_fields" ADD CONSTRAINT "content_block_item_fields_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "content_block_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "navigation_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

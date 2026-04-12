-- CreateEnum
CREATE TYPE "CollectionItemKind" AS ENUM ('BLOCK', 'LISTING');

-- CreateTable
CREATE TABLE "user_collections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_collection_items" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "kind" "CollectionItemKind" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_collection_items_collection_id_kind_entity_id_key" ON "user_collection_items"("collection_id", "kind", "entity_id");

-- CreateIndex
CREATE INDEX "user_collections_user_id_idx" ON "user_collections"("user_id");

-- CreateIndex
CREATE INDEX "user_collection_items_collection_id_idx" ON "user_collection_items"("collection_id");

-- AddForeignKey
ALTER TABLE "user_collections" ADD CONSTRAINT "user_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_collection_items" ADD CONSTRAINT "user_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "user_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

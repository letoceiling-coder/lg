-- Create sellers table and optional listing link.
CREATE TABLE "sellers" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(255),
    "phone" VARCHAR(64),
    "phone_alt" VARCHAR(64),
    "email" VARCHAR(255),
    "address" TEXT,
    "notes" TEXT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "listings" ADD COLUMN "seller_id" INTEGER;

CREATE INDEX "sellers_created_by_id_idx" ON "sellers"("created_by_id");
CREATE INDEX "sellers_phone_idx" ON "sellers"("phone");
CREATE INDEX "sellers_full_name_idx" ON "sellers"("full_name");
CREATE INDEX "listings_seller_id_idx" ON "listings"("seller_id");

ALTER TABLE "sellers"
    ADD CONSTRAINT "sellers_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sellers"
    ADD CONSTRAINT "sellers_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "listings"
    ADD CONSTRAINT "listings_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "sellers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "media_folders" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "is_trash" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- Only one system trash folder (root)
CREATE UNIQUE INDEX "media_folders_single_trash" ON "media_folders" ((1)) WHERE "is_trash" = true;

CREATE UNIQUE INDEX "media_folders_parent_id_name_key" ON "media_folders"("parent_id", "name");

ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "media_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "media_files" ADD COLUMN     "folder_id" INTEGER,
ADD COLUMN     "previous_folder_id" INTEGER;

ALTER TABLE "media_files" ADD CONSTRAINT "media_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "media_files" ADD CONSTRAINT "media_files_previous_folder_id_fkey" FOREIGN KEY ("previous_folder_id") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "media_files_folder_id_idx" ON "media_files"("folder_id");

ALTER TABLE "listing_apartments" ADD COLUMN     "finishing_photo_url" TEXT,
ADD COLUMN     "extra_photo_urls" JSONB;

INSERT INTO "media_folders" ("parent_id", "name", "is_trash") VALUES (NULL, 'Корзина', true);
INSERT INTO "media_folders" ("parent_id", "name", "is_trash") VALUES (NULL, 'Загрузки', false);

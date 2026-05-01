ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;

ALTER TABLE "user_collections" ADD COLUMN "share_token" TEXT;

CREATE UNIQUE INDEX "user_collections_share_token_key" ON "user_collections"("share_token");

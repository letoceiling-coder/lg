-- AlterTable
ALTER TABLE "requests" ADD COLUMN "user_id" UUID;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "requests_user_id_idx" ON "requests"("user_id");

-- Add donor/manual content fields to listings
ALTER TABLE "listings"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "source_url" TEXT;

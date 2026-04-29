-- Add infrastructure JSON column on blocks
ALTER TABLE "blocks" ADD COLUMN "infrastructure" JSONB;

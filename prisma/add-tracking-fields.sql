-- Add bot detection and deduplication fields to OpenEvent table
ALTER TABLE "OpenEvent"
ADD COLUMN IF NOT EXISTS "isBot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isUnique" BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster queries on unique opens
CREATE INDEX IF NOT EXISTS "OpenEvent_isUnique_idx" ON "OpenEvent"("isUnique");

-- Update existing records to mark them as potential bots (since they might be from Gmail proxies)
-- You can run this if you want to clean up existing data
-- UPDATE "OpenEvent" SET "isBot" = true WHERE "browser" = 'Unknown';

-- Create Reply table and ensure Project.signature column exists
-- Run this SQL in your Supabase SQL Editor

-- 1. Ensure Project.signature column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'Project'
        AND column_name = 'signature'
    ) THEN
        ALTER TABLE "Project" ADD COLUMN "signature" TEXT;
    END IF;
END $$;

-- 2. Create Reply table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Reply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "textContent" TEXT,
    "htmlContent" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resendId" TEXT,

    CONSTRAINT "Reply_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "Reply_subscriberId_fkey" FOREIGN KEY ("subscriberId")
        REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3. Create indexes for Reply table
CREATE INDEX IF NOT EXISTS "Reply_campaignId_idx" ON "Reply"("campaignId");
CREATE INDEX IF NOT EXISTS "Reply_subscriberId_idx" ON "Reply"("subscriberId");
CREATE INDEX IF NOT EXISTS "Reply_receivedAt_idx" ON "Reply"("receivedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Reply_resendId_key" ON "Reply"("resendId");

-- 4. Verify tables exist
SELECT 'Reply table created successfully' as status
WHERE EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'Reply'
);

SELECT 'Project.signature column exists' as status
WHERE EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'Project'
    AND column_name = 'signature'
);

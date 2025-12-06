-- Create Template table
CREATE TABLE IF NOT EXISTS "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "subject" TEXT,
    "projectId" TEXT NOT NULL,
    "resendTemplateId" TEXT UNIQUE,
    "variables" JSONB,
    "signature" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Template_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Template_projectId_idx" ON "Template"("projectId");
CREATE INDEX IF NOT EXISTS "Template_status_idx" ON "Template"("status");

-- Add templateId column to Campaign table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'Campaign'
        AND column_name = 'templateId'
    ) THEN
        ALTER TABLE "Campaign" ADD COLUMN "templateId" TEXT;
        ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey"
            FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE SET NULL;
        CREATE INDEX "Campaign_templateId_idx" ON "Campaign"("templateId");
    END IF;
END $$;

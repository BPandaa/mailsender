-- Add signature column to Project table
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

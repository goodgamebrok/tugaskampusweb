-- Add folder column to scripts table (optional grouping)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scripts' AND column_name = 'folder'
  ) THEN
    ALTER TABLE "scripts" ADD COLUMN "folder" text;
  END IF;
END $$;

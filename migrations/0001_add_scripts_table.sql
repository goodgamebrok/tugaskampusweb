-- Add missing discord_id column to keys table (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'discord_id'
  ) THEN
    ALTER TABLE "keys" ADD COLUMN "discord_id" text;
  END IF;
END $$;
--> statement-breakpoint

-- Create scripts table (if not exists)
CREATE TABLE IF NOT EXISTS "scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scripts_name_unique" UNIQUE("name")
);

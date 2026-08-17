-- Create trial_devices table
CREATE TABLE IF NOT EXISTS "trial_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"hwid" text NOT NULL,
	"first_used_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"is_active" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "trial_devices_hwid_unique" UNIQUE("hwid")
);

DO $$ BEGIN
    CREATE TYPE "public"."key_status" AS ENUM('unused', 'available', 'sold', 'active', 'expired', 'blacklisted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."order_status" AS ENUM('pending', 'waiting_verification', 'paid', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."showcase_type" AS ENUM('free', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_support" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_name" text NOT NULL,
	"logo_url" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_code" varchar(19) NOT NULL,
	"duration_months" integer NOT NULL,
	"duration_days" integer,
	"price" numeric(10, 2) NOT NULL,
	"status" "key_status" DEFAULT 'available' NOT NULL,
	"package_id" integer,
	"user_id" uuid,
	"order_id" uuid,
	"hwid" text,
	"hwid_reset_at" timestamp,
	"hwid_reset_count" integer DEFAULT 0 NOT NULL,
	"source" text,
	"roblox_username" text,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"loader_script" text,
	"notes" text,
	CONSTRAINT "keys_key_code_unique" UNIQUE("key_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"key_id" integer,
	"details" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_provider" text,
	"payment_order_id" text,
	"payment_link_code" text,
	"payment_link_url" text,
	"payment_qr_string" text,
	"payment_original_amount" integer,
	"payment_total_amount" integer,
	"payment_unique_nominal" integer,
	"payment_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(6) NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"original_price" numeric(12, 2),
	"feature_1" text,
	"feature_2" text,
	"feature_3" text,
	"feature_4" text,
	"buy_link" text,
	"image_url" text,
	"is_popular" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showcase" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_name" text NOT NULL,
	"game_name" text NOT NULL,
	"type" "showcase_type" NOT NULL,
	"youtube_url" text,
	"feature_1_icon" text,
	"feature_1_text" text NOT NULL,
	"feature_2_icon" text,
	"feature_2_text" text NOT NULL,
	"feature_3_icon" text,
	"feature_3_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"button_label" text,
	"button_url" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"tip_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"photo_url" text NOT NULL,
	"accent" text DEFAULT 'primary' NOT NULL,
	"description" text,
	"instagram" text,
	"linkedin" text,
	"github" text,
	"twitter" text,
	"skill_1" text,
	"skill_2" text,
	"skill_3" text,
	"skill_4" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_email_verified" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"last_warning_at" timestamp,
	"is_banned" integer DEFAULT 0 NOT NULL,
	"banned_at" timestamp,
	"ban_reason" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "keys" ADD CONSTRAINT "keys_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "keys" ADD CONSTRAINT "keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "keys" ADD CONSTRAINT "keys_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "logs" ADD CONSTRAINT "logs_key_id_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
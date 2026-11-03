CREATE TABLE "member_accounts" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"lol_id" text DEFAULT '' NOT NULL,
	"steam_id" text DEFAULT '' NOT NULL,
	"pubg_id" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_accounts_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);

--> statement-breakpoint
-- Supabase REST API 차단 (0004_enable_rls.sql 참고)
ALTER TABLE "member_accounts" ENABLE ROW LEVEL SECURITY;

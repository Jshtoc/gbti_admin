CREATE TABLE "stats_excluded_members" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stats_excluded_members_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
-- Supabase REST API 차단 (0004_enable_rls.sql 참고)
ALTER TABLE "stats_excluded_members" ENABLE ROW LEVEL SECURITY;

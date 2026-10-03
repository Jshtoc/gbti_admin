CREATE TABLE "activity_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"activity_name" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "members" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_counts_daily" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "message_counts_daily_guild_id_user_id_channel_id_day_pk" PRIMARY KEY("guild_id","user_id","channel_id","day")
);
--> statement-breakpoint
CREATE TABLE "presence_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "voice_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "activity_sessions_user_started_idx" ON "activity_sessions" USING btree ("guild_id","user_id","started_at");--> statement-breakpoint
CREATE INDEX "message_counts_daily_guild_day_idx" ON "message_counts_daily" USING btree ("guild_id","day");--> statement-breakpoint
CREATE INDEX "presence_sessions_user_started_idx" ON "presence_sessions" USING btree ("guild_id","user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "presence_sessions_one_open_per_user" ON "presence_sessions" USING btree ("guild_id","user_id") WHERE "presence_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "voice_sessions_guild_started_idx" ON "voice_sessions" USING btree ("guild_id","started_at");--> statement-breakpoint
CREATE INDEX "voice_sessions_channel_started_idx" ON "voice_sessions" USING btree ("guild_id","channel_id","started_at");--> statement-breakpoint
CREATE INDEX "voice_sessions_user_started_idx" ON "voice_sessions" USING btree ("guild_id","user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_sessions_one_open_per_user" ON "voice_sessions" USING btree ("guild_id","user_id") WHERE "voice_sessions"."ended_at" is null;
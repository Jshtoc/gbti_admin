CREATE TABLE "voice_mute_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "voice_mute_sessions_user_started_idx" ON "voice_mute_sessions" USING btree ("guild_id","user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_mute_sessions_one_open_per_user" ON "voice_mute_sessions" USING btree ("guild_id","user_id") WHERE "voice_mute_sessions"."ended_at" is null;
--> statement-breakpoint
ALTER TABLE "voice_mute_sessions" ENABLE ROW LEVEL SECURITY;

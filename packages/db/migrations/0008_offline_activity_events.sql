CREATE TABLE "offline_activity_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"channel_name" text,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "offline_activity_events_user_idx" ON "offline_activity_events" USING btree ("guild_id","user_id","occurred_at");
--> statement-breakpoint
ALTER TABLE "offline_activity_events" ENABLE ROW LEVEL SECURITY;

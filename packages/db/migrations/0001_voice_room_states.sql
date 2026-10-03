CREATE TABLE "voice_room_states" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"category_kind" text NOT NULL,
	"category_label" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "voice_room_states_channel_started_idx" ON "voice_room_states" USING btree ("guild_id","channel_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_room_states_one_open_per_channel" ON "voice_room_states" USING btree ("guild_id","channel_id") WHERE "voice_room_states"."ended_at" is null;
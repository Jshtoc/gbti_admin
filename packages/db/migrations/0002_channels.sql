CREATE TABLE "channels" (
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"parent_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_guild_id_channel_id_pk" PRIMARY KEY("guild_id","channel_id")
);

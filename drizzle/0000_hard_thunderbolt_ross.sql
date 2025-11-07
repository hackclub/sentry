CREATE TABLE "allowed_threads_to_speak" (
	"thread_ts" text NOT NULL,
	"channel_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "allowed_threads_to_speak_thread_ts_channel_id_pk" PRIMARY KEY("thread_ts","channel_id")
);
--> statement-breakpoint
CREATE TABLE "message_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"message_ts" text NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"queued_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"status" text NOT NULL,
	"retry_count" text DEFAULT '0' NOT NULL,
	"error_message" text,
	"is_thread" boolean DEFAULT false NOT NULL,
	"thread_ts" text
);
--> statement-breakpoint
CREATE TABLE "whitelisted_channels" (
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "whitelisted_channels_channel_id_pk" PRIMARY KEY("channel_id")
);
--> statement-breakpoint
CREATE TABLE "whitelisted_users" (
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "whitelisted_users_user_id_pk" PRIMARY KEY("user_id")
);

ALTER TABLE "feed_follows" ADD COLUMN "last_fetched_at" timestamp;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_fetched_at" timestamp;
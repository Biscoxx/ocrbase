CREATE TABLE "api_key_usage_daily" (
	"api_key_id" text NOT NULL,
	"day" date NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"jobs_count" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "api_key_usage_daily_api_key_id_day_pk" PRIMARY KEY("api_key_id","day")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"job_id" text NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"model" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_events_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "api_key_id" text;--> statement-breakpoint
ALTER TABLE "api_key_usage_daily" ADD CONSTRAINT "api_key_usage_daily_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_usage_daily_api_key_id_idx" ON "api_key_usage_daily" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "usage_events_api_key_id_idx" ON "usage_events" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "usage_events_created_at_idx" ON "usage_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_api_key_id_idx" ON "jobs" USING btree ("api_key_id");
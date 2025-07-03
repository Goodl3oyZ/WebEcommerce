CREATE TABLE IF NOT EXISTS "shipping_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipping_zone_id" integer,
	"shipping_method_id" integer,
	"min_weight" numeric(10, 2),
	"max_weight" numeric(10, 2),
	"rate" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("shipping_zone_id") REFERENCES "shipping_zones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_shipping_method_id_shipping_methods_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

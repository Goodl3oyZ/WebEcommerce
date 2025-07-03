ALTER TABLE "shipping_methods" ADD COLUMN "shipping_zone_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("shipping_zone_id") REFERENCES "shipping_zones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE shipping_methods ADD CONSTRAINT shipping_methods_code_zone_unique UNIQUE (code, shipping_zone_id);

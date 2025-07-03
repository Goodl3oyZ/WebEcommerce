CREATE TABLE IF NOT EXISTS "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10),
	"province_id" uuid,
	"name_th" varchar(100) NOT NULL,
	"name_en" varchar(100),
	CONSTRAINT "districts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10),
	"name_th" varchar(100) NOT NULL,
	"name_en" varchar(100),
	CONSTRAINT "provinces_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subdistricts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10),
	"district_id" uuid,
	"province_id" uuid,
	"name_th" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"zipcode" varchar(10),
	CONSTRAINT "subdistricts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "shipping_zone_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addresses" ADD CONSTRAINT "addresses_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("shipping_zone_id") REFERENCES "shipping_zones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subdistricts" ADD CONSTRAINT "subdistricts_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subdistricts" ADD CONSTRAINT "subdistricts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

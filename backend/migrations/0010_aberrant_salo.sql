ALTER TABLE "districts" DROP CONSTRAINT "districts_code_unique";--> statement-breakpoint
ALTER TABLE "subdistricts" DROP CONSTRAINT "subdistricts_code_unique";--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_code_unique" UNIQUE("province_id","code");--> statement-breakpoint
ALTER TABLE "subdistricts" ADD CONSTRAINT "subdistricts_district_id_code_unique" UNIQUE("district_id","code");
ALTER TABLE "addresses" ALTER COLUMN "city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "phone_number" varchar(20);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "province" varchar(100);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "subdistrict" varchar(100);
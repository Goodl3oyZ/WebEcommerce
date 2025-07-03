ALTER TABLE "products" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "date_of_birth";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "gender";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "address";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "city";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "state";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "country";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "postal_code";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "bio";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "social_links";
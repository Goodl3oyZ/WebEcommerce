DROP INDEX IF EXISTS "products_stock_idx";--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "price" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "stock";
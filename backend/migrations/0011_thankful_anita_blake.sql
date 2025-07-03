ALTER TABLE "orders" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "carrier" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_delivery" timestamp;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "timestamp" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "refund_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "refund_reason" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "shipping_history" ADD COLUMN "shipment_id" uuid;--> statement-breakpoint
ALTER TABLE "shipping_history" ADD COLUMN "timestamp" timestamp DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipping_history" ADD CONSTRAINT "shipping_history_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

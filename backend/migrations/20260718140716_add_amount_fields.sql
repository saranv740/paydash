-- Modify "upload_batches" table
ALTER TABLE "public"."upload_batches" ADD COLUMN "total_orders_count" integer NOT NULL, ADD COLUMN "total_orders_amount" text NOT NULL, ADD COLUMN "total_payments_count" integer NOT NULL, ADD COLUMN "total_payment_amount" text NOT NULL, ADD COLUMN "reconciled_amount" text NOT NULL, ADD COLUMN "dispute_amount" text NOT NULL;

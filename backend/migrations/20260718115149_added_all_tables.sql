-- Create enum type "discrepancy_type"
CREATE TYPE "public"."discrepancy_type" AS ENUM ('UNPAID_ORDER', 'ORPHAN_PAYMENT', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CANCELLED_ORDER_SETTLED', 'AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'DUPLICATE_CHARGE', 'MISSING_PROCESSED_AT', 'DUPLICATE_ORDER_ENTRY');
-- Create enum type "resolution_type"
CREATE TYPE "public"."resolution_type" AS ENUM ('RESOLVED', 'UNRESOLVED', 'IGNORED');
-- Create "orders" table
CREATE TABLE "public"."orders" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "owner_id" uuid NOT NULL,
  "batch_id" uuid NOT NULL,
  "order_id" text NOT NULL,
  "order_date" timestamptz NULL,
  "customer_email" text NULL,
  "currency" text NOT NULL,
  "gross_amount" text NOT NULL,
  "discount" text NULL,
  "net_amount" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "payments" table
CREATE TABLE "public"."payments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "owner_id" uuid NOT NULL,
  "batch_id" uuid NOT NULL,
  "transaction_ref" text NOT NULL,
  "processed_at" timestamptz NULL,
  "order_id" text NULL,
  "currency" text NOT NULL,
  "amount" text NOT NULL,
  "fee" text NOT NULL,
  "net_settled" text NOT NULL,
  "type" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "recon_results" table
CREATE TABLE "public"."recon_results" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "owner_id" uuid NOT NULL,
  "batch_id" uuid NOT NULL,
  "order_id" uuid NULL,
  "payment_id" uuid NULL,
  "type" "public"."discrepancy_type" NOT NULL,
  "amount_at_risk" text NOT NULL,
  "explanation" text NOT NULL,
  "resolution" "public"."resolution_type" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);

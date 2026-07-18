-- Rename a column from "total_payment_amount" to "total_payments_amount"
ALTER TABLE "public"."upload_batches" RENAME COLUMN "total_payment_amount" TO "total_payments_amount";

-- Modify "orders" table
ALTER TABLE "public"."orders" ALTER COLUMN "owner_id" TYPE text;
-- Modify "payments" table
ALTER TABLE "public"."payments" ALTER COLUMN "owner_id" TYPE text;
-- Modify "recon_results" table
ALTER TABLE "public"."recon_results" ALTER COLUMN "owner_id" TYPE text;
-- Modify "upload_batches" table
ALTER TABLE "public"."upload_batches" ALTER COLUMN "owner_id" TYPE text;

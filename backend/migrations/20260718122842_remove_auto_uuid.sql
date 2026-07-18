-- Modify "recon_results" table
ALTER TABLE "public"."recon_results" ALTER COLUMN "id" DROP DEFAULT;
-- Modify "upload_batches" table
ALTER TABLE "public"."upload_batches" ALTER COLUMN "id" DROP DEFAULT;

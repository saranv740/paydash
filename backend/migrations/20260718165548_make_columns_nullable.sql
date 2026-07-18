-- Modify "orders" table
ALTER TABLE "public"."orders" ALTER COLUMN "currency" DROP NOT NULL, ALTER COLUMN "gross_amount" DROP NOT NULL, ALTER COLUMN "net_amount" DROP NOT NULL, ALTER COLUMN "status" DROP NOT NULL;
-- Modify "payments" table
ALTER TABLE "public"."payments" ALTER COLUMN "currency" DROP NOT NULL, ALTER COLUMN "amount" DROP NOT NULL, ALTER COLUMN "fee" DROP NOT NULL, ALTER COLUMN "net_settled" DROP NOT NULL, ALTER COLUMN "type" DROP NOT NULL, ALTER COLUMN "status" DROP NOT NULL;
-- Modify "recon_results" table
ALTER TABLE "public"."recon_results" ALTER COLUMN "explanation" DROP NOT NULL;

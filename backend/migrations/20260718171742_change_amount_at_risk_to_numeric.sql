-- Modify "recon_results" table
ALTER TABLE "public"."recon_results" ALTER COLUMN "amount_at_risk" TYPE numeric(12,2) USING "amount_at_risk"::numeric(12,2);

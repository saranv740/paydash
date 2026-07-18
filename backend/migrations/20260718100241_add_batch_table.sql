-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'Public schema';
-- Create "upload_batches" table
CREATE TABLE "public"."upload_batches" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "owner_id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

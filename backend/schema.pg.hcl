schema "public" {
  comment = "Public schema"
}

table "upload_batches" {
  schema = schema.public

  column "id" {
    type    = uuid
    null    = false
    default = sql("uuidv7()")
  }

  column "owner_id" {
    type = uuid
    null = false
  }

  column "name" {
    type = text
    null = false
  }

  column "created_at" {
    type    = timestamptz
    null    = false
    default = sql("now()")
  }

  column "updated_at" {
    type    = timestamptz
    null    = false
    default = sql("now()")
  }

  primary_key {
    columns = [column.id]
  }
}
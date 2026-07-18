schema "public" {
  comment = "Public schema"
}

enum "discrepancy_type" {
  schema = schema.public
  values = [
    "UNPAID_ORDER",
    "ORPHAN_PAYMENT",
    "PAYMENT_PENDING",
    "PAYMENT_FAILED",
    "CANCELLED_ORDER_SETTLED",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH",
    "DUPLICATE_CHARGE",
    "MISSING_PROCESSED_AT",
    "DUPLICATE_ORDER_ENTRY"
  ]
}

enum "resolution_type" {
  schema = schema.public
  values = [
    "RESOLVED",
    "UNRESOLVED",
    "IGNORED"
  ]
}

table "upload_batches" {
  schema = schema.public

  column "id" {
    type = uuid
    null = false
  }

  column "owner_id" {
    type = text
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

  column "total_orders_count" {
    type = integer
    null = false
  }

  column "total_orders_amount" {
    type = text
    null = false
  }

  column "total_payments_count" {
    type = integer
    null = false
  }

  column "total_payments_amount" {
    type = text
    null = false
  }

  column "reconciled_amount" {
    type = text
    null = false
  }

  column "dispute_amount" {
    type = text
    null = false
  }

  primary_key {
    columns = [column.id]
  }
}

table "orders" {
  schema = schema.public
  column "id" {
    type    = uuid
    null    = false
    default = sql("uuidv7()")
  }

  column "owner_id" {
    type = text
    null = false
  }

  column "batch_id" {
    type = uuid
    null = false
  }

  column "order_id" {
    type = text
    null = false
  }

  column "order_date" {
    type = timestamptz
    null = true
  }

  column "customer_email" {
    type = text
    null = true
  }

  column "currency" {
    type = text
    null = true
  }

  column "gross_amount" {
    type = text
    null = true
  }

  column "discount" {
    type = text
    null = true
  }

  column "net_amount" {
    type = text
    null = true
  }

  column "status" {
    type = text
    null = true
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

  foreign_key "batch_id_fk" {
    columns     = [column.batch_id]
    ref_columns = [table.upload_batches.column.id]
    on_delete   = CASCADE
    on_update   = CASCADE
  }
}

table "payments" {
  schema = schema.public
  column "id" {
    type    = uuid
    null    = false
    default = sql("uuidv7()")
  }

  column "owner_id" {
    type = text
    null = false
  }

  column "batch_id" {
    type = uuid
    null = false
  }

  column "transaction_ref" {
    type = text
    null = false
  }

  column "processed_at" {
    type = timestamptz
    null = true
  }

  column "order_id" {
    type = text
    null = true
  }

  column "currency" {
    type = text
    null = true
  }

  column "amount" {
    type = text
    null = true
  }

  column "fee" {
    type = text
    null = true
  }

  column "net_settled" {
    type = text
    null = true
  }

  column "type" {
    type = text
    null = true
  }

  column "status" {
    type = text
    null = true
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

  foreign_key "batch_id_fk" {
    columns     = [column.batch_id]
    ref_columns = [table.upload_batches.column.id]
    on_delete   = CASCADE
    on_update   = CASCADE
  }
}

table "recon_results" {
  schema = schema.public
  column "id" {
    type = uuid
    null = false
  }

  column "owner_id" {
    type = text
    null = false
  }

  column "batch_id" {
    type = uuid
    null = false
  }

  column "order_id" {
    type = uuid
    null = true
  }

  column "payment_id" {
    type = uuid
    null = true
  }

  column "type" {
    type = enum.discrepancy_type
    null = false
  }

  column "amount_at_risk" {
    type = numeric(12, 2)
    null = false
  }

  column "explanation" {
    type = text
    null = true
  }

  column "resolution" {
    type = enum.resolution_type
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

  foreign_key "batch_id_fk" {
    columns     = [column.batch_id]
    ref_columns = [table.upload_batches.column.id]
    on_delete   = CASCADE
    on_update   = CASCADE
  }

  foreign_key "order_id_fk" {
    columns     = [column.order_id]
    ref_columns = [table.orders.column.id]
    on_delete   = CASCADE
    on_update   = CASCADE
  }

  foreign_key "payment_id_fk" {
    columns     = [column.payment_id]
    ref_columns = [table.payments.column.id]
    on_delete   = CASCADE
    on_update   = CASCADE
  }
}
package models

import (
	"time"
)

// UploadBatch represents a single reconciliation upload run
type UploadBatch struct {
	ID                 string    `json:"id" db:"id"`
	OwnerID            string    `json:"owner_id" db:"owner_id"`
	Name               string    `json:"name" db:"name"`
	TotalOrdersCount   int       `json:"total_orders_count" db:"total_orders_count"`
	TotalOrdersAmount  string    `json:"total_orders_amount" db:"total_orders_amount"`
	TotalPaymentsCount int       `json:"total_payments_count" db:"total_payments_count"`
	TotalPaymentAmount string    `json:"total_payments_amount" db:"total_payments_amount"`
	ReconciledAmount   string    `json:"reconciled_amount" db:"reconciled_amount"`
	DisputeAmount      string    `json:"dispute_amount" db:"dispute_amount"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

package models

import (
	"time"
)

// Payment represents a single raw payment row from payments.csv
type Payment struct {
	ID             string     `json:"id" db:"id"`
	OwnerID        string     `json:"owner_id" db:"owner_id"`
	BatchID        string     `json:"batch_id" db:"batch_id"`
	TransactionRef string     `json:"transaction_ref" db:"transaction_ref"`
	ProcessedAt    *time.Time `json:"processed_at" db:"processed_at"`
	OrderID        *string    `json:"order_id" db:"order_id"` // order_reference in CSV
	Currency       *string    `json:"currency" db:"currency"`
	Amount         *string    `json:"amount" db:"amount"`
	Fee            *string    `json:"fee" db:"fee"`
	NetSettled     *string    `json:"net_settled" db:"net_settled"`
	Type           *string    `json:"type" db:"type"`
	Status         *string    `json:"status" db:"status"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

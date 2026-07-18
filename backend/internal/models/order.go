package models

import (
	"time"
)

// Order represents a single raw order row from orders.csv
type Order struct {
	ID            string     `json:"id" db:"id"`
	OwnerID       string     `json:"owner_id" db:"owner_id"`
	BatchID       string     `json:"batch_id" db:"batch_id"`
	OrderID       string     `json:"order_id" db:"order_id"`
	OrderDate     *time.Time `json:"order_date" db:"order_date"`
	CustomerEmail *string    `json:"customer_email" db:"customer_email"`
	Currency      *string    `json:"currency" db:"currency"`
	GrossAmount   *string    `json:"gross_amount" db:"gross_amount"`
	Discount      *string    `json:"discount" db:"discount"`
	NetAmount     *string    `json:"net_amount" db:"net_amount"`
	Status        *string    `json:"status" db:"status"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

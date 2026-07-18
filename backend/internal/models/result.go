package models

import (
	"time"
)

// DiscrepancyType represents the classification of reconciliation issue
type DiscrepancyType string

const (
	UnpaidOrder           DiscrepancyType = "UNPAID_ORDER"
	OrphanPayment         DiscrepancyType = "ORPHAN_PAYMENT"
	PaymentPending        DiscrepancyType = "PAYMENT_PENDING"
	PaymentFailed         DiscrepancyType = "PAYMENT_FAILED"
	CancelledOrderSettled DiscrepancyType = "CANCELLED_ORDER_SETTLED"
	AmountMismatch        DiscrepancyType = "AMOUNT_MISMATCH"
	CurrencyMismatch      DiscrepancyType = "CURRENCY_MISMATCH"
	DuplicateCharge       DiscrepancyType = "DUPLICATE_CHARGE"
	MissingProcessedAt    DiscrepancyType = "MISSING_PROCESSED_AT"
	DuplicateOrderEntry   DiscrepancyType = "DUPLICATE_ORDER_ENTRY"
)

// ResolutionType represents resolution status of the discrepancy
type ResolutionType string

const (
	Resolved   ResolutionType = "RESOLVED"
	Unresolved ResolutionType = "UNRESOLVED"
	Ignored    ResolutionType = "IGNORED"
)

// ReconResult represents a single identified reconciliation discrepancy
type ReconResult struct {
	ID           string          `json:"id" db:"id"`
	OwnerID      string          `json:"owner_id" db:"owner_id"`
	BatchID      string          `json:"batch_id" db:"batch_id"`
	OrderID      *string         `json:"order_id" db:"order_id"`     // Foreign key uuid
	PaymentID    *string         `json:"payment_id" db:"payment_id"` // Foreign key uuid
	Type         DiscrepancyType `json:"type" db:"type"`
	AmountAtRisk string          `json:"amount_at_risk" db:"amount_at_risk"`
	Explanation  *string         `json:"explanation" db:"explanation"`
	Resolution   ResolutionType  `json:"resolution" db:"resolution"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

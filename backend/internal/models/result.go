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

// DiscrepancyDetail contains a discrepancy along with its optionally joined Order and Payment details
type DiscrepancyDetail struct {
	ID           string          `json:"id"`
	BatchID      string          `json:"batch_id"`
	Type         DiscrepancyType `json:"type"`
	AmountAtRisk string          `json:"amount_at_risk"`
	Explanation  *string         `json:"explanation"`
	Resolution   ResolutionType  `json:"resolution"`
	CreatedAt    time.Time       `json:"created_at"`
	Order        *Order          `json:"order,omitempty"`
	Payment      *Payment        `json:"payment,omitempty"`
}

// DiscrepancyBreakdown represents aggregated risk count and amounts grouped by discrepancy type
type DiscrepancyBreakdown struct {
	Type                  DiscrepancyType `json:"type"`
	Count                 int             `json:"count"`
	TotalAmountAtRisk     string          `json:"total_amount_at_risk"`
	PercentageOfTotalRisk float64         `json:"percentage_of_total_risk"`
}

// ReportFilterParams contains filter and pagination settings for fetching a batch report
type ReportFilterParams struct {
	BatchID         string
	OwnerID         string
	Page            int
	PageSize        int
	Search          string
	DiscrepancyType string
	Resolution      string
	MinAmount       *float64
	MaxAmount       *float64
	SortBy          string
	SortOrder       string
}

// PaginationMeta contains metadata about pagination state
type PaginationMeta struct {
	CurrentPage  int `json:"current_page"`
	PageSize     int `json:"page_size"`
	TotalRecords int `json:"total_records"`
	TotalPages   int `json:"total_pages"`
}

// BatchReportResponse represents the full report output payload
type BatchReportResponse struct {
	Batch         *UploadBatch           `json:"batch"`
	Breakdown     []DiscrepancyBreakdown `json:"breakdown"`
	Discrepancies []DiscrepancyDetail    `json:"discrepancies"`
	Pagination    PaginationMeta         `json:"pagination"`
}

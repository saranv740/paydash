package models

import (
	"time"
)

// UploadBatch represents a single reconciliation upload run
type UploadBatch struct {
	ID        string    `json:"id" db:"id"`
	OwnerID   string    `json:"owner_id" db:"owner_id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

package store

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/saranv740/paydash/internal/db"
	"github.com/saranv740/paydash/internal/models"
)

type Store struct {
	db *db.DBC
}

func New(db *db.DBC) *Store {
	return &Store{
		db: db,
	}
}

// SaveReconciliationRun saves the upload batch metadata, raw orders, raw payments, and discrepancies in a single database transaction.
func (s *Store) SaveReconciliationRun(
	ctx context.Context,
	batch *models.UploadBatch,
	orders []models.Order,
	payments []models.Payment,
	discrepancies []models.ReconResult,
) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Insert upload batch metadata
	queryBatch := `
		INSERT INTO upload_batches (
			id, owner_id, name, 
			total_orders_count, total_orders_amount, 
			total_payments_count, total_payments_amount, 
			reconciled_amount, dispute_amount, 
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err = tx.Exec(
		ctx,
		queryBatch,
		batch.ID,
		batch.OwnerID,
		batch.Name,
		batch.TotalOrdersCount,
		batch.TotalOrdersAmount,
		batch.TotalPaymentsCount,
		batch.TotalPaymentAmount,
		batch.ReconciledAmount,
		batch.DisputeAmount,
		batch.CreatedAt,
		batch.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// 2. Bulk insert raw orders
	if len(orders) > 0 {
		orderColumns := []string{
			"id", "owner_id", "batch_id", "order_id", "order_date",
			"customer_email", "currency", "gross_amount", "discount",
			"net_amount", "status", "created_at", "updated_at",
		}
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"orders"},
			orderColumns,
			pgx.CopyFromSlice(len(orders), func(i int) ([]any, error) {
				o := orders[i]
				return []any{
					o.ID, o.OwnerID, o.BatchID, o.OrderID, o.OrderDate,
					o.CustomerEmail, o.Currency, o.GrossAmount, o.Discount,
					o.NetAmount, o.Status, o.CreatedAt, o.UpdatedAt,
				}, nil
			}),
		)
		if err != nil {
			return err
		}
	}

	// 3. Bulk insert raw payments
	if len(payments) > 0 {
		paymentColumns := []string{
			"id", "owner_id", "batch_id", "transaction_ref", "processed_at",
			"order_id", "currency", "amount", "fee", "net_settled",
			"type", "status", "created_at", "updated_at",
		}
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"payments"},
			paymentColumns,
			pgx.CopyFromSlice(len(payments), func(i int) ([]any, error) {
				p := payments[i]
				return []any{
					p.ID, p.OwnerID, p.BatchID, p.TransactionRef, p.ProcessedAt,
					p.OrderID, p.Currency, p.Amount, p.Fee, p.NetSettled,
					p.Type, p.Status, p.CreatedAt, p.UpdatedAt,
				}, nil
			}),
		)
		if err != nil {
			return err
		}
	}

	// 4. Bulk insert reconciliation results (discrepancies)
	if len(discrepancies) > 0 {
		reconColumns := []string{
			"id", "owner_id", "batch_id", "order_id", "payment_id",
			"type", "amount_at_risk", "explanation", "resolution",
		}
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"recon_results"},
			reconColumns,
			pgx.CopyFromSlice(len(discrepancies), func(i int) ([]any, error) {
				r := discrepancies[i]
				return []any{
					r.ID, r.OwnerID, r.BatchID, r.OrderID, r.PaymentID,
					r.Type, r.AmountAtRisk, r.Explanation, r.Resolution,
				}, nil
			}),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

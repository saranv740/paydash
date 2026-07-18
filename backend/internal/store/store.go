package store

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/saranv740/paydash/internal/db"
	"github.com/saranv740/paydash/internal/models"
)

var ErrBatchNotFound = errors.New("reconciliation batch not found")
var ErrDiscrepancyNotFound = errors.New("discrepancy result not found")


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

// ListUploadBatches retrieves all upload batches belonging to a specific owner, ordered by creation date descending.
func (s *Store) ListUploadBatches(ctx context.Context, ownerID string) ([]models.UploadBatch, error) {
	query := `
		SELECT id, owner_id, name,
		       total_orders_count, total_orders_amount,
		       total_payments_count, total_payments_amount,
		       reconciled_amount, dispute_amount,
		       created_at, updated_at
		FROM upload_batches
		WHERE owner_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	batches := make([]models.UploadBatch, 0)
	for rows.Next() {
		var b models.UploadBatch
		err := rows.Scan(
			&b.ID,
			&b.OwnerID,
			&b.Name,
			&b.TotalOrdersCount,
			&b.TotalOrdersAmount,
			&b.TotalPaymentsCount,
			&b.TotalPaymentAmount,
			&b.ReconciledAmount,
			&b.DisputeAmount,
			&b.CreatedAt,
			&b.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		batches = append(batches, b)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return batches, nil
}

// GetBatchReport fetches a reconciliation batch report with filtered breakdown, paginated discrepancies, and joined details
func (s *Store) GetBatchReport(ctx context.Context, params models.ReportFilterParams) (*models.BatchReportResponse, error) {
	// 1. Fetch Batch Metadata
	queryBatch := `
		SELECT id, owner_id, name,
		       total_orders_count, total_orders_amount,
		       total_payments_count, total_payments_amount,
		       reconciled_amount, dispute_amount,
		       created_at, updated_at
		FROM upload_batches
		WHERE id = $1 AND owner_id = $2
	`
	var batch models.UploadBatch
	err := s.db.QueryRow(ctx, queryBatch, params.BatchID, params.OwnerID).Scan(
		&batch.ID,
		&batch.OwnerID,
		&batch.Name,
		&batch.TotalOrdersCount,
		&batch.TotalOrdersAmount,
		&batch.TotalPaymentsCount,
		&batch.TotalPaymentAmount,
		&batch.ReconciledAmount,
		&batch.DisputeAmount,
		&batch.CreatedAt,
		&batch.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBatchNotFound
		}
		return nil, fmt.Errorf("failed to fetch batch: %w", err)
	}

	// 2. Build Filter Conditions & Arguments
	whereConditions := []string{"recon_results.batch_id = $1", "recon_results.owner_id = $2"}
	args := []any{params.BatchID, params.OwnerID}

	if params.Resolution != "" {
		args = append(args, params.Resolution)
		whereConditions = append(whereConditions, fmt.Sprintf("recon_results.resolution = $%d", len(args)))
	}

	if params.DiscrepancyType != "" {
		rawTypes := strings.Split(params.DiscrepancyType, ",")
		cleanedTypes := make([]string, 0, len(rawTypes))
		for _, t := range rawTypes {
			t = strings.TrimSpace(t)
			if t != "" {
				cleanedTypes = append(cleanedTypes, t)
			}
		}
		if len(cleanedTypes) == 1 {
			args = append(args, cleanedTypes[0])
			whereConditions = append(whereConditions, fmt.Sprintf("recon_results.type = $%d", len(args)))
		} else if len(cleanedTypes) > 1 {
			args = append(args, cleanedTypes)
			whereConditions = append(whereConditions, fmt.Sprintf("recon_results.type = ANY($%d)", len(args)))
		}
	}

	if params.MinAmount != nil {
		args = append(args, *params.MinAmount)
		whereConditions = append(whereConditions, fmt.Sprintf("recon_results.amount_at_risk >= $%d", len(args)))
	}

	if params.MaxAmount != nil {
		args = append(args, *params.MaxAmount)
		whereConditions = append(whereConditions, fmt.Sprintf("recon_results.amount_at_risk <= $%d", len(args)))
	}

	if strings.TrimSpace(params.Search) != "" {
		searchTerm := "%" + strings.TrimSpace(params.Search) + "%"
		args = append(args, searchTerm)
		paramIdx := len(args)
		whereConditions = append(whereConditions, fmt.Sprintf(
			"(orders.order_id ILIKE $%d OR payments.transaction_ref ILIKE $%d OR orders.customer_email ILIKE $%d)",
			paramIdx, paramIdx, paramIdx,
		))
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// 3. Query Breakdown (Aggregated grouped by discrepancy type reflecting filters)
	queryBreakdown := fmt.Sprintf(`
		SELECT recon_results.type,
		       COUNT(*) as count,
		       COALESCE(SUM(recon_results.amount_at_risk), 0) as total_amount
		FROM recon_results
		LEFT JOIN orders ON recon_results.order_id = orders.id
		LEFT JOIN payments ON recon_results.payment_id = payments.id
		WHERE %s
		GROUP BY recon_results.type
		ORDER BY total_amount DESC
	`, whereClause)

	rowsBreakdown, err := s.db.Query(ctx, queryBreakdown, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query breakdown: %w", err)
	}
	defer rowsBreakdown.Close()

	breakdownList := make([]models.DiscrepancyBreakdown, 0)
	var grandTotalRisk float64
	type tempBreakdown struct {
		disType models.DiscrepancyType
		count   int
		total   float64
	}
	var rawBreakdowns []tempBreakdown

	for rowsBreakdown.Next() {
		var tb tempBreakdown
		if err := rowsBreakdown.Scan(&tb.disType, &tb.count, &tb.total); err != nil {
			return nil, fmt.Errorf("failed to scan breakdown row: %w", err)
		}
		grandTotalRisk += tb.total
		rawBreakdowns = append(rawBreakdowns, tb)
	}
	if err := rowsBreakdown.Err(); err != nil {
		return nil, fmt.Errorf("breakdown iteration error: %w", err)
	}

	for _, tb := range rawBreakdowns {
		pct := 0.0
		if grandTotalRisk > 0 {
			pct = math.Round((tb.total/grandTotalRisk)*10000) / 100
		}
		breakdownList = append(breakdownList, models.DiscrepancyBreakdown{
			Type:                  tb.disType,
			Count:                 tb.count,
			TotalAmountAtRisk:     fmt.Sprintf("%.2f", tb.total),
			PercentageOfTotalRisk: pct,
		})
	}

	// 4. Total Filtered Records Count for Pagination
	queryCount := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM recon_results
		LEFT JOIN orders ON recon_results.order_id = orders.id
		LEFT JOIN payments ON recon_results.payment_id = payments.id
		WHERE %s
	`, whereClause)

	var totalRecords int
	if err := s.db.QueryRow(ctx, queryCount, args...).Scan(&totalRecords); err != nil {
		return nil, fmt.Errorf("failed to count matching discrepancies: %w", err)
	}

	// 5. Pagination & Sorting Setup
	page := params.Page
	if page <= 0 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	totalPages := int(math.Ceil(float64(totalRecords) / float64(pageSize)))
	if totalPages == 0 {
		totalPages = 1
	}
	offset := (page - 1) * pageSize

	// Sanitize Sort Column
	sortCol := "recon_results.amount_at_risk"
	switch strings.ToLower(params.SortBy) {
	case "type":
		sortCol = "recon_results.type"
	case "created_at":
		sortCol = "recon_results.created_at"
	case "resolution":
		sortCol = "recon_results.resolution"
	}

	sortDir := "DESC"
	if strings.ToLower(params.SortOrder) == "asc" {
		sortDir = "ASC"
	}

	// 6. Query Paginated Discrepancies with Joined Details
	queryDiscrepancies := fmt.Sprintf(`
		SELECT recon_results.id, recon_results.batch_id, recon_results.type, recon_results.amount_at_risk, recon_results.explanation, recon_results.resolution, recon_results.created_at,
		       orders.id, orders.owner_id, orders.batch_id, orders.order_id, orders.order_date, orders.customer_email, orders.currency, orders.gross_amount, orders.discount, orders.net_amount, orders.status, orders.created_at, orders.updated_at,
		       payments.id, payments.owner_id, payments.batch_id, payments.transaction_ref, payments.processed_at, payments.order_id, payments.currency, payments.amount, payments.fee, payments.net_settled, payments.type, payments.status, payments.created_at, payments.updated_at
		FROM recon_results
		LEFT JOIN orders ON recon_results.order_id = orders.id
		LEFT JOIN payments ON recon_results.payment_id = payments.id
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortCol, sortDir, len(args)+1, len(args)+2)

	queryArgs := append([]any{}, args...)
	queryArgs = append(queryArgs, pageSize, offset)

	rowsDiscrepancies, err := s.db.Query(ctx, queryDiscrepancies, queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to query discrepancies: %w", err)
	}
	defer rowsDiscrepancies.Close()

	discrepanciesList := make([]models.DiscrepancyDetail, 0)
	for rowsDiscrepancies.Next() {
		var detail models.DiscrepancyDetail
		var (
			oID, oOwnerID, oBatchID, oOrderID *string
			oOrderDate                        *time.Time
			oEmail, oCurr, oGross, oDisc      *string
			oNet, oStatus                     *string
			oCreatedAt, oUpdatedAt            *time.Time

			pID, pOwnerID, pBatchID, pTxnRef *string
			pProcessedAt                     *time.Time
			pOrderID, pCurr, pAmt, pFee      *string
			pNetSettled, pType, pStatus      *string
			pCreatedAt, pUpdatedAt           *time.Time
		)

		err := rowsDiscrepancies.Scan(
			&detail.ID, &detail.BatchID, &detail.Type, &detail.AmountAtRisk, &detail.Explanation, &detail.Resolution, &detail.CreatedAt,
			&oID, &oOwnerID, &oBatchID, &oOrderID, &oOrderDate, &oEmail, &oCurr, &oGross, &oDisc, &oNet, &oStatus, &oCreatedAt, &oUpdatedAt,
			&pID, &pOwnerID, &pBatchID, &pTxnRef, &pProcessedAt, &pOrderID, &pCurr, &pAmt, &pFee, &pNetSettled, &pType, &pStatus, &pCreatedAt, &pUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan discrepancy row: %w", err)
		}

		if oID != nil {
			detail.Order = &models.Order{
				ID:            *oID,
				OwnerID:       *oOwnerID,
				BatchID:       *oBatchID,
				OrderID:       *oOrderID,
				OrderDate:     oOrderDate,
				CustomerEmail: oEmail,
				Currency:      oCurr,
				GrossAmount:   oGross,
				Discount:      oDisc,
				NetAmount:     oNet,
				Status:        oStatus,
				CreatedAt:     *oCreatedAt,
				UpdatedAt:     *oUpdatedAt,
			}
		}

		if pID != nil {
			detail.Payment = &models.Payment{
				ID:             *pID,
				OwnerID:        *pOwnerID,
				BatchID:        *pBatchID,
				TransactionRef: *pTxnRef,
				ProcessedAt:    pProcessedAt,
				OrderID:        pOrderID,
				Currency:       pCurr,
				Amount:         pAmt,
				Fee:            pFee,
				NetSettled:     pNetSettled,
				Type:           pType,
				Status:         pStatus,
				CreatedAt:      *pCreatedAt,
				UpdatedAt:      *pUpdatedAt,
			}
		}

		discrepanciesList = append(discrepanciesList, detail)
	}

	if err := rowsDiscrepancies.Err(); err != nil {
		return nil, fmt.Errorf("discrepancies iteration error: %w", err)
	}

	return &models.BatchReportResponse{
		Batch:         &batch,
		Breakdown:     breakdownList,
		Discrepancies: discrepanciesList,
		Pagination: models.PaginationMeta{
			CurrentPage:  page,
			PageSize:     pageSize,
			TotalRecords: totalRecords,
			TotalPages:   totalPages,
		},
	}, nil
}

// UpdateBatchName updates the name of an upload batch belonging to an owner
func (s *Store) UpdateBatchName(ctx context.Context, ownerID, batchID, newName string) error {
	query := `
		UPDATE upload_batches
		SET name = $1, updated_at = NOW()
		WHERE id = $2 AND owner_id = $3
	`
	cmdTag, err := s.db.Exec(ctx, query, newName, batchID, ownerID)
	if err != nil {
		return fmt.Errorf("failed to update batch name: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrBatchNotFound
	}
	return nil
}

// UpdateDiscrepancyResolution updates the resolution status of a discrepancy
func (s *Store) UpdateDiscrepancyResolution(ctx context.Context, ownerID, discrepancyID string, resolution models.ResolutionType) error {
	query := `
		UPDATE recon_results
		SET resolution = $1, updated_at = NOW()
		WHERE id = $2 AND owner_id = $3
	`
	cmdTag, err := s.db.Exec(ctx, query, resolution, discrepancyID, ownerID)
	if err != nil {
		return fmt.Errorf("failed to update discrepancy resolution: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrDiscrepancyNotFound
	}
	return nil
}

// GetDiscrepancyDetail retrieves a single discrepancy along with its joined Order and Payment details
func (s *Store) GetDiscrepancyDetail(ctx context.Context, ownerID, discrepancyID string) (*models.DiscrepancyDetail, error) {
	query := `
		SELECT recon_results.id, recon_results.batch_id, recon_results.type, recon_results.amount_at_risk, recon_results.explanation, recon_results.resolution, recon_results.created_at,
		       orders.id, orders.owner_id, orders.batch_id, orders.order_id, orders.order_date, orders.customer_email, orders.currency, orders.gross_amount, orders.discount, orders.net_amount, orders.status, orders.created_at, orders.updated_at,
		       payments.id, payments.owner_id, payments.batch_id, payments.transaction_ref, payments.processed_at, payments.order_id, payments.currency, payments.amount, payments.fee, payments.net_settled, payments.type, payments.status, payments.created_at, payments.updated_at
		FROM recon_results
		LEFT JOIN orders ON recon_results.order_id = orders.id
		LEFT JOIN payments ON recon_results.payment_id = payments.id
		WHERE recon_results.id = $1 AND recon_results.owner_id = $2
	`

	var detail models.DiscrepancyDetail
	var (
		oID, oOwnerID, oBatchID, oOrderID *string
		oOrderDate                        *time.Time
		oEmail, oCurr, oGross, oDisc      *string
		oNet, oStatus                     *string
		oCreatedAt, oUpdatedAt            *time.Time

		pID, pOwnerID, pBatchID, pTxnRef *string
		pProcessedAt                     *time.Time
		pOrderID, pCurr, pAmt, pFee      *string
		pNetSettled, pType, pStatus      *string
		pCreatedAt, pUpdatedAt           *time.Time
	)

	err := s.db.QueryRow(ctx, query, discrepancyID, ownerID).Scan(
		&detail.ID, &detail.BatchID, &detail.Type, &detail.AmountAtRisk, &detail.Explanation, &detail.Resolution, &detail.CreatedAt,
		&oID, &oOwnerID, &oBatchID, &oOrderID, &oOrderDate, &oEmail, &oCurr, &oGross, &oDisc, &oNet, &oStatus, &oCreatedAt, &oUpdatedAt,
		&pID, &pOwnerID, &pBatchID, &pTxnRef, &pProcessedAt, &pOrderID, &pCurr, &pAmt, &pFee, &pNetSettled, &pType, &pStatus, &pCreatedAt, &pUpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDiscrepancyNotFound
		}
		return nil, fmt.Errorf("failed to fetch discrepancy detail: %w", err)
	}

	if oID != nil {
		detail.Order = &models.Order{
			ID:            *oID,
			OwnerID:       *oOwnerID,
			BatchID:       *oBatchID,
			OrderID:       *oOrderID,
			OrderDate:     oOrderDate,
			CustomerEmail: oEmail,
			Currency:      oCurr,
			GrossAmount:   oGross,
			Discount:      oDisc,
			NetAmount:     oNet,
			Status:        oStatus,
			CreatedAt:     *oCreatedAt,
			UpdatedAt:     *oUpdatedAt,
		}
	}

	if pID != nil {
		detail.Payment = &models.Payment{
			ID:             *pID,
			OwnerID:        *pOwnerID,
			BatchID:        *pBatchID,
			TransactionRef: *pTxnRef,
			ProcessedAt:    pProcessedAt,
			OrderID:        pOrderID,
			Currency:       pCurr,
			Amount:         pAmt,
			Fee:            pFee,
			NetSettled:     pNetSettled,
			Type:           pType,
			Status:         pStatus,
			CreatedAt:      *pCreatedAt,
			UpdatedAt:      *pUpdatedAt,
		}
	}

	return &detail, nil
}

// UpdateDiscrepancyExplanation saves the generated explanation JSON string in the database
func (s *Store) UpdateDiscrepancyExplanation(ctx context.Context, ownerID, discrepancyID string, explanation string) error {
	query := `
		UPDATE recon_results
		SET explanation = $1, updated_at = NOW()
		WHERE id = $2 AND owner_id = $3
	`
	cmdTag, err := s.db.Exec(ctx, query, explanation, discrepancyID, ownerID)
	if err != nil {
		return fmt.Errorf("failed to update discrepancy explanation: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrDiscrepancyNotFound
	}
	return nil
}

// DeleteUploadBatch deletes an upload batch belonging to an owner. DB CASCADE deletes associated orders, payments, and recon_results.
func (s *Store) DeleteUploadBatch(ctx context.Context, ownerID, batchID string) error {
	query := `
		DELETE FROM upload_batches
		WHERE id = $1 AND owner_id = $2
	`
	cmdTag, err := s.db.Exec(ctx, query, batchID, ownerID)
	if err != nil {
		return fmt.Errorf("failed to delete upload batch: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return ErrBatchNotFound
	}
	return nil
}




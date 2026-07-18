package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/saranv740/paydash/internal/analyzer"
	"github.com/saranv740/paydash/internal/llm"
	"github.com/saranv740/paydash/internal/models"
	"github.com/saranv740/paydash/internal/parser"
	"github.com/saranv740/paydash/internal/response"
	"github.com/saranv740/paydash/internal/store"
)

type Handler struct {
	logger *slog.Logger
	store  *store.Store
}

func New(l *slog.Logger, s *store.Store) *Handler {
	return &Handler{
		logger: l,
		store:  s,
	}
}

// UploadBatch handles uploading, parsing, discrepancy analyzing, and saving reconciliation datasets
func (h *Handler) UploadBatch(c *gin.Context) {
	// 1. Get owner/user ID from context
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	// Limit request body size to 20MB to prevent memory exhaustion
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 20<<20)

	// 2. Retrieve files
	ordersHeader, err := c.FormFile("orders")
	if err != nil {
		h.logger.Warn("Failed to retrieve orders file", "error", err)
		response.SendFail(c, http.StatusBadRequest, gin.H{"orders": "orders CSV file is required"})
		return
	}

	if !strings.HasSuffix(strings.ToLower(ordersHeader.Filename), ".csv") {
		h.logger.Warn("Orders file extension is not .csv", "filename", ordersHeader.Filename)
		response.SendFail(c, http.StatusBadRequest, gin.H{"orders": "orders file must be a CSV file"})
		return
	}

	paymentsHeader, err := c.FormFile("payments")
	if err != nil {
		h.logger.Warn("Failed to retrieve payments file", "error", err)
		response.SendFail(c, http.StatusBadRequest, gin.H{"payments": "payments CSV file is required"})
		return
	}

	if !strings.HasSuffix(strings.ToLower(paymentsHeader.Filename), ".csv") {
		h.logger.Warn("Payments file extension is not .csv", "filename", paymentsHeader.Filename)
		response.SendFail(c, http.StatusBadRequest, gin.H{"payments": "payments file must be a CSV file"})
		return
	}

	batchName := c.DefaultPostForm("name", "Reconciliation Run")
	batchID := uuid.New().String()

	// 3. Parse & Sanitize CSVs
	ordersFile, err := ordersHeader.Open()
	if err != nil {
		h.logger.Error("Failed to open orders file", "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to read orders file")
		return
	}
	defer ordersFile.Close()

	orders, err := parser.ParseOrders(ordersFile, ownerID, batchID)
	if err != nil {
		h.logger.Error("Orders CSV parsing failed", "error", err)
		response.SendFail(c, http.StatusBadRequest, gin.H{"orders": fmt.Sprintf("failed to parse orders CSV: %s", err.Error())})
		return
	}

	paymentsFile, err := paymentsHeader.Open()
	if err != nil {
		h.logger.Error("Failed to open payments file", "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to read payments file")
		return
	}
	defer paymentsFile.Close()

	payments, err := parser.ParsePayments(paymentsFile, ownerID, batchID)
	if err != nil {
		h.logger.Warn("Payments CSV parsing failed", "error", err)
		response.SendFail(c, http.StatusBadRequest, gin.H{"payments": fmt.Sprintf("failed to parse payments CSV: %s", err.Error())})
		return
	}

	// 4. Analyze Discrepancies using Mutually Exclusive Precedence Hierarchy
	reconResults := analyzer.FindDiscrepancies(ownerID, batchID, orders, payments)

	// 5. Compute complete upload batch metadata
	batch := computeBatchMetadata(ownerID, batchID, batchName, orders, payments, reconResults)

	// 6. Save to database inside a single transaction
	err = h.store.SaveReconciliationRun(c.Request.Context(), batch, orders, payments, reconResults)
	if err != nil {
		h.logger.Error("Failed to persist reconciliation run to DB", "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to save reconciliation data")
		return
	}

	h.logger.Info("Discrepancy analysis completed and saved to DB",
		"owner_id", ownerID,
		"batch_id", batchID,
		"orders_count", len(orders),
		"payments_count", len(payments),
		"discrepancies_found", len(reconResults),
	)

	response.SendSuccess(c, http.StatusOK, gin.H{
		"batch":               batch,
		"discrepancies_count": len(reconResults),
	})
}

// ListBatches handles fetching all reconciliation upload runs for the authenticated user
func (h *Handler) ListBatches(c *gin.Context) {
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	batches, err := h.store.ListUploadBatches(c.Request.Context(), ownerID)
	if err != nil {
		h.logger.Error("Failed to list upload batches", "owner_id", ownerID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to retrieve reconciliation batches")
		return
	}

	response.SendSuccess(c, http.StatusOK, gin.H{
		"batches": batches,
		"total":   len(batches),
	})
}

// GetBatchReport retrieves the full reconciliation report for a given batch ID
func (h *Handler) GetBatchReport(c *gin.Context) {
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	batchID := c.Param("id")
	if batchID == "" {
		response.SendFail(c, http.StatusBadRequest, gin.H{"id": "batch ID is required"})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	discrepancyType := c.Query("discrepancy_type")
	resolution := c.Query("resolution")
	sortBy := c.Query("sort_by")
	sortOrder := c.Query("sort_order")

	var minAmount *float64
	if minStr := c.Query("min_amount"); minStr != "" {
		if val, err := strconv.ParseFloat(minStr, 64); err == nil {
			minAmount = &val
		}
	}

	var maxAmount *float64
	if maxStr := c.Query("max_amount"); maxStr != "" {
		if val, err := strconv.ParseFloat(maxStr, 64); err == nil {
			maxAmount = &val
		}
	}

	params := models.ReportFilterParams{
		BatchID:         batchID,
		OwnerID:         ownerID,
		Page:            page,
		PageSize:        pageSize,
		Search:          search,
		DiscrepancyType: discrepancyType,
		Resolution:      resolution,
		MinAmount:       minAmount,
		MaxAmount:       maxAmount,
		SortBy:          sortBy,
		SortOrder:       sortOrder,
	}

	report, err := h.store.GetBatchReport(c.Request.Context(), params)
	if err != nil {
		if errors.Is(err, store.ErrBatchNotFound) {
			response.SendError(c, http.StatusNotFound, "reconciliation batch not found")
			return
		}
		h.logger.Error("Failed to fetch batch report", "batch_id", batchID, "owner_id", ownerID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to generate batch report")
		return
	}

	response.SendSuccess(c, http.StatusOK, report)
}

type updateBatchNameRequest struct {
	Name string `json:"name" binding:"required"`
}

// UpdateBatchName handles updating the display name of an upload batch
func (h *Handler) UpdateBatchName(c *gin.Context) {
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	batchID := c.Param("id")
	if batchID == "" {
		response.SendFail(c, http.StatusBadRequest, gin.H{"id": "batch ID is required"})
		return
	}

	var req updateBatchNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.SendFail(c, http.StatusBadRequest, gin.H{"name": "batch name is required"})
		return
	}

	newName := strings.TrimSpace(req.Name)
	if newName == "" {
		response.SendFail(c, http.StatusBadRequest, gin.H{"name": "batch name cannot be empty"})
		return
	}

	err := h.store.UpdateBatchName(c.Request.Context(), ownerID, batchID, newName)
	if err != nil {
		if errors.Is(err, store.ErrBatchNotFound) {
			response.SendError(c, http.StatusNotFound, "reconciliation batch not found")
			return
		}
		h.logger.Error("Failed to update batch name", "batch_id", batchID, "owner_id", ownerID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to update batch name")
		return
	}

	response.SendSuccess(c, http.StatusOK, gin.H{
		"id":   batchID,
		"name": newName,
	})
}

type updateResolutionRequest struct {
	Resolution models.ResolutionType `json:"resolution" binding:"required"`
}

// UpdateDiscrepancyResolution handles changing the resolution state of a discrepancy
func (h *Handler) UpdateDiscrepancyResolution(c *gin.Context) {
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	discrepancyID := c.Param("id")
	if discrepancyID == "" {
		response.SendFail(c, http.StatusBadRequest, gin.H{"id": "discrepancy ID is required"})
		return
	}

	var req updateResolutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.SendFail(c, http.StatusBadRequest, gin.H{"resolution": "resolution state is required"})
		return
	}

	switch req.Resolution {
	case models.Resolved, models.Unresolved, models.Ignored:
		// Valid resolution type
	default:
		response.SendFail(c, http.StatusBadRequest, gin.H{"resolution": "invalid resolution value, must be RESOLVED, UNRESOLVED, or IGNORED"})
		return
	}

	err := h.store.UpdateDiscrepancyResolution(c.Request.Context(), ownerID, discrepancyID, req.Resolution)
	if err != nil {
		if errors.Is(err, store.ErrDiscrepancyNotFound) {
			response.SendError(c, http.StatusNotFound, "discrepancy not found")
			return
		}
		h.logger.Error("Failed to update discrepancy resolution", "discrepancy_id", discrepancyID, "owner_id", ownerID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to update discrepancy resolution")
		return
	}

	response.SendSuccess(c, http.StatusOK, gin.H{
		"id":         discrepancyID,
		"resolution": req.Resolution,
	})
}

// Helper to compute summary KPI metadata for UploadBatch
func computeBatchMetadata(ownerID, batchID, batchName string, orders []models.Order, payments []models.Payment, discrepancies []models.ReconResult) *models.UploadBatch {
	now := time.Now()
	var totalOrdersAmt float64
	for _, o := range orders {
		totalOrdersAmt += parser.ParseFloat(o.NetAmount)
	}

	var totalPaymentsAmt float64
	for _, p := range payments {
		totalPaymentsAmt += parser.ParseFloat(p.Amount)
	}

	var disputeAmt float64
	for _, d := range discrepancies {
		disputeAmt += parser.ParseFloat(&d.AmountAtRisk)
	}

	reconciledAmt := totalOrdersAmt - disputeAmt
	if reconciledAmt < 0 {
		reconciledAmt = 0
	}

	return &models.UploadBatch{
		ID:                 batchID,
		OwnerID:            ownerID,
		Name:               batchName,
		TotalOrdersCount:   len(orders),
		TotalOrdersAmount:  fmt.Sprintf("%.2f", totalOrdersAmt),
		TotalPaymentsCount: len(payments),
		TotalPaymentAmount: fmt.Sprintf("%.2f", totalPaymentsAmt),
		ReconciledAmount:   fmt.Sprintf("%.2f", reconciledAmt),
		DisputeAmount:      fmt.Sprintf("%.2f", disputeAmt),
		CreatedAt:          now,
		UpdatedAt:          now,
	}
}

// ExplainDiscrepancy retrieves a single discrepancy and asks the LLM for a structured explanation.
// It caches the explanation in the database to avoid redundant API requests.
func (h *Handler) ExplainDiscrepancy(c *gin.Context) {
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	discrepancyID := c.Param("id")
	if discrepancyID == "" {
		response.SendFail(c, http.StatusBadRequest, gin.H{"id": "discrepancy ID is required"})
		return
	}

	// 1. Fetch discrepancy details (includes Order + Payment)
	detail, err := h.store.GetDiscrepancyDetail(c.Request.Context(), ownerID, discrepancyID)
	if err != nil {
		if errors.Is(err, store.ErrDiscrepancyNotFound) {
			response.SendError(c, http.StatusNotFound, "discrepancy not found")
			return
		}
		h.logger.Error("Failed to fetch discrepancy detail", "discrepancy_id", discrepancyID, "owner_id", ownerID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to retrieve discrepancy details")
		return
	}

	// 2. Cache Hit: If explanation is already present in DB, parse and return it immediately
	if detail.Explanation != nil && *detail.Explanation != "" {
		var cachedExpl llm.Explanation

		err := json.Unmarshal([]byte(*detail.Explanation), &cachedExpl)
		if err != nil {
			h.logger.Warn("Failed to unmarshal cached explanation from DB; querying LLM for fresh explanation", "discrepancy_id", discrepancyID)
			response.SendError(c, http.StatusInternalServerError, "Something went wrong while retrieving explanation")
			return
		}
		response.SendSuccess(c, http.StatusOK, cachedExpl)
		return
	}

	// 3. Cache Miss: Call LLM with the context-rich detail
	expl, err := llm.Explain(c.Request.Context(), detail)
	if err != nil {
		h.logger.Error("LLM explanation generation failed", "discrepancy_id", discrepancyID, "error", err)
		response.SendError(c, http.StatusServiceUnavailable, "AI explanation provider is temporarily unavailable. Please try again later.")
		return
	}

	// 4. Save explanation JSON back to DB to cache it
	explBytes, err := json.Marshal(expl)
	if err != nil {
		h.logger.Error("Failed to marshal LLM explanation for caching", "discrepancy_id", discrepancyID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "Something went wrong")
		return
	}

	err = h.store.UpdateDiscrepancyExplanation(c.Request.Context(), ownerID, discrepancyID, string(explBytes))
	if err != nil {
		h.logger.Error("Failed to cache LLM explanation to DB", "discrepancy_id", discrepancyID, "error", err)
	}

	response.SendSuccess(c, http.StatusOK, expl)
}

// DeleteBatch handles deleting an upload batch and all its cascaded records
func (h *Handler) DeleteBatch(c *gin.Context) {
	ownerID := c.GetString("userID")
	if ownerID == "" {
		h.logger.Warn("User ID missing from request context")
		response.SendError(c, http.StatusUnauthorized, "User authentication required")
		return
	}

	batchID := c.Param("id")
	if batchID == "" {
		response.SendFail(c, http.StatusBadRequest, gin.H{"id": "batch ID is required"})
		return
	}

	err := h.store.DeleteUploadBatch(c.Request.Context(), ownerID, batchID)
	if err != nil {
		if errors.Is(err, store.ErrBatchNotFound) {
			response.SendError(c, http.StatusNotFound, "reconciliation batch not found")
			return
		}
		h.logger.Error("Failed to delete upload batch", "batch_id", batchID, "owner_id", ownerID, "error", err)
		response.SendError(c, http.StatusInternalServerError, "failed to delete upload batch")
		return
	}

	response.SendSuccess(c, http.StatusOK, gin.H{
		"id":      batchID,
		"message": "upload batch deleted successfully",
	})
}

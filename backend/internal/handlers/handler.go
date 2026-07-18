package handlers

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/saranv740/paydash/internal/analyzer"
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

	// 2. Retrieve files
	ordersHeader, err := c.FormFile("orders")
	if err != nil {
		h.logger.Warn("Failed to retrieve orders file", "error", err)
		response.SendFail(c, http.StatusBadRequest, gin.H{"orders": "orders CSV file is required"})
		return
	}

	paymentsHeader, err := c.FormFile("payments")
	if err != nil {
		h.logger.Warn("Failed to retrieve payments file", "error", err)
		response.SendFail(c, http.StatusBadRequest, gin.H{"payments": "payments CSV file is required"})
		return
	}

	batchName := c.DefaultPostForm("name", "Reconciliation Run")
	batchID := uuid.New().String()

	// 3. Step 1: Parse & Sanitize CSVs
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

	// 4. Step 2: Analyze Discrepancies using Mutually Exclusive Precedence Hierarchy
	reconResults := analyzer.FindDiscrepancies(ownerID, batchID, orders, payments)

	h.logger.Info("Discrepancy analysis completed",
		"owner_id", ownerID,
		"batch_id", batchID,
		"orders_count", len(orders),
		"payments_count", len(payments),
		"discrepancies_found", len(reconResults),
	)

	response.SendSuccess(c, http.StatusOK, gin.H{
		"batch_id":            batchID,
		"batch_name":          batchName,
		"orders_count":        len(orders),
		"payments_count":      len(payments),
		"discrepancies_count": len(reconResults),
		"discrepancies":       reconResults,
	})
}

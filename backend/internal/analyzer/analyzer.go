package analyzer

import (
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/saranv740/paydash/internal/models"
	"github.com/saranv740/paydash/internal/parser"
)

// FindDiscrepancies performs pure comparison logic following a strict precedence hierarchy
func FindDiscrepancies(ownerID, batchID string, orders []models.Order, payments []models.Payment) []models.ReconResult {
	var results []models.ReconResult

	// 1. Index payments by order_reference
	paymentMap := make(map[string][]models.Payment)
	for _, p := range payments {
		ref := getString(p.OrderID)
		paymentMap[ref] = append(paymentMap[ref], p)
	}

	// 2. Evaluate orders against indexed payments
	seenOrders := make(map[string]bool)
	matchedPaymentIDs := make(map[string]bool)

	for _, order := range orders {
		dbOrderID := order.ID
		businessID := order.OrderID

		// Data Warning: Duplicate order entry in CSV
		if seenOrders[businessID] {
			results = append(
				results,
				createDiscrepancy(ownerID, batchID, &dbOrderID, nil, models.DuplicateOrderEntry, fmt.Sprintf("%.2f", parser.ParseFloat(order.NetAmount))),
			)
			continue
		}
		seenOrders[businessID] = true

		matchedPayments := paymentMap[businessID]

		// Rule 1: UNPAID_ORDER (Missing link)
		if len(matchedPayments) == 0 {
			results = append(
				results,
				createDiscrepancy(ownerID, batchID, &dbOrderID, nil, models.UnpaidOrder, fmt.Sprintf("%.2f", parser.ParseFloat(order.NetAmount))),
			)
			continue
		}

		// Track matched payment IDs and check for missing processed_at warning only on matched payments
		for _, p := range matchedPayments {
			matchedPaymentIDs[p.ID] = true
			if p.ProcessedAt == nil {
				pID := p.ID
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.MissingProcessedAt, "0.00"),
				)
			}
		}

		// Separate "charge" transactions from "refund"
		var charges []models.Payment
		for _, p := range matchedPayments {
			paymentType := getString(p.Type)
			if paymentType == "charge" || paymentType == "" {
				charges = append(charges, p)
			}
		}

		// Rule 2: DUPLICATE_CHARGE
		if len(charges) > 1 {
			for i := 1; i < len(charges); i++ {
				pID := charges[i].ID
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.DuplicateCharge, fmt.Sprintf("%.2f", parser.ParseFloat(charges[i].Amount))),
				)
			}
			continue
		}

		// Evaluate primary order against primary charge payment
		if len(charges) > 0 {
			p := charges[0]
			pID := p.ID
			oStatus := getString(order.Status)
			pStatus := getString(p.Status)

			// Rule 3: PAYMENT_FAILED
			if oStatus == "completed" && pStatus == "failed" {
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.PaymentFailed, fmt.Sprintf("%.2f", parser.ParseFloat(order.NetAmount))),
				)
				continue
			}

			// Rule 4: CANCELLED_ORDER_SETTLED
			if oStatus == "cancelled" && pStatus == "settled" {
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.CancelledOrderSettled, fmt.Sprintf("%.2f", parser.ParseFloat(p.Amount))),
				)
				continue
			}

			// Rule 5: CURRENCY_MISMATCH
			oCurr := getString(order.Currency)
			pCurr := getString(p.Currency)
			if oCurr != "" && pCurr != "" && oCurr != pCurr {
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.CurrencyMismatch, fmt.Sprintf("%.2f", parser.ParseFloat(p.Amount))),
				)
				continue
			}

			// Rule 6: AMOUNT_MISMATCH
			oNet := parser.ParseFloat(order.NetAmount)
			pAmt := parser.ParseFloat(p.Amount)
			diff := math.Abs(oNet - pAmt)
			if diff > 0.01 {
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.AmountMismatch, fmt.Sprintf("%.2f", diff)),
				)
				continue
			}

			// Rule 7: PAYMENT_PENDING
			if oStatus == "completed" && pStatus == "pending" {
				results = append(
					results,
					createDiscrepancy(ownerID, batchID, &dbOrderID, &pID, models.PaymentPending, fmt.Sprintf("%.2f", pAmt)),
				)
				continue
			}
		}
	}

	// 3. Rule 8: ORPHAN_PAYMENT
	for _, p := range payments {
		if !matchedPaymentIDs[p.ID] {
			pID := p.ID
			results = append(
				results,
				createDiscrepancy(ownerID, batchID, nil, &pID, models.OrphanPayment, fmt.Sprintf("%.2f", parser.ParseFloat(p.Amount))),
			)
		}
	}

	return results
}

// Helpers
func getString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// createDiscrepancy constructs a models.ReconResult with generated UUID and default UNRESOLVED status
func createDiscrepancy(ownerID string, batchID string, orderID *string, paymentID *string, discType models.DiscrepancyType, riskAmount string) models.ReconResult {
	defaultResolution := models.Unresolved
	defaultExplanation := ""

	return models.ReconResult{
		ID:           uuid.New().String(),
		OwnerID:      ownerID,
		BatchID:      batchID,
		OrderID:      orderID,
		PaymentID:    paymentID,
		Type:         discType,
		AmountAtRisk: riskAmount,
		Resolution:   defaultResolution,
		Explanation:  &defaultExplanation,
	}
}

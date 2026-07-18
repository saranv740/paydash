package parser

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/saranv740/paydash/internal/models"
)

func parseDate(dateStr string, layout string, fallbackLayout string) *time.Time {
	if dateStr == "" {
		return nil
	}

	parsed, err := time.Parse(layout, dateStr)
	if err != nil {
		parsed, err = time.Parse(fallbackLayout, dateStr)

		if err != nil {
			return nil
		}
	}

	return &parsed
}

// ParseOrders parses the orders CSV reader and performs complete data sanitization
func ParseOrders(r io.Reader, ownerID, batchID string) ([]models.Order, error) {
	reader := csv.NewReader(r)

	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read orders headers: %w", err)
	}

	headerMap := make(map[string]int)
	for i, hName := range headers {
		headerMap[strings.TrimSpace(strings.ToLower(hName))] = i
	}

	requiredHeaders := []string{"order_id", "order_date", "customer_email", "currency", "gross_amount", "discount", "net_amount", "status"}
	for _, req := range requiredHeaders {
		if _, exists := headerMap[req]; !exists {
			return nil, fmt.Errorf("missing required column: %s", req)
		}
	}

	var orders []models.Order
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV row: %w", err)
		}

		orderID := strings.ToUpper(strings.TrimSpace(record[headerMap["order_id"]]))
		if orderID == "" {
			continue
		}

		dateStr := strings.TrimSpace(record[headerMap["order_date"]])
		orderDate := parseDate(dateStr, "2006-01-02 15:04:05", "2006-01-02")

		email := strings.TrimSpace(record[headerMap["customer_email"]])
		var customerEmail *string
		if email != "" {
			customerEmail = &email
		}

		currency := strings.ToUpper(strings.TrimSpace(record[headerMap["currency"]]))
		var cur *string
		if currency != "" {
			cur = &currency
		}

		gross := strings.TrimSpace(record[headerMap["gross_amount"]])
		var grossAmount *string
		if gross != "" {
			grossAmount = &gross
		}

		disc := strings.TrimSpace(record[headerMap["discount"]])
		var discount *string
		if disc != "" {
			discount = &disc
		}

		net := strings.TrimSpace(record[headerMap["net_amount"]])
		var netAmount *string
		if net != "" {
			netAmount = &net
		}

		status := strings.ToLower(strings.TrimSpace(record[headerMap["status"]]))
		var stat *string
		if status != "" {
			stat = &status
		}

		orders = append(orders, models.Order{
			ID:            uuid.New().String(),
			OwnerID:       ownerID,
			BatchID:       batchID,
			OrderID:       orderID,
			OrderDate:     orderDate,
			CustomerEmail: customerEmail,
			Currency:      cur,
			GrossAmount:   grossAmount,
			Discount:      discount,
			NetAmount:     netAmount,
			Status:        stat,
		})
	}

	return orders, nil
}

// ParsePayments parses the payments CSV reader and performs complete data sanitization
func ParsePayments(r io.Reader, ownerID, batchID string) ([]models.Payment, error) {
	reader := csv.NewReader(r)

	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read payments headers: %w", err)
	}

	headerMap := make(map[string]int)
	for i, hName := range headers {
		headerMap[strings.TrimSpace(strings.ToLower(hName))] = i
	}

	requiredHeaders := []string{"transaction_ref", "processed_at", "order_reference", "currency", "amount", "fee", "net_settled", "type", "status"}
	for _, req := range requiredHeaders {
		if _, exists := headerMap[req]; !exists {
			return nil, fmt.Errorf("missing required column: %s", req)
		}
	}

	var payments []models.Payment
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV row: %w", err)
		}

		txRef := strings.TrimSpace(record[headerMap["transaction_ref"]])
		if txRef == "" {
			continue
		}

		dateStr := strings.TrimSpace(record[headerMap["processed_at"]])
		processedAt := parseDate(dateStr, "02/01/2006 15:04", "2006-01-02 15:04:05")

		orderRef := strings.ToUpper(strings.TrimSpace(record[headerMap["order_reference"]]))
		var orderID *string
		if orderRef != "" {
			orderID = &orderRef
		}

		currency := strings.ToUpper(strings.TrimSpace(record[headerMap["currency"]]))
		var cur *string
		if currency != "" {
			cur = &currency
		}

		amt := strings.TrimSpace(record[headerMap["amount"]])
		var amount *string
		if amt != "" {
			amount = &amt
		}

		feeVal := strings.TrimSpace(record[headerMap["fee"]])
		var fee *string
		if feeVal != "" {
			fee = &feeVal
		}

		settled := strings.TrimSpace(record[headerMap["net_settled"]])
		var netSettled *string
		if settled != "" {
			netSettled = &settled
		}

		tType := strings.ToLower(strings.TrimSpace(record[headerMap["type"]]))
		var txnType *string
		if tType != "" {
			txnType = &tType
		}

		status := strings.ToLower(strings.TrimSpace(record[headerMap["status"]]))
		var stat *string
		if status != "" {
			stat = &status
		}

		payments = append(payments, models.Payment{
			ID:             uuid.New().String(),
			OwnerID:        ownerID,
			BatchID:        batchID,
			TransactionRef: txRef,
			ProcessedAt:    processedAt,
			OrderID:        orderID,
			Currency:       cur,
			Amount:         amount,
			Fee:            fee,
			NetSettled:     netSettled,
			Type:           txnType,
			Status:         stat,
		})
	}

	return payments, nil
}

func ParseFloat(s *string) float64 {
	if s == nil || *s == "" {
		return 0.0
	}
	val, err := strconv.ParseFloat(*s, 64)
	if err != nil {
		return 0.0
	}
	return val
}

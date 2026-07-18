package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/saranv740/paydash/internal/app"
	"github.com/saranv740/paydash/internal/models"
)

var httpClient = &http.Client{
	Timeout: 20 * time.Second,
}

// Explanation represents the structured JSON output returned to the client
type Explanation struct {
	Summary            string   `json:"summary"`
	RootCause          string   `json:"root_cause"`
	BusinessImpact     string   `json:"business_impact"`
	RecommendedActions []string `json:"recommended_actions"`
}

// chatMessage represents a single message in the chat completions payload
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// responseFormat instructs the LLM to output valid JSON
type responseFormat struct {
	Type string `json:"type"`
}

// chatRequest represents the OpenAI chat completion payload
type chatRequest struct {
	Model          string          `json:"model"`
	Messages       []chatMessage   `json:"messages"`
	Temperature    float64         `json:"temperature"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

// chatChoice represents a completion choice in the response payload
type chatChoice struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

// chatResponse represents the OpenAI chat completion response
type chatResponse struct {
	Choices []chatChoice `json:"choices"`
}

// Explain analyzes a discrepancy and returns a structured explanation using the configured LLM provider.
func Explain(ctx context.Context, detail *models.DiscrepancyDetail) (*Explanation, error) {
	cfg := app.GetLLMConfig()
	if cfg.APIKey == "" {
		return nil, errors.New("LLM_API_KEY environment variable is not set")
	}

	baseURL := strings.TrimSuffix(cfg.BaseURL, "/")

	// 1. Build context-rich prompt
	systemPrompt := `You are an expert financial reconciliation assistant. 
Your job is to analyze a discrepancy between an order record and a payment record, and provide a clear, plain-language explanation.
You must return your response as a raw JSON object with the following schema:
{
  "summary": "1-2 sentence description of the discrepancy",
  "root_cause": "Plain-language explanation of what likely happened (e.g. duplicate charge, partial refund, currency conversion difference, unpaid checkout)",
  "business_impact": "Financial and operational risk/impact to the merchant",
  "recommended_actions": [
    "Step-by-step action 1 for operations team",
    "Step-by-step action 2 for operations team"
  ]
}
Return ONLY the JSON object. Do not explain your output or surround it with markdown unless required.`

	userPrompt := buildUserPrompt(detail)

	reqPayload := chatRequest{
		Model: cfg.Model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature:    cfg.Temperature,
		ResponseFormat: &responseFormat{Type: "json_object"},
	}

	jsonBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal LLM request payload: %w", err)
	}

	// 2. Perform HTTP request with timeout context (15s)
	clientCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	url := fmt.Sprintf("%s/chat/completions", baseURL)
	req, err := http.NewRequestWithContext(clientCtx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.APIKey))

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to dispatch LLM request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("LLM provider returned status code %d: %s", resp.StatusCode, string(errBytes))
	}

	var chatResp chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("failed to decode LLM response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, errors.New("LLM response did not contain any choices")
	}

	rawResult := chatResp.Choices[0].Message.Content
	return parseAndCleanResponse(rawResult)
}

// buildUserPrompt formats all context details of the discrepancy into a readable description for the LLM
func buildUserPrompt(detail *models.DiscrepancyDetail) string {
	var sb strings.Builder

	fmt.Fprintf(&sb, "Discrepancy ID: %s\n", detail.ID)
	fmt.Fprintf(&sb, "Discrepancy Type: %s\n", detail.Type)
	fmt.Fprintf(&sb, "Amount At Risk: %s\n\n", detail.AmountAtRisk)

	if detail.Order != nil {
		sb.WriteString("=== ORDER RECORD ===\n")
		fmt.Fprintf(&sb, "Order ID: %s\n", detail.Order.OrderID)
		if detail.Order.OrderDate != nil {
			fmt.Fprintf(&sb, "Order Date: %s\n", detail.Order.OrderDate.Format(time.RFC3339))
		}
		if detail.Order.CustomerEmail != nil {
			fmt.Fprintf(&sb, "Customer Email: %s\n", *detail.Order.CustomerEmail)
		}
		if detail.Order.Currency != nil {
			fmt.Fprintf(&sb, "Currency: %s\n", *detail.Order.Currency)
		}
		if detail.Order.GrossAmount != nil {
			fmt.Fprintf(&sb, "Gross Amount: %s\n", *detail.Order.GrossAmount)
		}
		if detail.Order.Discount != nil {
			fmt.Fprintf(&sb, "Discount: %s\n", *detail.Order.Discount)
		}
		if detail.Order.NetAmount != nil {
			fmt.Fprintf(&sb, "Net Amount: %s\n", *detail.Order.NetAmount)
		}
		if detail.Order.Status != nil {
			fmt.Fprintf(&sb, "Order Status: %s\n", *detail.Order.Status)
		}
		sb.WriteString("\n")
	} else {
		sb.WriteString("=== ORDER RECORD ===\nNo matching order was found in the store database.\n\n")
	}

	if detail.Payment != nil {
		sb.WriteString("=== PAYMENT RECORD ===\n")
		fmt.Fprintf(&sb, "Transaction Ref: %s\n", detail.Payment.TransactionRef)
		if detail.Payment.ProcessedAt != nil {
			fmt.Fprintf(&sb, "Processed At: %s\n", detail.Payment.ProcessedAt.Format(time.RFC3339))
		}
		if detail.Payment.OrderID != nil {
			fmt.Fprintf(&sb, "Associated Order ID: %s\n", *detail.Payment.OrderID)
		}
		if detail.Payment.Currency != nil {
			fmt.Fprintf(&sb, "Currency: %s\n", *detail.Payment.Currency)
		}
		if detail.Payment.Amount != nil {
			fmt.Fprintf(&sb, "Payment Amount: %s\n", *detail.Payment.Amount)
		}
		if detail.Payment.Fee != nil {
			fmt.Fprintf(&sb, "Payment Fee: %s\n", *detail.Payment.Fee)
		}
		if detail.Payment.NetSettled != nil {
			fmt.Fprintf(&sb, "Net Settled: %s\n", *detail.Payment.NetSettled)
		}
		if detail.Payment.Type != nil {
			fmt.Fprintf(&sb, "Payment Type: %s\n", *detail.Payment.Type)
		}
		if detail.Payment.Status != nil {
			fmt.Fprintf(&sb, "Payment Status: %s\n", *detail.Payment.Status)
		}
		sb.WriteString("\n")
	} else {
		sb.WriteString("=== PAYMENT RECORD ===\nNo matching payment was found in the processor database.\n\n")
	}

	return sb.String()
}

// parseAndCleanResponse cleans typical markdown wrappers (e.g. ```json ... ```) and unmarshals into the Explanation struct
func parseAndCleanResponse(raw string) (*Explanation, error) {
	cleaned := strings.TrimSpace(raw)

	// Remove markdown codeblock bounds if present
	if strings.HasPrefix(cleaned, "```") {
		// Strip starting marker
		cleaned = strings.TrimPrefix(cleaned, "```json")
		cleaned = strings.TrimPrefix(cleaned, "```")
		// Strip ending marker
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
	}

	var expl Explanation
	if err := json.Unmarshal([]byte(cleaned), &expl); err != nil {
		// If unmarshalling failed, let's return a detailed parsing error
		return nil, fmt.Errorf("failed to parse LLM explanation JSON: %w (raw response: %q)", err, raw)
	}

	// Perform basic validations to verify the structure makes sense
	if expl.Summary == "" {
		expl.Summary = "Reconciliation discrepancy detected."
	}
	if expl.RootCause == "" {
		expl.RootCause = "The exact root cause could not be determined automatically."
	}
	if expl.BusinessImpact == "" {
		expl.BusinessImpact = "Potential risk of revenue leakage or customer experience issue."
	}
	if len(expl.RecommendedActions) == 0 {
		expl.RecommendedActions = []string{"Manually review order and payment logs in detail."}
	}

	return &expl, nil
}

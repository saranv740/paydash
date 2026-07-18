package app

import (
	"log/slog"
	"os"
	"strconv"

	"github.com/saranv740/paydash/internal/db"
)

type Config struct {
	Port    string
	DB      *db.DBC
	Version string
	Logger  *slog.Logger
}

type LLMConfig struct {
	APIKey      string
	BaseURL     string
	Model       string
	Temperature float64
}

// GetLLMConfig retrieves and sets default values for LLM configuration from environment variables
func GetLLMConfig() LLMConfig {
	baseURL := os.Getenv("LLM_BASE_URL")

	model := os.Getenv("LLM_MODEL")
	if model == "" {
		model = "llama-3.3-70b-versatile"
	}

	temp := 0.2
	if tempStr := os.Getenv("LLM_TEMPERATURE"); tempStr != "" {
		if val, err := strconv.ParseFloat(tempStr, 64); err == nil {
			temp = val
		}
	}

	return LLMConfig{
		APIKey:      os.Getenv("LLM_API_KEY"),
		BaseURL:     baseURL,
		Model:       model,
		Temperature: temp,
	}
}

// Environment() returns the ENV variable from OS environment
func Environment() string {
	return os.Getenv("ENV")
}

func AllowMockAuth() bool {
	return os.Getenv("ALLOW_MOCK_AUTH") == "true"
}

// IsProd() returns whether the server is running in production environment
func IsProd() bool {
	return os.Getenv("ENV") == "production"
}

// DBURL() returns the DB_URL variable from OS environment
func DBURL() string {
	return os.Getenv("DB_URL")
}

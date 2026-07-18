package app

import (
	"log/slog"
	"os"

	"github.com/saranv740/paydash/internal/db"
)

type Config struct {
	Port    string
	DB      *db.DBC
	Version string
	Logger  *slog.Logger
}

// Environment() returns the ENV variable from OS environment
func Environment() string {
	return os.Getenv("ENV")
}

// IsProd() returns whether the server is running in production environment
func IsProd() bool {
	return os.Getenv("ENV") == "production"
}

// DBURL() returns the DB_URL variable from OS environment
func DBURL() string {
	return os.Getenv("DB_URL")
}

// JWTSecret() returns the JWT_SECRET variable from OS environment
func JWTSecret() string {
	return os.Getenv("JWT_SECRET")
}

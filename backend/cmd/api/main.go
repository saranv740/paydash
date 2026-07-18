package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/joho/godotenv"
	"github.com/saranv740/paydash/internal/app"
	"github.com/saranv740/paydash/internal/db"
)

const version = "1.0.0"

func main() {
	var port int

	flag.IntVar(&port, "port", 3000, "port for the application to run")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	err := godotenv.Load()
	if err != nil {
		logger.Info(".env file not found")
	}

	if missing := getMissingEnvVars(); len(missing) > 0 {
		logger.Error("missing required env variables", "missing", missing)
		os.Exit(1)
	}

	clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))

	db, closeDB, err := db.OpenDB(app.DBURL())
	if err != nil {
		logger.Error(err.Error())
		logger.Info("error in connecting to db")
		os.Exit(1)
	}

	defer func() {
		err := closeDB()
		if err != nil {
			logger.Error("error in closing db", "message", err.Error())
		}
	}()

	config := &app.Config{
		Port:    fmt.Sprintf(":%d", port),
		DB:      db,
		Version: version,
		Logger:  logger,
	}

	srv := &http.Server{
		Addr:         config.Port,
		Handler:      router(config),
		IdleTimeout:  time.Minute,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	shutdownError := make(chan error)

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		s := <-quit

		logger.Info("shutting down server", "signal", s.String())

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		err := srv.Shutdown(ctx)
		if err != nil {
			shutdownError <- err
		}

		shutdownError <- nil
	}()

	logger.Info("starting server", "addr", port, "env", app.Environment())

	err = srv.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		logger.Error("error in starting the server", "message", err.Error())
		os.Exit(1)
	}

	err = <-shutdownError
	if err != nil {
		logger.Error("graceful shutdown failed", "message", err.Error())
		os.Exit(1)
	}

	logger.Info("server stopped gracefully", "addr", config.Port)
}

func getMissingEnvVars() []string {
	requiredEnv := []string{
		"DB_URL",
		"ENV",
		"CLERK_SECRET_KEY",
		"LLM_BASE_URL",
		"LLM_API_KEY",
	}

	var missing []string
	for _, env := range requiredEnv {
		if os.Getenv(env) == "" {
			missing = append(missing, env)
		}
	}

	return missing
}

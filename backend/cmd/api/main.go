package main

import (
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
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

	err := godotenv.Load()
	if err != nil {
		panic("error in loading dotenv file")
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	if ok := ensureEnvVars(); !ok {
		logger.Error("missing required env variables")
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

	logger.Info("starting server", "addr", port, "env", app.Environment())

	err = srv.ListenAndServe()
	if err != nil {
		logger.Error(err.Error())
		logger.Info("error in starting the server")
		os.Exit(1)
	}
}

func ensureEnvVars() bool {
	requiredEnv := []string{
		"DB_URL",
		"ENV",
		"CLERK_SECRET_KEY",
	}

	for _, env := range requiredEnv {
		if os.Getenv(env) == "" {
			return false
		}
	}

	return true
}

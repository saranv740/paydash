package db

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DBC = pgxpool.Pool

type DBCloseFunc func() error

func OpenDB(dsn string) (*DBC, DBCloseFunc, error) {
	noop := func() error { return nil }

	if dsn == "" {
		return nil, noop, errors.New("dsn not provided")
	}

	conn, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, noop, err
	}

	pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := conn.Ping(pingCtx); err != nil {
		conn.Close()
		return nil, noop, err
	}

	closeDB := func() error {
		conn.Close()
		return nil
	}

	return conn, closeDB, nil
}

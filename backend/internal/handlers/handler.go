package handlers

import (
	"log/slog"

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

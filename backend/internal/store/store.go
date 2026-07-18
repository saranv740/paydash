package store

import "github.com/saranv740/paydash/internal/db"

type Store struct {
	db *db.DBC
}

func New(db *db.DBC) *Store {
	return &Store{
		db: db,
	}
}

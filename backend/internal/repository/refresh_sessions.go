package repository

import (
	"context"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshSession struct {
	ID           int64
	UserID       int64
	RefreshToken string
	UserAgent    string
	Fingerprint  string
	ExpiresAt    time.Time
	CreatedAt    time.Time
}

type RefreshSessionsRepo struct {
	db *pgxpool.Pool
}

func NewRefreshSessionsRepo(db *pgxpool.Pool) *RefreshSessionsRepo {
	return &RefreshSessionsRepo{db: db}
}

func (r *RefreshSessionsRepo) CreateRefreshSession(ctx context.Context, s *RefreshSession) error {
	sql, args, err := QB.Insert("refresh_sessions").
		Columns("user_id", "refresh_token", "user_agent", "fingerprint", "expires_at").
		Values(s.UserID, s.RefreshToken, s.UserAgent, s.Fingerprint, s.ExpiresAt).
		Suffix("RETURNING id, created_at").
		ToSql()
	if err != nil {
		return err
	}
	return r.db.QueryRow(ctx, sql, args...).Scan(&s.ID, &s.CreatedAt)
}

func (r *RefreshSessionsRepo) GetRefreshSession(ctx context.Context, token string) (*RefreshSession, error) {
	sql, args, err := QB.Select("id", "user_id", "refresh_token", "user_agent", "fingerprint", "expires_at", "created_at").
		From("refresh_sessions").
		Where(sq.Eq{"refresh_token": token}).
		ToSql()
	if err != nil {
		return nil, err
	}

	var s RefreshSession
	err = r.db.QueryRow(ctx, sql, args...).Scan(
		&s.ID, &s.UserID, &s.RefreshToken, &s.UserAgent, &s.Fingerprint, &s.ExpiresAt, &s.CreatedAt,
	)
	return &s, err
}

func (r *RefreshSessionsRepo) DeleteRefreshSession(ctx context.Context, token string) error {
	sql, args, err := QB.Delete("refresh_sessions").
		Where(sq.Eq{"refresh_token": token}).
		ToSql()
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, sql, args...)
	return err
}

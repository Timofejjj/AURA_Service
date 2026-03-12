package database

import (
	"aura/internal/config"
	"aura/pkg/logger"
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewConnection(cfg *config.Config) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.DBSource)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}
	logger.Infow("Connecting to database",
		"host", poolConfig.ConnConfig.Host,
		"database", poolConfig.ConnConfig.Database,
		"max_connections", poolConfig.MaxConns,
	)
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Database connection established successfully")

	return pool, nil
}

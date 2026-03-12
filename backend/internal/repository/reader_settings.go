package repository

import (
	"aura/internal/models"
	"context"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReaderSettingsRepo struct {
	db *pgxpool.Pool
}

func NewReaderSettingsRepo(db *pgxpool.Pool) *ReaderSettingsRepo {
	return &ReaderSettingsRepo{db: db}
}

func (r *ReaderSettingsRepo) GetByUserID(ctx context.Context, userID int64) (*models.ReaderSettings, error) {
	sql, args, err := QB.Select(
		"user_id",
		"theme",
		"font_family",
		"font_size",
		"font_weight",
		"ligatures",
		"line_height",
		"text_align",
		"brightness",
		"transitions",
		"updated_at",
	).
		From("reader_settings").
		Where(sq.Eq{"user_id": userID}).
		ToSql()
	if err != nil {
		return nil, err
	}

	var s models.ReaderSettings
	if err := r.db.QueryRow(ctx, sql, args...).Scan(
		&s.UserID,
		&s.Theme,
		&s.FontFamily,
		&s.FontSize,
		&s.FontWeight,
		&s.Ligatures,
		&s.LineHeight,
		&s.TextAlign,
		&s.Brightness,
		&s.Transitions,
		&s.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ReaderSettingsRepo) Upsert(ctx context.Context, req *models.UpsertReaderSettingsReq) (*models.ReaderSettings, error) {
	sql := `
		INSERT INTO reader_settings
		  (user_id, theme, font_family, font_size, font_weight, ligatures, line_height, text_align, brightness, transitions, updated_at)
		VALUES
		  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)
		ON CONFLICT (user_id)
		DO UPDATE SET
		  theme = EXCLUDED.theme,
		  font_family = EXCLUDED.font_family,
		  font_size = EXCLUDED.font_size,
		  font_weight = EXCLUDED.font_weight,
		  ligatures = EXCLUDED.ligatures,
		  line_height = EXCLUDED.line_height,
		  text_align = EXCLUDED.text_align,
		  brightness = EXCLUDED.brightness,
		  transitions = EXCLUDED.transitions,
		  updated_at = CURRENT_TIMESTAMP
		RETURNING user_id, theme, font_family, font_size, font_weight, ligatures, line_height, text_align, brightness, transitions, updated_at
	`

	var s models.ReaderSettings
	var updatedAt time.Time
	if err := r.db.QueryRow(
		ctx,
		sql,
		req.UserID,
		req.Theme,
		req.FontFamily,
		req.FontSize,
		req.FontWeight,
		req.Ligatures,
		req.LineHeight,
		req.TextAlign,
		req.Brightness,
		req.Transitions,
	).Scan(
		&s.UserID,
		&s.Theme,
		&s.FontFamily,
		&s.FontSize,
		&s.FontWeight,
		&s.Ligatures,
		&s.LineHeight,
		&s.TextAlign,
		&s.Brightness,
		&s.Transitions,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}


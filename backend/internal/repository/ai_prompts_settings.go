package repository

import (
	"aura/internal/models"
	"context"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AIPromptsSettingsRepo struct {
	db *pgxpool.Pool
}

func NewAIPromptsSettingsRepo(db *pgxpool.Pool) *AIPromptsSettingsRepo {
	return &AIPromptsSettingsRepo{db: db}
}

func (r *AIPromptsSettingsRepo) GetByUserID(ctx context.Context, req *models.GetAiSettingsReq) (*models.AIPromptsSettings, error) {
	sql, args, err := QB.Select("user_id", "words_for_prompt").
		From("ai_prompts_settings").
		Where(sq.Eq{"user_id": req.UserId}).
		ToSql()
	if err != nil {
		return nil, err
	}

	var settings models.AIPromptsSettings
	err = r.db.QueryRow(ctx, sql, args...).Scan(
		&settings.UserID,
		&settings.WordsForPrompt,
	)
	if err != nil {
		return nil, err
	}

	return &settings, nil
}

func (r *AIPromptsSettingsRepo) Upsert(ctx context.Context, req *models.UpsertAIPromptsSettingsReq) (*models.AIPromptsSettings, error) {
	sql := `
		INSERT INTO ai_prompts_settings (user_id, words_for_prompt)
		VALUES ($1, $2)
		ON CONFLICT (user_id) 
		DO UPDATE SET 
			words_for_prompt = EXCLUDED.words_for_prompt
		RETURNING user_id, words_for_prompt
	`

	var settings models.AIPromptsSettings
	err := r.db.QueryRow(ctx, sql, req.UserId, req.WordsForPrompt).Scan(
		&settings.UserID,
		&settings.WordsForPrompt,
	)
	if err != nil {
		return nil, err
	}

	return &settings, nil
}

func (r *AIPromptsSettingsRepo) Delete(ctx context.Context, userID int64) error {
	sql, args, err := QB.Delete("ai_prompts_settings").
		Where(sq.Eq{"user_id": userID}).
		ToSql()
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, sql, args...)
	return err
}

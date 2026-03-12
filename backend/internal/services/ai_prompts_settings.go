package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/pkg/logger"
	"context"
	"errors"

	"go.uber.org/zap"
)

type AIPromptsSettingsService struct {
	repo   *repository.AIPromptsSettingsRepo
	logger *logger.Logger
}

func NewAIPromptsSettingsService(repo *repository.AIPromptsSettingsRepo, logger *logger.Logger) *AIPromptsSettingsService {
	return &AIPromptsSettingsService{
		repo:   repo,
		logger: logger,
	}
}

func (s *AIPromptsSettingsService) GetSettings(ctx context.Context, req *models.GetAiSettingsReq) (*models.AIPromptsSettings, error) {
	settings, err := s.repo.GetByUserID(ctx, req)
	if err != nil {
		if err.Error() == "no rows in result set" {
			s.logger.Info("no AI settings found for user, returning default",
				zap.Int64("user_id", req.UserId))
			return &models.AIPromptsSettings{
				UserID:         req.UserId,
				WordsForPrompt: nil,
			}, nil
		}

		s.logger.Error("failed to get AI settings",
			zap.Error(err),
			zap.Int64("user_id", req.UserId))
		return nil, err
	}

	return &models.AIPromptsSettings{
		UserID:         settings.UserID,
		WordsForPrompt: settings.WordsForPrompt,
	}, nil
}

func (s *AIPromptsSettingsService) UpsertSettings(ctx context.Context, req *models.UpsertAIPromptsSettingsReq) (*models.AIPromptsSettings, error) {
	if len(req.WordsForPrompt) < 10 {
		return nil, errors.New("words_for_prompt must be at least 10 characters long")
	}

	if len(req.WordsForPrompt) > 5000 {
		return nil, errors.New("words_for_prompt must not exceed 5000 characters")
	}

	settings, err := s.repo.Upsert(ctx, req)
	if err != nil {
		s.logger.Error("failed to upsert AI settings",
			zap.Error(err),
			zap.Int64("user_id", req.UserId))
		return nil, err
	}

	s.logger.Info("AI settings upserted successfully",
		zap.Int64("user_id", req.UserId),
		zap.Int("prompt_length", len(req.WordsForPrompt)))

	return settings, nil
}

func (s *AIPromptsSettingsService) DeleteSettings(ctx context.Context, userID int64) error {
	if err := s.repo.Delete(ctx, userID); err != nil {
		s.logger.Error("failed to delete AI settings",
			zap.Error(err),
			zap.Int64("user_id", userID))
		return err
	}

	s.logger.Info("AI settings deleted",
		zap.Int64("user_id", userID))
	return nil
}

package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/pkg/logger"
	"context"

	"go.uber.org/zap"
)

type ThoughtsService struct {
	repo     *repository.ThoughtsRepo
	mlClient *MLClient
	logger   *logger.Logger
}

func NewThoughtsService(repo *repository.ThoughtsRepo, mlClient *MLClient, logger *logger.Logger) *ThoughtsService {
	return &ThoughtsService{repo: repo, mlClient: mlClient, logger: logger}
}

func (s *ThoughtsService) CreateThought(ctx context.Context, req *models.CreateThoughtReq) (*models.Thought, error) {
	// ML analysis is done by ML service via /api/analyze-thought endpoint
	// Frontend triggers it after creating the thought
	// We just save the thought without analysis - ML service will update it later
	thought, err := s.repo.CreateThought(ctx, req)
	if err != nil {
		s.logger.Error("thought creation failed", zap.Error(err), zap.Int64("user_id", req.UserID))
		return nil, err
	}
	return thought, nil
}

func (s *ThoughtsService) UpdateThought(ctx context.Context, req *models.UpdateThoughtReq) error {
	// Update thought content - ML analysis will be triggered separately if needed
	err := s.repo.UpdateThought(ctx, req)
	if err != nil {
		s.logger.Error("thought update failed", zap.Error(err), zap.Int64("thought_id", req.ThoughtID))
		return err
	}
	return nil
}

func (s *ThoughtsService) GetThoughtByID(ctx context.Context, thoughtID, userID int64) (*models.Thought, error) {
	return s.repo.GetByID(ctx, thoughtID, userID)
}

func (s *ThoughtsService) GetThoughts(ctx context.Context, userID int64, limit int) ([]*models.Thought, error) {
	return s.repo.ListByUserID(ctx, userID, limit)
}

func (s *ThoughtsService) DeleteThought(ctx context.Context, thoughtID int64) error {
	return s.repo.DeleteByID(ctx, thoughtID)
}

package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/pkg/logger"
	"context"

	"go.uber.org/zap"
)

type ReportRequestsService struct {
	repo     *repository.ReportRequestsRepo
	userRepo *repository.UsersRepo
	logger   *logger.Logger
}

func NewReportRequestsService(repo *repository.ReportRequestsRepo, userRepo *repository.UsersRepo, logger *logger.Logger) *ReportRequestsService {
	return &ReportRequestsService{repo: repo, userRepo: userRepo, logger: logger}
}

func (s *ReportRequestsService) Create(ctx context.Context, req *models.CreateReportRequestReq) error {
	// Лимит на создание заявок на отчёт снят - любой пользователь может запрашивать сколько угодно
	if err := s.repo.Create(ctx, req); err != nil {
		s.logger.Error("report request creation failed", zap.Error(err), zap.Int64("user_id", req.UserID))
		return err
	}
	return nil
}

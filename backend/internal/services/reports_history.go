package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/pkg/logger"
	"context"
	"errors"

	"go.uber.org/zap"
)

type ReportsHistoryService struct {
	repo   *repository.ReportsHistoryRepo
	logger *logger.Logger
}

func NewReportsHistoryService(repo *repository.ReportsHistoryRepo, logger *logger.Logger) *ReportsHistoryService {
	return &ReportsHistoryService{repo: repo, logger: logger}
}

func (s *ReportsHistoryService) CreateReport(ctx context.Context, req *models.CreateReportReq) error {
	// Лимит на генерацию отчетов снят - пользователь может запрашивать сколько угодно
	if err := s.repo.CreateReport(ctx, req); err != nil {
		s.logger.Error("report creation failed", zap.Error(err), zap.Int64("user_id", req.UserID))
		return err
	}
	return nil
}

func (s *ReportsHistoryService) GetReportByID(ctx context.Context, report_id, user_id int64) (*models.Report, error) {
	model, err := s.repo.GetReportByID(ctx, report_id, user_id)
	if err != nil {
		return nil, err
	}
	return model, err
}

func (s *ReportsHistoryService) GetReports(ctx context.Context, req *models.GetReportsReq) ([]*models.Report, error) {
	models, err := s.repo.GetReports(ctx, req)
	if err != nil {
		return nil, err
	}
	return models, err
}

func (s *ReportsHistoryService) DeleteReport(ctx context.Context, report_id, user_id int64) error {
	if err := s.repo.DeleteReport(ctx, report_id, user_id); err != nil {
		s.logger.Error("report deletion failed", zap.Error(err), zap.Int64("report_id", report_id), zap.Int64("user_id", user_id))
		return err
	}
	return nil
}

// UpdateReportContent записывает текст отчёта в существующую заявку (после генерации). methodologyType опционален.
func (s *ReportsHistoryService) UpdateReportContent(ctx context.Context, reportID, userID int64, reportContent string, methodologyType *string) error {
	err := s.repo.UpdateReportContent(ctx, reportID, userID, reportContent, methodologyType)
	if err != nil {
		if errors.Is(err, repository.ErrNoRows) {
			return err
		}
		s.logger.Error("report update failed", zap.Error(err), zap.Int64("report_id", reportID), zap.Int64("user_id", userID))
		return err
	}
	return nil
}

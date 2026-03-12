package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/pkg/logger"
	"context"
	"errors"

	"go.uber.org/zap"
)

type ReaderSettingsService struct {
	repo   *repository.ReaderSettingsRepo
	logger *logger.Logger
}

func NewReaderSettingsService(repo *repository.ReaderSettingsRepo, logger *logger.Logger) *ReaderSettingsService {
	return &ReaderSettingsService{repo: repo, logger: logger}
}

func (s *ReaderSettingsService) Get(ctx context.Context, userID int64) (*models.ReaderSettings, error) {
	settings, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		// default settings when missing
		if err.Error() == "no rows in result set" {
			return &models.ReaderSettings{
				UserID:      userID,
				Theme:       "light",
				FontFamily:  "SF",
				FontSize:    16,
				FontWeight:  400,
				Ligatures:   true,
				LineHeight:  1.45,
				TextAlign:   "left",
				Brightness:  1.0,
				Transitions: true,
			}, nil
		}
		s.logger.Error("failed to get reader settings", zap.Error(err), zap.Int64("user_id", userID))
		return nil, err
	}
	return settings, nil
}

func (s *ReaderSettingsService) Upsert(ctx context.Context, req *models.UpsertReaderSettingsReq) (*models.ReaderSettings, error) {
	if req.Theme != "light" && req.Theme != "sepia" && req.Theme != "dark" {
		return nil, errors.New("invalid theme")
	}
	switch req.FontFamily {
	case "Georgia", "SF", "Iowan", "Avenir":
	default:
		return nil, errors.New("invalid font_family")
	}
	if req.FontSize < 12 || req.FontSize > 28 {
		return nil, errors.New("font_size out of range")
	}
	if req.FontWeight < 100 || req.FontWeight > 900 || req.FontWeight%100 != 0 {
		// allow any 100..900; front may send non-100 step via slider, so relax:
		if req.FontWeight < 100 || req.FontWeight > 900 {
			return nil, errors.New("font_weight out of range")
		}
	}
	if req.LineHeight < 1.0 || req.LineHeight > 1.8 {
		return nil, errors.New("line_height out of range")
	}
	if req.TextAlign != "left" && req.TextAlign != "justify" {
		return nil, errors.New("invalid text_align")
	}
	if req.Brightness < 0.5 || req.Brightness > 1.2 {
		return nil, errors.New("brightness out of range")
	}

	out, err := s.repo.Upsert(ctx, req)
	if err != nil {
		s.logger.Error("failed to upsert reader settings", zap.Error(err), zap.Int64("user_id", req.UserID))
		return nil, err
	}
	return out, nil
}


package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/internal/utils"
	"aura/pkg/logger"
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	usersRepo    *repository.UsersRepo
	sessionsRepo *repository.RefreshSessionsRepo
	tokenMaker   *utils.TokenMaker
	logger       *logger.Logger
}

func NewAuthService(
	usersRepo *repository.UsersRepo,
	sessionsRepo *repository.RefreshSessionsRepo,
	tokenMaker *utils.TokenMaker,
	logger *logger.Logger,
) *AuthService {
	return &AuthService{
		usersRepo:    usersRepo,
		sessionsRepo: sessionsRepo,
		tokenMaker:   tokenMaker,
		logger:       logger,
	}
}

func (s *AuthService) Register(ctx context.Context, req *models.CreateUserReq) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		s.logger.Error("failed to hash password", zap.Error(err))
		return nil, err
	}

	createUserReq := &models.CreateUserReq{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	user, err := s.usersRepo.CreateUser(ctx, createUserReq)
	if err != nil {
		s.logger.Error("failed to create user", zap.Error(err))
		return nil, err
	}
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, req *models.LoginReq, fingerprint, userAgent string) (*models.LoginResp, error) {
	var getUserReq models.GetUserReq = models.GetUserReq{
		Email: req.Email,
	}
	user, err := s.usersRepo.GetByEmail(ctx, &getUserReq)
	if err != nil {
		s.logger.Warn("login attempt with non-existent email", zap.String("email", req.Email))
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		s.logger.Warn("wrong password", zap.Int64("user_id", user.UserID))
		return nil, errors.New("invalid credentials")
	}

	accessToken, refreshToken, err := s.tokenMaker.CreateTokens(user.UserID)
	if err != nil {
		s.logger.Error("failed to create tokens", zap.Error(err))
		return nil, err
	}

	session := &repository.RefreshSession{
		UserID:       user.UserID,
		RefreshToken: refreshToken,
		UserAgent:    userAgent,
		Fingerprint:  fingerprint,
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
	}

	if err := s.sessionsRepo.CreateRefreshSession(ctx, session); err != nil {
		s.logger.Error("failed to save refresh session", zap.Error(err))
		return nil, err
	}

	s.logger.Info("user logged in", zap.Int64("user_id", user.UserID))

	resp := &models.LoginResp{
		UserID:       user.UserID,
		Username:     user.Username,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	return resp, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshTokenString, fingerprint string) (*models.RefreshTokenResp, error) {
	token, err := s.tokenMaker.ValidateToken(refreshTokenString)
	if err != nil || !token.Valid {
		s.logger.Warn("invalid refresh token")
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		return nil, errors.New("token is not a refresh token")
	}

	session, err := s.sessionsRepo.GetRefreshSession(ctx, refreshTokenString)
	if err != nil {
		s.logger.Warn("refresh token not found in database")
		return nil, errors.New("session not found")
	}

	if session.ExpiresAt.Before(time.Now()) {
		s.logger.Warn("refresh token expired", zap.Int64("user_id", session.UserID))
		_ = s.sessionsRepo.DeleteRefreshSession(ctx, refreshTokenString)
		return nil, errors.New("refresh token expired")
	}

	if session.Fingerprint != "" && session.Fingerprint != fingerprint {
		s.logger.Warn("fingerprint mismatch", zap.Int64("user_id", session.UserID))
		return nil, errors.New("fingerprint mismatch")
	}

	if err := s.sessionsRepo.DeleteRefreshSession(ctx, refreshTokenString); err != nil {
		s.logger.Error("failed to delete old refresh token", zap.Error(err))
		return nil, err
	}

	userID := session.UserID
	newAccessToken, newRefreshToken, err := s.tokenMaker.CreateTokens(userID)
	if err != nil {
		s.logger.Error("failed to create new tokens", zap.Error(err))
		return nil, err
	}

	newSession := &repository.RefreshSession{
		UserID:       userID,
		RefreshToken: newRefreshToken,
		UserAgent:    session.UserAgent,
		Fingerprint:  fingerprint,
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
	}

	if err := s.sessionsRepo.CreateRefreshSession(ctx, newSession); err != nil {
		s.logger.Error("failed to save new refresh session", zap.Error(err))
		return nil, err
	}

	s.logger.Info("tokens refreshed", zap.Int64("user_id", userID))

	resp := &models.RefreshTokenResp{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}

	return resp, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshTokenString string) error {
	if err := s.sessionsRepo.DeleteRefreshSession(ctx, refreshTokenString); err != nil {
		s.logger.Error("failed to delete refresh session", zap.Error(err))
		return err
	}
	s.logger.Info("user logged out")
	return nil
}

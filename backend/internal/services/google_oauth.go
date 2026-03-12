package services

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/internal/utils"
	"aura/pkg/logger"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"go.uber.org/zap"
)

type GoogleOAuthService struct {
	usersRepo    *repository.UsersRepo
	sessionsRepo *repository.RefreshSessionsRepo
	tokenMaker   *utils.TokenMaker
	logger       *logger.Logger
	clientID     string
	clientSecret string
}

func NewGoogleOAuthService(
	usersRepo *repository.UsersRepo,
	sessionsRepo *repository.RefreshSessionsRepo,
	tokenMaker *utils.TokenMaker,
	logger *logger.Logger,
) *GoogleOAuthService {
	return &GoogleOAuthService{
		usersRepo:    usersRepo,
		sessionsRepo: sessionsRepo,
		tokenMaker:   tokenMaker,
		logger:       logger,
		clientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		clientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
	}
}

func (s *GoogleOAuthService) HandleCallback(ctx context.Context, req *models.GoogleCallbackReq, fingerprint, userAgent string) (*models.LoginResp, error) {
	// 1. Exchange code for tokens
	tokenResp, err := s.exchangeCodeForTokens(req.Code, req.RedirectURI)
	if err != nil {
		s.logger.Error("failed to exchange code for tokens", zap.Error(err))
		return nil, errors.New("failed to exchange authorization code")
	}

	// 2. Parse and validate ID token
	userInfo, err := s.parseIDToken(tokenResp.IDToken)
	if err != nil {
		s.logger.Error("failed to parse ID token", zap.Error(err))
		return nil, errors.New("failed to parse ID token")
	}

	// 3. Validate email is verified
	if !userInfo.EmailVerified {
		s.logger.Warn("email not verified", zap.String("email", userInfo.Email))
		return nil, errors.New("email not verified")
	}

	// 4. Find or create user
	user, err := s.findOrCreateUser(ctx, userInfo)
	if err != nil {
		s.logger.Error("failed to find or create user", zap.Error(err))
		return nil, errors.New("failed to process user")
	}

	// 5. Generate our own JWT tokens
	accessToken, refreshToken, err := s.tokenMaker.CreateTokens(user.UserID)
	if err != nil {
		s.logger.Error("failed to create tokens", zap.Error(err))
		return nil, err
	}

	// 6. Save refresh session
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

	s.logger.Info("user logged in via Google", zap.Int64("user_id", user.UserID), zap.String("email", user.Email))

	return &models.LoginResp{
		UserID:       user.UserID,
		Username:     user.Username,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *GoogleOAuthService) exchangeCodeForTokens(code, redirectURI string) (*models.GoogleTokenResponse, error) {
	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", s.clientID)
	data.Set("client_secret", s.clientSecret)
	data.Set("redirect_uri", redirectURI)
	data.Set("grant_type", "authorization_code")

	resp, err := http.Post("https://oauth2.googleapis.com/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		s.logger.Error("Google token exchange failed",
			zap.Int("status", resp.StatusCode),
			zap.String("body", string(body)))
		return nil, fmt.Errorf("token exchange failed: %s", string(body))
	}

	var tokenResp models.GoogleTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func (s *GoogleOAuthService) parseIDToken(idToken string) (*models.GoogleUserInfo, error) {
	// ID token is a JWT, parse the payload (middle part)
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid ID token format")
	}

	// Decode payload (add padding if needed)
	payload := parts[1]
	if m := len(payload) % 4; m != 0 {
		payload += strings.Repeat("=", 4-m)
	}

	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		// Try without padding
		decoded, err = base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil {
			return nil, fmt.Errorf("failed to decode ID token payload: %w", err)
		}
	}

	var claims struct {
		Iss           string `json:"iss"`
		Aud           string `json:"aud"`
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		GivenName     string `json:"given_name"`
		FamilyName    string `json:"family_name"`
		Exp           int64  `json:"exp"`
	}

	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse ID token claims: %w", err)
	}

	// Validate issuer
	if claims.Iss != "https://accounts.google.com" && claims.Iss != "accounts.google.com" {
		return nil, fmt.Errorf("invalid issuer: %s", claims.Iss)
	}

	// Validate audience
	if claims.Aud != s.clientID {
		return nil, fmt.Errorf("invalid audience: %s", claims.Aud)
	}

	// Validate expiration
	if claims.Exp < time.Now().Unix() {
		return nil, errors.New("ID token expired")
	}

	return &models.GoogleUserInfo{
		Sub:           claims.Sub,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		Name:          claims.Name,
		Picture:       claims.Picture,
		GivenName:     claims.GivenName,
		FamilyName:    claims.FamilyName,
	}, nil
}

func (s *GoogleOAuthService) findOrCreateUser(ctx context.Context, info *models.GoogleUserInfo) (*models.User, error) {
	// First, try to find by google_sub
	user, err := s.usersRepo.GetByGoogleSub(ctx, info.Sub)
	if err != nil {
		return nil, err
	}

	if user != nil {
		// User found by Google sub
		return user, nil
	}

	// Try to find by email
	existingUser, err := s.usersRepo.GetByEmail(ctx, &models.GetUserReq{Email: info.Email})
	if err == nil && existingUser != nil {
		// User exists with this email, link Google account
		avatarURL := &info.Picture
		if err := s.usersRepo.UpdateGoogleSub(ctx, existingUser.UserID, info.Sub, avatarURL); err != nil {
			s.logger.Warn("failed to link Google account", zap.Error(err))
		}
		existingUser.GoogleSub = &info.Sub
		existingUser.AvatarURL = avatarURL
		return existingUser, nil
	}

	// Create new user
	username := info.GivenName
	if username == "" {
		username = strings.Split(info.Email, "@")[0]
	}

	avatarURL := &info.Picture

	newUser, err := s.usersRepo.CreateGoogleUser(ctx, &models.CreateGoogleUserReq{
		Username:     username,
		Email:        info.Email,
		GoogleSub:    info.Sub,
		AuthProvider: "google",
		AvatarURL:    avatarURL,
	})
	if err != nil {
		return nil, err
	}

	s.logger.Info("created new Google user", zap.Int64("user_id", newUser.UserID), zap.String("email", info.Email))
	return newUser, nil
}


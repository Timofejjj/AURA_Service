package handlers

import (
	"aura/internal/models"
	"aura/internal/services"
	"aura/pkg/logger"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"go.uber.org/zap"
)

type AuthHandler struct {
	svc       *services.AuthService
	googleSvc *services.GoogleOAuthService
	logger    *logger.Logger
}

func NewAuthHandler(svc *services.AuthService, googleSvc *services.GoogleOAuthService, logger *logger.Logger) *AuthHandler {
	return &AuthHandler{svc: svc, googleSvc: googleSvc, logger: logger}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.CreateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("registration validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.svc.Register(c.Request.Context(), &req)
	if err != nil {
		// Проверяем, является ли ошибка ошибкой уникального ограничения PostgreSQL
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			// Ошибка дубликата ключа (email или username уже существует)
			if strings.Contains(pgErr.ConstraintName, "email") {
				c.JSON(http.StatusConflict, gin.H{"error": "Пользователь с таким email уже существует"})
			} else if strings.Contains(pgErr.ConstraintName, "username") {
				c.JSON(http.StatusConflict, gin.H{"error": "Пользователь с таким именем уже существует"})
			} else {
				c.JSON(http.StatusConflict, gin.H{"error": "Пользователь уже существует"})
			}
			return
		}
		// Другие ошибки - возвращаем 500
		h.logger.Error("registration failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "registration failed"})
		return
	}

	resp := models.User{
		UserID:   user.UserID,
		Username: user.Username,
		Email:    user.Email,
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("login validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fingerprint := c.GetHeader("X-Fingerprint")
	userAgent := c.GetHeader("User-Agent")

	resp, err := h.svc.Login(c.Request.Context(), &req, fingerprint, userAgent)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req models.RefreshTokenReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("refresh validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fingerprint := c.GetHeader("X-Fingerprint")

	resp, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken, fingerprint)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req models.RefreshTokenReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("logout validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "logout failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "logged out"})
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	var req models.GoogleCallbackReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("google callback validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fingerprint := c.GetHeader("X-Fingerprint")
	userAgent := c.GetHeader("User-Agent")

	resp, err := h.googleSvc.HandleCallback(c.Request.Context(), &req, fingerprint, userAgent)
	if err != nil {
		h.logger.Error("google oauth failed", zap.Error(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

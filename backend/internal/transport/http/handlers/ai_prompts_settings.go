package handlers

import (
	"aura/internal/models"
	"aura/internal/services"
	"aura/pkg/logger"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AIPromptsSettingsHandler struct {
	svc    *services.AIPromptsSettingsService
	logger *logger.Logger
}

func NewAIPromptsSettingsHandler(svc *services.AIPromptsSettingsService, logger *logger.Logger) *AIPromptsSettingsHandler {
	return &AIPromptsSettingsHandler{
		svc:    svc,
		logger: logger,
	}
}

func (h *AIPromptsSettingsHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")

	settings, err := h.svc.GetSettings(c.Request.Context(), &models.GetAiSettingsReq{
		UserId: userID,
	})
	if err != nil {
		h.logger.Error("failed to get AI settings",
			zap.Error(err),
			zap.Int64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *AIPromptsSettingsHandler) Upsert(c *gin.Context) {
	var req models.UpsertAIPromptsSettingsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("AI settings request validation failed",
			zap.Error(err),
			zap.Int64("user_id", req.UserId))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.UserId = c.GetInt64("user_id")
	settings, err := h.svc.UpsertSettings(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *AIPromptsSettingsHandler) Delete(c *gin.Context) {
	userID := c.GetInt64("user_id")

	if err := h.svc.DeleteSettings(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "AI settings deleted successfully"})
}

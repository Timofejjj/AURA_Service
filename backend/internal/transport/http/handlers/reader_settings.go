package handlers

import (
	"aura/internal/models"
	"aura/internal/services"
	"aura/pkg/logger"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ReaderSettingsHandler struct {
	svc    *services.ReaderSettingsService
	logger *logger.Logger
}

func NewReaderSettingsHandler(svc *services.ReaderSettingsService, logger *logger.Logger) *ReaderSettingsHandler {
	return &ReaderSettingsHandler{svc: svc, logger: logger}
}

func (h *ReaderSettingsHandler) Get(c *gin.Context) {
	// enforce per-session user_id
	userID := c.GetInt64("user_id")
	pathID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if pathID != 0 && pathID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	settings, err := h.svc.Get(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("failed to get reader settings", zap.Error(err), zap.Int64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve settings"})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *ReaderSettingsHandler) Upsert(c *gin.Context) {
	userID := c.GetInt64("user_id")
	pathID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if pathID != 0 && pathID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req models.UpsertReaderSettingsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.UserID = userID

	out, err := h.svc.Upsert(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}


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

type ThoughtsHandler struct {
	svc    *services.ThoughtsService
	logger *logger.Logger
}

func NewThoughtsHandler(svc *services.ThoughtsService, logger *logger.Logger) *ThoughtsHandler {
	return &ThoughtsHandler{svc: svc, logger: logger}
}

func (h *ThoughtsHandler) CreateThought(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req models.CreateThoughtReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("failed to bind JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.UserID = userID
	
	// Log request for debugging
	if req.CreatedAt != nil {
		h.logger.Info("creating thought with custom date",
			zap.Int64("user_id", userID),
			zap.Time("created_at", *req.CreatedAt),
			zap.Any("content_length", len(*req.Content)))
	}
	
	t, err := h.svc.CreateThought(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("failed to create thought", zap.Error(err), zap.Int64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *ThoughtsHandler) UpdateThought(c *gin.Context) {
	var req models.UpdateThoughtReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Log the request for debugging
	contentStr := ""
	if req.Content != nil {
		contentStr = *req.Content
	}
	h.logger.Info("updating thought",
		zap.Int64("thought_id", req.ThoughtID),
		zap.String("content", contentStr),
		zap.Any("voice_text", req.VoiceText),
		zap.Any("image_id", req.ImageID),
		zap.Any("type_thought", req.TypeThought))
	
	err := h.svc.UpdateThought(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("thought update failed", zap.Error(err), zap.Int64("thought_id", req.ThoughtID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, "Thought updated successfully")
}

func (h *ThoughtsHandler) GetThoughtByID(c *gin.Context) {
	user_id := c.GetInt64("user_id")
	thought_id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	thought, err := h.svc.GetThoughtByID(c.Request.Context(), int64(thought_id), user_id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, thought)
}

func (h *ThoughtsHandler) ListThoughts(c *gin.Context) {
	userID := c.GetInt64("user_id")
	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	thoughts, err := h.svc.GetThoughts(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, thoughts)
}

func (h *ThoughtsHandler) DeleteThought(c *gin.Context) {
	thoughtID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.svc.DeleteThought(c.Request.Context(), thoughtID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

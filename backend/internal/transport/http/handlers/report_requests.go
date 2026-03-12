package handlers

import (
	"aura/internal/models"
	"aura/internal/services"
	"aura/pkg/logger"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ReportRequestsHandler struct {
	svc    *services.ReportRequestsService
	logger *logger.Logger
}

func NewReportRequestsHandler(svc *services.ReportRequestsService, logger *logger.Logger) *ReportRequestsHandler {
	return &ReportRequestsHandler{svc: svc, logger: logger}
}

// Create сохраняет заявку на отчёт (только диапазон дат). Ответ будет готов в течение 24 часов.
func (h *ReportRequestsHandler) Create(c *gin.Context) {
	var req models.CreateReportRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("failed to bind JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	userIDInt64, ok := userID.(int64)
	if !ok {
		if userIDInt, ok := userID.(int); ok {
			userIDInt64 = int64(userIDInt)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user id type"})
			return
		}
	}

	req.UserID = userIDInt64

	err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		var limitErr *models.ReportRequestLimitError
		if errors.As(err, &limitErr) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Вы можете запрашивать отчёт только 3 раза в неделю",
				"code":  "WEEKLY_LIMIT_EXCEEDED",
			})
			return
		}
		h.logger.Error("failed to create report request", zap.Error(err), zap.Int64("user_id", userIDInt64))
		errMsg := err.Error()
		resp := gin.H{"error": "failed to create report request", "details": errMsg}
		if strings.Contains(errMsg, "does not exist") {
			resp["error"] = "Таблица заявок не найдена. Выполните миграцию report_requests."
		}
		c.JSON(http.StatusInternalServerError, resp)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Ответ будет готов в течение 24 часов",
	})
}

package handlers

import (
	"aura/internal/models"
	"aura/internal/repository"
	"aura/internal/services"
	"aura/pkg/logger"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ReportsHistoryHandler struct {
	svc    *services.ReportsHistoryService
	logger *logger.Logger
}

func NewReportsHistoryHandler(svc *services.ReportsHistoryService, logger *logger.Logger) *ReportsHistoryHandler {
	return &ReportsHistoryHandler{svc: svc, logger: logger}
}

func (h *ReportsHistoryHandler) CreateReport(c *gin.Context) {
	var req models.CreateReportReq
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("failed to bind JSON", zap.Error(err), zap.String("body", c.Request.Header.Get("Content-Type")))
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
		return
	}
	
	h.logger.Info("received create report request", 
		zap.Any("date_from", req.DateFrom), 
		zap.Any("date_to", req.DateTo))
	
	// Получаем user_id из контекста (из JWT токена)
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
	
	err := h.svc.CreateReport(c.Request.Context(), &req)
	if err != nil {
		// Проверяем, не превышен ли лимит
		if _, ok := err.(*models.WeeklyLimitError); ok {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Вы можете запрашивать отчет только 2 раза в неделю",
				"code":  "WEEKLY_LIMIT_EXCEEDED",
			})
			return
		}
		
		h.logger.Error("failed to create report", zap.Error(err), zap.Int64("user_id", userIDInt64))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create report"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message":    "Отчет будет готов в течение 24 часов",
		"report_id":  req.ID,
		"status":     "pending",
	})
}

func (h *ReportsHistoryHandler) GetReportByID(c *gin.Context) {
	report_id := c.Param("id")
	reportID, err := strconv.ParseInt(report_id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report id"})
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

	report, err := h.svc.GetReportByID(c.Request.Context(), reportID, userIDInt64)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error occured while listenig report"})
		return
	}

	c.JSON(http.StatusOK, toPanelDTO(report))
}

func (h *ReportsHistoryHandler) GetReports(c *gin.Context) {
	var req models.GetReportsReq

	// Enforce user_id from JWT; query user_id is ignored for security (kept only for backward compat clients).
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

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.UserID = userIDInt64
	req.Limit = int64(limit)
	req.Offset = int64(offset)

	req.Date = c.Query("date")
	req.From = c.Query("from")
	req.To = c.Query("to")
	req.Month = c.Query("month")

	reports, err := h.svc.GetReports(c.Request.Context(), &req)
	if err != nil {
		h.logger.Error("failed to get reports", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error occured while listenig reports"})
		return
	}
	
	// Убеждаемся, что возвращаем пустой массив вместо nil
	if reports == nil {
		reports = []*models.Report{}
	}

	out := make([]panelReportDTO, 0, len(reports))
	for _, r := range reports {
		out = append(out, toPanelDTO(r))
	}
	c.JSON(http.StatusOK, out)
}

// panelReportDTO is the minimal schema for report-panel UI.
// full_text is rendered verbatim on client; no title/summary is produced.
type panelReportDTO struct {
	ReportID        int64       `json:"report_id"`
	UserID          int64       `json:"user_id"`
	DateRangeStart  string      `json:"date_range_start"`
	DateRangeEnd    *string     `json:"date_range_end,omitempty"`
	GeneratedAt     *time.Time  `json:"generated_at,omitempty"`
	Methodology     string      `json:"methodology"`
	FullText        string      `json:"full_text"`
	Attachments     []any       `json:"attachments"`
	Reviewed        bool        `json:"reviewed"`

	// Backward-compat fields (do not use for UI, but keep to avoid breaking old clients)
	CreatedAt       *time.Time  `json:"created_at,omitempty"`
	DateFrom        *time.Time  `json:"date_from,omitempty"`
	DateTo          *time.Time  `json:"date_to,omitempty"`
	Status          string      `json:"status"`
	RequestedAt     time.Time   `json:"requested_at"`
	MethodologyType *string     `json:"methodology_type,omitempty"`
	Report          *string     `json:"report,omitempty"`
}

func toPanelDTO(r *models.Report) panelReportDTO {
	// date_range_start = date_from (preferred) else created_at date
	start := ""
	if r.DateFrom != nil {
		start = r.DateFrom.Format("2006-01-02")
	} else if r.LogDatetime != nil {
		start = r.LogDatetime.Format("2006-01-02")
	}
	var end *string
	if r.DateTo != nil {
		s := r.DateTo.Format("2006-01-02")
		end = &s
	}

	fullText := ""
	if r.Report != nil {
		fullText = *r.Report
	}
	methodology := ""
	if r.MethodologyType != nil {
		methodology = *r.MethodologyType
	}

	return panelReportDTO{
		ReportID:        r.ID,
		UserID:          r.UserID,
		DateRangeStart:  start,
		DateRangeEnd:    end,
		GeneratedAt:     r.LogDatetime,
		Methodology:     methodology,
		FullText:        fullText,
		Attachments:     []any{},
		Reviewed:        false,
		CreatedAt:       r.LogDatetime,
		DateFrom:        r.DateFrom,
		DateTo:          r.DateTo,
		Status:          r.Status,
		RequestedAt:     r.RequestedAt,
		MethodologyType: r.MethodologyType,
		Report:          r.Report,
	}
}

func (h *ReportsHistoryHandler) DeleteReport(c *gin.Context) {
	report_id := c.Param("id")
	reportID, err := strconv.ParseInt(report_id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report id"})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	
	userIDInt64, ok := userID.(int64)
	if !ok {
		// Попробуем преобразовать из int, если это int
		if userIDInt, ok := userID.(int); ok {
			userIDInt64 = int64(userIDInt)
		} else {
			h.logger.Error("invalid user_id type", zap.Any("user_id", userID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user id type"})
			return
		}
	}
	
	err = h.svc.DeleteReport(c.Request.Context(), reportID, userIDInt64)
	if err != nil {
		h.logger.Error("failed to delete report", zap.Error(err), zap.Int64("report_id", reportID), zap.Int64("user_id", userIDInt64))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while deleting report"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Report deleted successfully"})
}

// UpdateReportContent обновляет текст отчёта (после генерации). PATCH /api/reports/:id
func (h *ReportsHistoryHandler) UpdateReportContent(c *gin.Context) {
	reportID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report id"})
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

	var req models.UpdateReportReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
		return
	}

	err = h.svc.UpdateReportContent(c.Request.Context(), reportID, userIDInt64, req.Report, req.MethodologyType)
	if err != nil {
		if errors.Is(err, repository.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "report not found or access denied"})
			return
		}
		h.logger.Error("failed to update report content", zap.Error(err), zap.Int64("report_id", reportID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Report updated", "report_id": reportID, "status": "completed"})
}

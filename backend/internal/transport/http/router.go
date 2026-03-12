package http

import (
	"aura/internal/transport/http/handlers"
	"aura/pkg/logger"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Router struct {
	engine *gin.Engine
}

func NewRouter(
	auth gin.HandlerFunc,
	logger *logger.Logger,
	authH *handlers.AuthHandler,
	aiH *handlers.AIPromptsSettingsHandler,
	repH *handlers.ReportsHistoryHandler,
	reqH *handlers.ReportRequestsHandler,
	thH *handlers.ThoughtsHandler,
	readerH *handlers.ReaderSettingsHandler,
) *Router {
	e := gin.Default()

	e.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Allow localhost
			if origin == "http://localhost:5173" || origin == "http://localhost:3000" {
				return true
			}
			// Allow Tailscale IP address
			if origin == "http://100.64.148.91:5173" || origin == "http://100.64.148.91:8080" {
				return true
			}
			// Allow Serveo domains
			if len(origin) > 11 && origin[len(origin)-11:] == ".serveo.net" {
				return true
			}
			// Allow localhost.run domains
			if len(origin) > 14 && origin[len(origin)-14:] == ".localhost.run" {
				return true
			}
			// Allow Tailscale domains (HTTP and HTTPS)
			if len(origin) >= 7 {
				originLower := strings.ToLower(origin)
				// Проверяем, содержит ли origin домен .ts.net (может быть с протоколом и путем)
				if strings.Contains(originLower, ".ts.net") {
					return true
				}
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authGroup := e.Group("/auth")
	{
		authGroup.POST("/register", authH.Register)
		authGroup.POST("/login", authH.Login)
		authGroup.POST("/refresh", authH.Refresh)
		authGroup.POST("/logout", authH.Logout)
		authGroup.POST("/google/callback", authH.GoogleCallback)
	}

	authed := e.Group("/api", auth)
	{
		authed.GET("/ai-settings", aiH.Get)
		authed.PUT("/ai-settings", aiH.Upsert)
		authed.DELETE("/ai-settings", aiH.Delete)

		authed.POST("/report-requests", reqH.Create)
		authed.POST("/reports", reqH.Create)              // заявка (даты) → report_requests; тот же обработчик
		authed.POST("/reports/create", repH.CreateReport) // старый вариант в reports_history (если понадобится)
		authed.GET("/reports/:id", repH.GetReportByID)
		authed.GET("/reports", repH.GetReports)
		authed.PATCH("/reports/:id", repH.UpdateReportContent)
		authed.DELETE("/reports/:id", repH.DeleteReport)

		authed.POST("/thoughts", thH.CreateThought)
		authed.PUT("/thoughts", thH.UpdateThought)
		authed.GET("/thoughts", thH.ListThoughts)
		authed.GET("/thoughts/:id", thH.GetThoughtByID)
		authed.DELETE("/thoughts/:id", thH.DeleteThought)

		// Reader settings (per user)
		authed.GET("/users/:id/reader-settings", readerH.Get)
		authed.POST("/users/:id/reader-settings", readerH.Upsert)
	}

	return &Router{engine: e}
}

func (r *Router) Run(addr string) error {
	return r.engine.Run(addr)
}

func (r *Router) Engine() *gin.Engine {
	return r.engine
}

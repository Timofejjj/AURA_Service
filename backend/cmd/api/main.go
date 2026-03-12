package main

import (
	"aura/internal/config"
	"aura/internal/database"
	"aura/internal/middleware"
	"aura/internal/repository"
	"aura/internal/services"
	transportHTTP "aura/internal/transport/http"
	"aura/internal/transport/http/handlers"
	"aura/internal/utils"
	"aura/pkg/logger"
	"context"
	"crypto/rsa"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.LoadConfig(".")
	if err != nil {
		fmt.Fprintf(os.Stderr, "config load failed: %v\n", err)
		os.Exit(1)
	}

	logger := logger.New(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "logger init failed: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Info("starting server",
		zap.String("port", cfg.Port),
		zap.String("log_level", cfg.Level),
	)

	pool, err := database.NewConnection(&cfg)
	if err != nil {
		logger.Fatal("db connect failed", zap.Error(err))
	}
	defer pool.Close()

	privateKey, err := loadRSAPrivateKey(cfg.PrivateKeyPath)
	if err != nil {
		logger.Fatal("failed to load private key", zap.Error(err))
	}

	publicKey, err := loadRSAPublicKey(cfg.PublicKeyPath)
	if err != nil {
		logger.Fatal("failed to load public key", zap.Error(err))
	}
	logger.Info("RSA keys loaded successfully")

	userRepo := repository.NewUsersRepo(pool)
	refreshRepo := repository.NewRefreshSessionsRepo(pool)
	aiSettingsRepo := repository.NewAIPromptsSettingsRepo(pool)
	reportsRepo := repository.NewReportsHistoryRepo(pool)
	reportRequestsRepo := repository.NewReportRequestsRepo(pool)
	thoughtsRepo := repository.NewThoughtsRepo(pool)
	readerSettingsRepo := repository.NewReaderSettingsRepo(pool)

	tokenMaker := utils.NewTokenMaker(privateKey, publicKey, time.Minute*time.Duration(cfg.AccessTTLMinutes), time.Hour*24*time.Duration(cfg.RefreshTTLDays))

	mlClient := services.NewMLClient(
		cfg.MlEndpoint,
		100*time.Second,
		logger,
	)
	aiSvc := services.NewAIPromptsSettingsService(aiSettingsRepo, logger)
	authSvc := services.NewAuthService(userRepo, refreshRepo, tokenMaker, logger)
	googleOAuthSvc := services.NewGoogleOAuthService(userRepo, refreshRepo, tokenMaker, logger)
	reportsSvc := services.NewReportsHistoryService(reportsRepo, logger)
	reportRequestsSvc := services.NewReportRequestsService(reportRequestsRepo, userRepo, logger)
	thoughtsSvc := services.NewThoughtsService(thoughtsRepo, mlClient, logger)
	readerSettingsSvc := services.NewReaderSettingsService(readerSettingsRepo, logger)

	aiH := handlers.NewAIPromptsSettingsHandler(aiSvc, logger)
	authH := handlers.NewAuthHandler(authSvc, googleOAuthSvc, logger)
	repH := handlers.NewReportsHistoryHandler(reportsSvc, logger)
	reqH := handlers.NewReportRequestsHandler(reportRequestsSvc, logger)
	thH := handlers.NewThoughtsHandler(thoughtsSvc, logger)
	readerH := handlers.NewReaderSettingsHandler(readerSettingsSvc, logger)

	authMiddleware := middleware.Auth(publicKey, logger)
	router := transportHTTP.NewRouter(
		authMiddleware,
		logger,
		authH,
		aiH,
		repH,
		reqH,
		thH,
		readerH,
	)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.Engine(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("server listening", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("shutdown signal received, gracefully stopping")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", zap.Error(err))
	}

	logger.Info("server stopped")
}

func loadRSAPrivateKey(path string) (*rsa.PrivateKey, error) {
	keyBytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key file: %w", err)
	}

	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	return privateKey, nil
}

func loadRSAPublicKey(path string) (*rsa.PublicKey, error) {
	keyBytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read public key file: %w", err)
	}

	publicKey, err := jwt.ParseRSAPublicKeyFromPEM(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	return publicKey, nil
}

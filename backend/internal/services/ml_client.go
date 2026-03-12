package services

import (
	"aura/pkg/logger"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"
)

type MLClient struct {
	http     *http.Client
	endpoint string
	logger   *logger.Logger
}

type AnalyzeReq struct {
	Text string `json:"text"`
}

type AnalyzeResp struct {
	Sentiment string  `json:"sentiment"`
	Score     float64 `json:"score"`
}

func NewMLClient(endpoint string, timeout time.Duration, logger *logger.Logger) *MLClient {
	return &MLClient{
		http: &http.Client{
			Timeout: timeout,
		},
		endpoint: endpoint,
		logger:   logger,
	}
}

func (c *MLClient) AnalyzeSentiment(ctx context.Context, text string) (string, float64, error) {
	if text == "" {
		return "neutral", 0.5, nil
	}

	body, _ := json.Marshal(AnalyzeReq{Text: text})
	req, err := http.NewRequestWithContext(ctx, "POST", c.endpoint, bytes.NewReader(body))
	if err != nil {
		c.logger.Error("failed to create request", zap.Error(err))
		return "", 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		c.logger.Error("ml service request failed", zap.Error(err), zap.String("endpoint", c.endpoint))
		return "neutral", 0.5, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.logger.Warn("ml service error", zap.Int("status", resp.StatusCode))
		return "neutral", 0.5, nil
	}

	var result AnalyzeResp
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.logger.Error("failed to decode ml response", zap.Error(err))
		return "neutral", 0.5, nil
	}

	return result.Sentiment, result.Score, nil
}

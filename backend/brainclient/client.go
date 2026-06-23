package brainclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const DefaultVersion = "1.0"

// DecisionClient is the interface for making shop decisions.
type DecisionClient interface {
	GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error)
	Close() error
}

// BrainClient implements DecisionClient via HTTP to the Brain Server.
type BrainClient struct {
	endpoint   string
	apiKey     string
	version    string
	httpClient *http.Client
}

// NewBrainClient creates a new BrainClient.
func NewBrainClient(endpoint, apiKey string, timeout time.Duration) *BrainClient {
	return &BrainClient{
		endpoint: endpoint,
		apiKey:   apiKey,
		version:  DefaultVersion,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// GetShopDecision sends a shop decision request to the Brain Server.
func (bc *BrainClient) GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error) {
	if req.Version == "" {
		req.Version = bc.version
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, bc.endpoint+"/api/v1/shop-decision", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if bc.apiKey != "" {
		httpReq.Header.Set("X-API-Key", bc.apiKey)
	}

	resp, err := bc.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	var shopResp ShopResponse
	if err := json.NewDecoder(resp.Body).Decode(&shopResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &shopResp, nil
}

// Close cleans up the BrainClient.
func (bc *BrainClient) Close() error {
	bc.httpClient.CloseIdleConnections()
	return nil
}

package brainclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// BrainClient implements DecisionClient via HTTP to an external brain server.
type BrainClient struct {
	endpoint   string
	apiKey     string
	httpClient *http.Client
	version    string
}

// NewBrainClient creates a new BrainClient with the given endpoint and API key.
func NewBrainClient(endpoint, apiKey string, timeout time.Duration) *BrainClient {
	return &BrainClient{
		endpoint:   endpoint,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: timeout},
		version:    "1.0",
	}
}

// GetShopDecision sends a shop decision request to the brain server and returns the response.
func (c *BrainClient) GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error) {
	req.Version = c.version

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("brainclient: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint+"/api/v1/shop-decision", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("brainclient: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("brainclient: do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("brainclient: read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("brainclient: unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var shopResp ShopResponse
	if err := json.Unmarshal(respBody, &shopResp); err != nil {
		return nil, fmt.Errorf("brainclient: unmarshal response: %w", err)
	}

	// Validate action
	switch shopResp.Action {
	case "buy", "reroll", "delete", "skip":
	default:
		return nil, fmt.Errorf("brainclient: unknown action %q", shopResp.Action)
	}

	return &shopResp, nil
}

// Close implements DecisionClient.Close (no-op for HTTP client).
func (c *BrainClient) Close() error {
	return nil
}

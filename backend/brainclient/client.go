package brainclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

const (
	// DefaultTimeout is the default HTTP request timeout.
	DefaultTimeout = 2 * time.Second
	// Version is the current protocol version.
	Version = "1.0"
)

// DecisionClient is the interface for external AI decision making.
type DecisionClient interface {
	GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error)
	Close() error
}

// BrainClient implements DecisionClient by calling a remote Brain server.
type BrainClient struct {
	endpoint string
	apiKey   string
	client   *http.Client
}

// NewBrainClient creates a new BrainClient.
// If timeout is zero, DefaultTimeout is used.
func NewBrainClient(endpoint, apiKey string, timeout time.Duration) *BrainClient {
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	return &BrainClient{
		endpoint: endpoint,
		apiKey:   apiKey,
		client:   &http.Client{Timeout: timeout},
	}
}

// GetShopDecision sends a shop decision request to the Brain server.
func (b *BrainClient) GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error) {
	req.Version = Version
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("brainclient: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, b.endpoint+"/api/v1/shop-decision", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("brainclient: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if b.apiKey != "" {
		httpReq.Header.Set("X-API-Key", b.apiKey)
	}

	resp, err := b.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("brainclient: execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("brainclient: HTTP %d from brain server", resp.StatusCode)
	}

	var shopResp ShopResponse
	if err := json.NewDecoder(resp.Body).Decode(&shopResp); err != nil {
		return nil, fmt.Errorf("brainclient: decode response: %w", err)
	}

	if shopResp.Version != Version {
		log.Printf("brainclient: version mismatch: got %s, expected %s", shopResp.Version, Version)
		return nil, fmt.Errorf("brainclient: version mismatch: got %s, expected %s", shopResp.Version, Version)
	}

	return &shopResp, nil
}

// CloseIdleConnections closes idle HTTP connections.
func (b *BrainClient) Close() error {
	b.client.CloseIdleConnections()
	return nil
}

// Ensure BrainClient implements DecisionClient.
var _ DecisionClient = (*BrainClient)(nil)

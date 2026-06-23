package brainclient

import (
	"context"
	"fmt"
)

// MockClient is a mock implementation of DecisionClient for testing.
type MockClient struct {
	Response *ShopResponse
	Err      error
}

// GetShopDecision returns the pre-configured response or error.
func (m *MockClient) GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error) {
	if m.Err != nil {
		return nil, m.Err
	}
	if m.Response == nil {
		return nil, fmt.Errorf("mock: no response configured")
	}
	return m.Response, nil
}

// Close is a no-op.
func (m *MockClient) Close() error {
	return nil
}

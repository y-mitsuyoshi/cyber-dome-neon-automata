package brainclient

import (
	"context"
)

// MockClient implements DecisionClient for testing.
type MockClient struct {
	MockResponse *ShopResponse
	MockError    error
}

// GetShopDecision returns the mock response or error.
func (m *MockClient) GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error) {
	if m.MockError != nil {
		return nil, m.MockError
	}
	if m.MockResponse != nil {
		return m.MockResponse, nil
	}
	// Default: skip action
	return &ShopResponse{
		Version: Version,
		Action:  "skip",
	}, nil
}

// Close is a no-op.
func (m *MockClient) Close() error { return nil }

// Ensure MockClient implements DecisionClient.
var _ DecisionClient = (*MockClient)(nil)

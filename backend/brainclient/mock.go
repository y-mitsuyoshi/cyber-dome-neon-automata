package brainclient

import (
	"context"
)

// MockClient is a mock implementation of DecisionClient for testing.
type MockClient struct {
	Response *ShopResponse
	Err      error
}

// GetShopDecision returns the configured response or error.
func (m *MockClient) GetShopDecision(ctx context.Context, req *ShopRequest) (*ShopResponse, error) {
	if m.Err != nil {
		return nil, m.Err
	}
	return m.Response, nil
}

// Close is a no-op for MockClient.
func (m *MockClient) Close() error {
	return nil
}

// StaticResponse returns a MockClient that always returns the given response.
func StaticResponse(action string, cardIndex *int, reason string) *MockClient {
	return &MockClient{
		Response: &ShopResponse{
			Version:   DefaultVersion,
			Action:    action,
			CardIndex: cardIndex,
			Reason:    reason,
		},
	}
}

// ErrorClient returns a MockClient that always returns the given error.
func ErrorClient(err error) *MockClient {
	return &MockClient{
		Err: err,
	}
}

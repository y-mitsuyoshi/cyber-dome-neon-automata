package brainclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestBrainClientGetShopDecision_Success(t *testing.T) {
	expectedResp := ShopResponse{
		Version:   "1.0",
		Action:    "buy",
		CardIndex: intPtr(2),
		Reason:    "Good card",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected Content-Type: application/json")
		}
		if r.Header.Get("X-API-Key") != "test-key" {
			t.Errorf("expected X-API-Key header")
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(expectedResp)
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, "test-key", 2*time.Second)
	resp, err := client.GetShopDecision(context.Background(), &ShopRequest{Version: "1.0"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Action != "buy" {
		t.Errorf("expected action buy, got %s", resp.Action)
	}
	if resp.CardIndex == nil || *resp.CardIndex != 2 {
		t.Errorf("expected card index 2, got %v", resp.CardIndex)
	}
}

func TestBrainClientGetShopDecision_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		json.NewEncoder(w).Encode(ShopResponse{Action: "skip"})
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, "", 50*time.Millisecond)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected timeout error")
	}
}

func TestBrainClientGetShopDecision_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, "", 2*time.Second)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected HTTP error")
	}
}

func TestBrainClientGetShopDecision_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{invalid`))
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, "", 2*time.Second)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected decode error")
	}
}

func intPtr(i int) *int {
	return &i
}

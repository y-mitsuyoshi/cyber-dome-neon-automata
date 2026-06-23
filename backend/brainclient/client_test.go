package brainclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestBrainClient_GetShopDecision_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-API-Key") != "test-key" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if r.Method != http.MethodPost || r.URL.Path != "/api/v1/shop-decision" {
			http.Error(w, "wrong endpoint", http.StatusNotFound)
			return
		}
		resp := ShopResponse{
			Version:   "1.0",
			Action:    "buy",
			CardIndex: intPtr(2),
			Reason:    "unit test",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	client := NewBrainClient(ts.URL, "test-key", 2*time.Second)
	resp, err := client.GetShopDecision(context.Background(), &ShopRequest{Credits: 5})
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

func TestBrainClient_GetShopDecision_VersionMismatch(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := ShopResponse{Version: "0.9", Action: "skip"}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	client := NewBrainClient(ts.URL, "", 2*time.Second)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected version mismatch error, got nil")
	}
}

func TestBrainClient_GetShopDecision_Timeout(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
	}))
	defer ts.Close()

	client := NewBrainClient(ts.URL, "", 50*time.Millisecond)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
}

func TestBrainClient_GetShopDecision_HTTPError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	client := NewBrainClient(ts.URL, "", 2*time.Second)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected HTTP error, got nil")
	}
}

func TestBrainClient_GetShopDecision_AuthHeader(t *testing.T) {
	var authHeader string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("X-API-Key")
		resp := ShopResponse{Version: "1.0", Action: "skip"}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	client := NewBrainClient(ts.URL, "test-api-key", 2*time.Second)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if authHeader != "test-api-key" {
		t.Errorf("expected X-API-Key 'test-api-key', got '%s'", authHeader)
	}
}

func intPtr(i int) *int {
	return &i
}

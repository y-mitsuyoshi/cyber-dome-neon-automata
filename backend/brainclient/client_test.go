package brainclient

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestBrainClient_Success(t *testing.T) {
	expectedResp := ShopResponse{
		Version: "1.0",
		Action:  "buy",
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-API-Key") != "" {
			t.Error("unexpected API key")
		}
		var req ShopRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if req.Version != "1.0" {
			t.Errorf("expected version 1.0, got %s", req.Version)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(expectedResp)
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, "", 2*time.Second)
	resp, err := client.GetShopDecision(context.Background(), &ShopRequest{
		PlayerID:  "npc1",
		Credits:   10,
		Archetype: "aggressive",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Action != "buy" {
		t.Errorf("expected action buy, got %s", resp.Action)
	}
}

func TestBrainClient_WithAuth(t *testing.T) {
	apiKey := "secret-key"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-API-Key") != apiKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		json.NewEncoder(w).Encode(ShopResponse{Version: "1.0", Action: "skip"})
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, apiKey, 2*time.Second)
	resp, err := client.GetShopDecision(context.Background(), &ShopRequest{PlayerID: "npc2"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Action != "skip" {
		t.Errorf("expected action skip, got %s", resp.Action)
	}
}

func TestBrainClient_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
	}))
	defer server.Close()

	client := NewBrainClient(server.URL, "", 50*time.Millisecond)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
}

func TestBrainClient_ClientError(t *testing.T) {
	client := NewBrainClient("http://localhost:1", "", 1*time.Second)
	_, err := client.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected connection error, got nil")
	}
}

func TestMockClient(t *testing.T) {
	mock := &MockClient{
		Response: &ShopResponse{Action: "reroll"},
	}
	resp, err := mock.GetShopDecision(context.Background(), &ShopRequest{})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Action != "reroll" {
		t.Errorf("expected reroll, got %s", resp.Action)
	}

	mock.Err = errors.New("brain unavailable")
	_, err = mock.GetShopDecision(context.Background(), &ShopRequest{})
	if err == nil {
		t.Fatal("expected error")
	}
}

package engine

import (
	"testing"

	"backend/brainclient"
)

func intPtr(i int) *int {
	return &i
}

func createTestNPCState() NPCSessionState {
	return NPCSessionState{
		ID:        "test-npc",
		Credits:   10,
		Archetype: "aggressive",
		ShopOffers: []brainclient.ShopOffer{
			{ShopIndex: 0, CardID: "virus_001", Cost: 3},
			{ShopIndex: 1, CardID: "ai_001", Cost: 5},
		},
		OwnedCards: []brainclient.OwnedCard{
			{OwnedIndex: 0, CardID: "virus_002", Location: "hand"},
		},
	}
}

func TestProcessNPCTurn_Buy(t *testing.T) {
	mock := brainclient.StaticResponse("buy", intPtr(0), "good card")
	Initialize(mock)
	defer Initialize(nil)

	state := createTestNPCState()
	action, idx := ProcessNPCTurn(state)

	if action != "buy" {
		t.Errorf("expected 'buy', got %q", action)
	}
	if idx == nil || *idx != 0 {
		t.Errorf("expected index 0, got %v", idx)
	}
}

func TestProcessNPCTurn_Skip(t *testing.T) {
	mock := brainclient.StaticResponse("skip", nil, "no good cards")
	Initialize(mock)
	defer Initialize(nil)

	state := createTestNPCState()
	action, idx := ProcessNPCTurn(state)

	if action != "skip" {
		t.Errorf("expected 'skip', got %q", action)
	}
	if idx != nil {
		t.Errorf("expected nil index, got %v", *idx)
	}
}

func TestProcessNPCTurn_Fallback(t *testing.T) {
	Initialize(nil)

	state := createTestNPCState()
	action, idx := ProcessNPCTurn(state)

	// With 10 credits and an affordable offer, fallback should buy index 0
	if action != "buy" {
		t.Errorf("expected fallback 'buy', got %q", action)
	}
	if idx == nil || *idx != 0 {
		t.Errorf("expected index 0, got %v", idx)
	}
}

func TestProcessNPCTurn_RerollFallback(t *testing.T) {
	Initialize(nil)

	state := NPCSessionState{
		ID:        "reroll-npc",
		Credits:   1,
		Archetype: "combo",
		ShopOffers: []brainclient.ShopOffer{
			{ShopIndex: 0, CardID: "virus_001", Cost: 3},
		},
	}
	action, idx := ProcessNPCTurn(state)

	if action != "reroll" && action != "skip" {
		t.Errorf("expected 'reroll' or 'skip', got %q", action)
	}
	if idx != nil {
		t.Errorf("expected nil index, got %v", *idx)
	}
}

func TestProcessNPCTurn_ErrorFallback(t *testing.T) {
	// Mock client that returns an error -> fallback to template
	mock := brainclient.ErrorClient(assertAnError{})
	Initialize(mock)
	defer Initialize(nil)

	state := createTestNPCState()
	action, idx := ProcessNPCTurn(state)

	// Should fallback to template AI
	if action != "buy" {
		t.Errorf("expected fallback 'buy', got %q", action)
	}
	if idx == nil || *idx != 0 {
		t.Errorf("expected index 0, got %v", idx)
	}
}

type assertAnError struct{}

func (e assertAnError) Error() string {
	return "simulated error"
}

func TestGenerateShop(t *testing.T) {
	offers := GenerateShop("test-player", 3)
	if len(offers) != 3 {
		t.Errorf("expected 3 offers, got %d", len(offers))
	}
	for i, offer := range offers {
		if offer.ShopIndex != i {
			t.Errorf("offer[%d].ShopIndex = %d, want %d", i, offer.ShopIndex, i)
		}
		if offer.CardID == "" {
			t.Errorf("offer[%d].CardID is empty", i)
		}
		if offer.Cost <= 0 {
			t.Errorf("offer[%d].Cost = %d, want > 0", i, offer.Cost)
		}
	}
}

func TestCreateNPC(t *testing.T) {
	npc := CreateNPC("test-bot", "aggressive")
	if npc == nil {
		t.Fatal("expected non-nil NPC")
	}
	if npc.ID != "test-bot" {
		t.Errorf("expected ID 'test-bot', got %q", npc.ID)
	}
	if npc.Archetype != "aggressive" {
		t.Errorf("expected Archetype 'aggressive', got %q", npc.Archetype)
	}
	if npc.Credits != 10 {
		t.Errorf("expected Credits 10, got %d", npc.Credits)
	}
}

func TestNPCShopPhase(t *testing.T) {
	Initialize(nil)
	npc := CreateNPC("phase-test", "control")
	action, idx := NPCShopPhase(npc)

	// Should not panic and return a valid action
	if action != "buy" && action != "reroll" && action != "skip" {
		t.Errorf("unexpected action %q", action)
	}
	_ = idx
}

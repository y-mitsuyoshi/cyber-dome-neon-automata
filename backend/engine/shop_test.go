package engine

import (
	"errors"
	"testing"

	"backend/brainclient"
	"backend/models"
)

func intPtr(i int) *int {
	return &i
}

func TestNPCPurchase_WithBrainClientBuy(t *testing.T) {
	mock := &brainclient.MockClient{
		Response: &brainclient.ShopResponse{
			Version:   "1.0",
			Action:    "buy",
			CardIndex: intPtr(0),
			Reason:    "test",
		},
	}
	SetDecisionClient(mock)
	defer SetDecisionClient(nil)

	npc := &models.NPCState{
		ID:        "npc1",
		Credits:   10,
		Archetype: "aggressive",
		Hand:      []models.Card{},
		Deck:      []models.Card{},
		Memory:    []models.MemorySlot{},
	}
	shopCards := []models.Card{
		{ID: "card1", Cost: 5},
		{ID: "card2", Cost: 8},
	}

	action, index := NPCPurchase(npc, shopCards)
	if action != "buy" || index != 0 {
		t.Errorf("expected buy with index 0, got %s %d", action, index)
	}
}

func TestNPCPurchase_FallbackOnError(t *testing.T) {
	mock := &brainclient.MockClient{
		Err: errors.New("brain unavailable"),
	}
	SetDecisionClient(mock)
	defer SetDecisionClient(nil)

	npc := &models.NPCState{
		Credits: 0,
		Hand:    []models.Card{},
		Deck:    []models.Card{},
		Memory:  []models.MemorySlot{},
	}
	shopCards := []models.Card{
		{ID: "expensive", Cost: 100},
	}

	action, _ := NPCPurchase(npc, shopCards)
	if action != "skip" && action != "reroll" {
		t.Errorf("expected skip or reroll, got %s", action)
	}
}

func TestNPCPurchase_FallbackOnInvalidBuyIndex(t *testing.T) {
	mock := &brainclient.MockClient{
		Response: &brainclient.ShopResponse{
			Version:   "1.0",
			Action:    "buy",
			CardIndex: intPtr(10), // out of range
		},
	}
	SetDecisionClient(mock)
	defer SetDecisionClient(nil)

	npc := &models.NPCState{
		Credits: 5,
		Hand:    []models.Card{},
		Deck:    []models.Card{},
		Memory:  []models.MemorySlot{},
	}
	shopCards := []models.Card{
		{ID: "affordable", Cost: 3},
	}

	action, index := NPCPurchase(npc, shopCards)
	if action != "buy" || index != 0 {
		t.Errorf("expected fallback to template buy (index 0), got %s %d", action, index)
	}
}

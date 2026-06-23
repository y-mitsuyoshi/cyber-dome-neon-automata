package engine

import (
	"context"
	"log"
	"time"

	"backend/brainclient"
)

// NPCSessionState holds state for the NPC decision process.
type NPCSessionState struct {
	ID          string
	Credits     int
	Archetype   string
	WinCount    int
	FanCount    int
	ShopOffers  []brainclient.ShopOffer
	OwnedCards  []brainclient.OwnedCard
	MemorySlots []brainclient.MemorySlot
}

// NPCStrategy defines an NPC archetype/strategy.
type NPCStrategy struct {
	Name string
}

// NPCStrategies returns the available NPC strategies.
var NPCStrategies = []NPCStrategy{
	{Name: "aggressive"},
	{Name: "combo"},
	{Name: "control"},
}

// CreateNPC creates a new NPCSessionState with the given parameters.
func CreateNPC(id, archetype string) *NPCSessionState {
	return &NPCSessionState{
		ID:        id,
		Credits:   10,
		Archetype: archetype,
	}
}

// NPCShopPhase processes an NPC's shop turn and returns the action and optional card index.
func NPCShopPhase(npc *NPCSessionState) (string, *int) {
	return GetNPCAction(*npc)
}

// GenerateShop generates a slice of shop offers for a player.
func GenerateShop(playerID string, count int) []brainclient.ShopOffer {
	offers := make([]brainclient.ShopOffer, count)
	cardIDs := []string{"virus_001", "ai_001", "hw_001", "nr_001", "virus_002"}
	for i := 0; i < count && i < len(cardIDs); i++ {
		offers[i] = brainclient.ShopOffer{
			ShopIndex: i,
			CardID:    cardIDs[i],
			Cost:      3,
		}
	}
	return offers
}

// GetNPCAction determines the NPC's shop action.
// It uses the global Brain Client if available, otherwise falls back to template AI.
func GetNPCAction(state NPCSessionState) (action string, cardIndex *int) {
	client := GetBrainClient()
	if client != nil {
		req := buildShopRequest(state)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		resp, err := client.GetShopDecision(ctx, req)
		if err == nil {
			return resp.Action, resp.CardIndex
		}
		log.Printf("Brain client error: %v; falling back to template AI", err)
	}
	return fallbackNPCAction(state)
}

// buildShopRequest converts NPCSessionState to ShopRequest.
func buildShopRequest(state NPCSessionState) *brainclient.ShopRequest {
	return &brainclient.ShopRequest{
		Version:     brainclient.DefaultVersion,
		PlayerID:    state.ID,
		Credits:     state.Credits,
		Archetype:   state.Archetype,
		WinCount:    state.WinCount,
		FanCount:    state.FanCount,
		ShopOffers:  state.ShopOffers,
		OwnedCards:  state.OwnedCards,
		MemorySlots: state.MemorySlots,
	}
}

// fallbackNPCAction implements a simple rule-based decision.
func fallbackNPCAction(state NPCSessionState) (string, *int) {
	if state.Credits >= 3 {
		for i, offer := range state.ShopOffers {
			if offer.Cost <= state.Credits {
				idx := i
				return "buy", &idx
			}
		}
	}
	if state.Credits >= 1 && len(state.ShopOffers) < 5 {
		return "reroll", nil
	}
	return "skip", nil
}

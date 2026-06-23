package engine

import (
	"context"
	"log"

	"backend/brainclient"
)

// NPCSessionState holds the data needed for NPC AI decision making.
type NPCSessionState struct {
	PlayerID    string
	Credits     int
	Archetype   string
	WinCount    int
	FanCount    int
	ShopOffers  []brainclient.ShopOffer
	OwnedCards  []brainclient.OwnedCard
	MemorySlots []brainclient.MemorySlot
}

// NPCNames is a list of NPC names available for the tournament.
var NPCNames = []string{"Neo", "Trinity", "Morpheus", "Cypher", "Agent Smith"}

// NPCStrategies maps NPC names to their archetype strategies.
var NPCStrategies = map[string]string{
	"Neo":        "aggressive",
	"Trinity":    "combo",
	"Morpheus":   "control",
	"Cypher":     "aggressive",
	"Agent Smith": "control",
}

// NPCConfig holds the configuration for an NPC player.
type NPCConfig struct {
	Name      string
	Archetype string
}

// CreateNPC creates an NPC configuration with the given name.
func CreateNPC(name string) *NPCConfig {
	strategy, ok := NPCStrategies[name]
	if !ok {
		strategy = "control"
	}
	return &NPCConfig{Name: name, Archetype: strategy}
}

// GetNPCAction returns an action ("buy", "reroll", "delete", "skip") and an optional card index.
// It tries to use the provided DecisionClient first; if nil or an error occurs, it falls back to the template AI.
func GetNPCAction(ctx context.Context, npcState NPCSessionState, client brainclient.DecisionClient) (string, *int) {
	if client != nil {
		req := &brainclient.ShopRequest{
			PlayerID:    npcState.PlayerID,
			Credits:     npcState.Credits,
			Archetype:   npcState.Archetype,
			WinCount:    npcState.WinCount,
			FanCount:    npcState.FanCount,
			ShopOffers:  npcState.ShopOffers,
			OwnedCards:  npcState.OwnedCards,
			MemorySlots: npcState.MemorySlots,
		}
		resp, err := client.GetShopDecision(ctx, req)
		if err == nil && resp != nil {
			switch resp.Action {
			case "buy", "reroll", "delete", "skip":
				return resp.Action, resp.CardIndex
			default:
				log.Printf("NPC: unknown action from brain: %s, falling back", resp.Action)
			}
		} else if err != nil {
			log.Printf("NPC: brain client error: %v, falling back", err)
		}
	}
	return templateNPCAction(npcState)
}

// templateNPCAction is the fallback AI logic (template).
func templateNPCAction(npcState NPCSessionState) (string, *int) {
	// Simple heuristic: buy the first affordable card.
	for _, offer := range npcState.ShopOffers {
		if npcState.Credits >= offer.Cost {
			idx := offer.ShopIndex
			return "buy", &idx
		}
	}
	// If nothing affordable or no offers, reroll.
	return "reroll", nil
}

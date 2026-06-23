package engine

import (
	"context"
	"log"

	"backend/brainclient"
)

// GlobalDecisionClient is injected from main and used in shop processing.
var GlobalDecisionClient brainclient.DecisionClient

// ProcessNPCTurn handles a single NPC shop decision.
func ProcessNPCTurn(state NPCSessionState) (string, *int) {
	return GetNPCAction(context.Background(), state, GlobalDecisionClient)
}

// PreprocessNPCState converts internal game state to NPCSessionState.
func PreprocessNPCState(
	playerID string,
	credits int,
	archetype string,
	winCount, fanCount int,
	shopOffers []ShopOfferEntry,
	ownedCards []OwnedCardEntry,
	memorySlots []MemorySlotEntry,
) NPCSessionState {
	offers := make([]brainclient.ShopOffer, len(shopOffers))
	for i, o := range shopOffers {
		offers[i] = brainclient.ShopOffer{
			ShopIndex: o.Index,
			CardID:    o.CardID,
			Cost:      o.Cost,
		}
	}
	owned := make([]brainclient.OwnedCard, len(ownedCards))
	for i, c := range ownedCards {
		owned[i] = brainclient.OwnedCard{
			OwnedIndex: c.Index,
			CardID:     c.CardID,
			Location:   c.Location,
		}
	}
	slots := make([]brainclient.MemorySlot, len(memorySlots))
	for i, s := range memorySlots {
		slots[i] = brainclient.MemorySlot{
			BaseCardID: s.BaseCardID,
			Count:      s.Count,
		}
	}

	return NPCSessionState{
		PlayerID:    playerID,
		Credits:     credits,
		Archetype:   archetype,
		WinCount:    winCount,
		FanCount:    fanCount,
		ShopOffers:  offers,
		OwnedCards:  owned,
		MemorySlots: slots,
	}
}

// ShopOfferEntry is an internal representation of a shop offer.
type ShopOfferEntry struct {
	Index  int
	CardID string
	Cost   int
}

// OwnedCardEntry is an internal representation of an owned card.
type OwnedCardEntry struct {
	Index    int
	CardID   string
	Location string
}

// MemorySlotEntry is an internal representation of a memory slot.
type MemorySlotEntry struct {
	BaseCardID string
	Count      int
}

// SetDecisionClient sets the global decision client.
func SetDecisionClient(client brainclient.DecisionClient) {
	GlobalDecisionClient = client
	log.Println("NPC: GlobalDecisionClient set")
}

// NPCShopPhase performs a full shop phase for an NPC player.
func NPCShopPhase(credits int, archetype string, shopOffers []ShopOfferEntry, ownedCards []OwnedCardEntry, memorySlots []MemorySlotEntry, client brainclient.DecisionClient) (string, *int) {
	state := PreprocessNPCState("npc", credits, archetype, 0, 0, shopOffers, ownedCards, memorySlots)
	return GetNPCAction(context.Background(), state, client)
}

// GenerateShop generates a list of shop offers from the card pool.
func GenerateShop(archetype string, count int) []ShopOfferEntry {
	offers := make([]ShopOfferEntry, count)
	for i := 0; i < count; i++ {
		offers[i] = ShopOfferEntry{Index: i, CardID: "ai_001", Cost: 3}
	}
	return offers
}

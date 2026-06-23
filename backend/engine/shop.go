package engine

import (
	"context"
	"log"
	"math/rand"
	"time"

	"backend/brainclient"
	"backend/models"
)

// decisionClient is the global decision client (can be nil for fallback).
var decisionClient brainclient.DecisionClient

// SetDecisionClient sets the global decision client.
func SetDecisionClient(c brainclient.DecisionClient) {
	decisionClient = c
}

// NPCPurchase makes a purchase decision for an NPC.
func NPCPurchase(npc *models.NPCState, shopCards []models.Card) (action string, targetIndex int) {
	if decisionClient != nil {
		req := buildShopRequest(npc, shopCards)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		resp, err := decisionClient.GetShopDecision(ctx, req)
		if err != nil {
			log.Printf("brain client error: %v, falling back to template AI", err)
		} else {
			log.Printf("brain decision: %s (index %v, reason: %s)", resp.Action, resp.CardIndex, resp.Reason)
			switch resp.Action {
			case "buy":
				if resp.CardIndex != nil {
					for i := range shopCards {
						if i == *resp.CardIndex {
							return "buy", i
						}
					}
				}
			case "reroll":
				return "reroll", 0
			case "skip":
				return "skip", 0
			case "delete":
				if resp.CardIndex != nil {
					return "delete", *resp.CardIndex
				}
			}
		}
	}
	// Fallback to template AI
	return templateNPCPurchase(npc, shopCards)
}

func buildShopRequest(npc *models.NPCState, shopCards []models.Card) *brainclient.ShopRequest {
	offers := make([]brainclient.ShopOffer, len(shopCards))
	for i, card := range shopCards {
		offers[i] = brainclient.ShopOffer{
			ShopIndex: i,
			CardID:    card.ID,
			Cost:      card.Cost,
		}
	}
	owned := []brainclient.OwnedCard{}
	for i, card := range npc.Hand {
		owned = append(owned, brainclient.OwnedCard{
			OwnedIndex: i,
			CardID:     card.ID,
			Location:   "hand",
		})
	}
	for i, card := range npc.Deck {
		owned = append(owned, brainclient.OwnedCard{
			OwnedIndex: len(npc.Hand) + i,
			CardID:     card.ID,
			Location:   "deck",
		})
	}
	memSlots := []brainclient.MemorySlot{}
	for _, slot := range npc.Memory {
		memSlots = append(memSlots, brainclient.MemorySlot{
			BaseCardID: slot.BaseCardID,
			Count:      slot.Count,
		})
	}
	return &brainclient.ShopRequest{
		PlayerID:    npc.ID,
		Credits:     npc.Credits,
		Archetype:   npc.Archetype,
		WinCount:    npc.WinCount,
		FanCount:    npc.FanCount,
		ShopOffers:  offers,
		OwnedCards:  owned,
		MemorySlots: memSlots,
	}
}

// templateNPCPurchase is the original template AI logic.
func templateNPCPurchase(npc *models.NPCState, shopCards []models.Card) (action string, targetIndex int) {
	for i, card := range shopCards {
		if npc.Credits >= card.Cost {
			return "buy", i
		}
	}
	if len(shopCards) > 0 && rand.Intn(2) == 0 {
		return "reroll", 0
	}
	return "skip", 0
}

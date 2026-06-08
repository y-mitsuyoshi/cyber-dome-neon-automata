package engine

import (
	"backend/models"
)

// NPCNames is a list of NPC names for the tournament.
var NPCNames = []string{
	"ZERO_COOL",
	"ACID_BURN",
	"CRASH_OVERRIDE",
	"PHANTOM_PHREAK",
	"CEREAL_KILLER",
	"LORD_NIKON",
	"THE_PLAGUE",
	"NIGHT_WAV",
	"CYBER_PUNK",
	"GRID_SHADOW",
}

// NPCStrategies assigns AI strategies.
var NPCStrategies = []string{
	"Aggro",
	"Combo",
	"Control",
}

// CreateNPC generates an NPC player with a starting deck and strategy.
func CreateNPC(name string, strategy string) models.Player {
	deck := StarterDeck()
	deckClone := make([]models.Card, len(deck))
	for i, c := range deck {
		deckClone[i] = c.Clone()
	}

	return models.Player{
		Name:       name,
		Credits:    10, // Symmetrical starting credits
		Deck:       deckClone,
		Wins:       0,
		Fans:       0,
		IsNPC:      true,
		AIStrategy: strategy,
	}
}

// NPCShopPhase simulates a symmetrical shop phase for an NPC player.
func NPCShopPhase(gs *models.GameState, npc *models.Player, round int) {
	strategy := npc.AIStrategy
	
	// Max 3 purchase/reroll iterations to prevent infinite loops and simulate human speed
	for iter := 0; iter < 3; iter++ {
		// Generate standard shop of 5 cards using the shared pool
		shop := GenerateShop(gs, round)
		boughtAny := false

		// 1. Evaluate and buy matching cards
		remainingCards := make([]models.Card, 0, len(shop.Cards))
		for _, card := range shop.Cards {
			isPreferred := false
			// Adapt to new attributes: Castle, City, Space, Movie, Shipwreck, Ghost, Fairground
			// Aggro: Movie, Ghost
			// Combo: Space, Fairground
			// Control: Castle, City, Shipwreck
			switch strategy {
			case "Aggro":
				isPreferred = (card.Attribute == "Movie" || card.Attribute == "Ghost")
			case "Combo":
				isPreferred = (card.Attribute == "Space" || card.Attribute == "Fairground")
			case "Control":
				isPreferred = (card.Attribute == "Castle" || card.Attribute == "City" || card.Attribute == "Shipwreck")
			}

			cost := card.RarityCost()
			if isPreferred && npc.Credits >= cost {
				// Buy the card!
				npc.Credits -= cost
				npc.Deck = append(npc.Deck, card.Clone())
				boughtAny = true
			} else {
				remainingCards = append(remainingCards, card)
			}
		}
		
		// Return unbought cards to the pool
		ReturnCardsToPool(gs, remainingCards)

		// 2. Reroll decision: If didn't buy anything, has >= 3 credits, and has iteration left, spend 1 credit to reroll
		if !boughtAny && npc.Credits >= 3 && iter < 2 {
			npc.Credits-- // Spend 1 credit to reroll
			// Loop continues to generate a new shop next iteration
		} else {
			// Done buying for this round
			break
		}
	}

	// 3. Compact deck: If deck is getting bloated (> 10 cards)
	// delete a card that does NOT match their strategy archetype. Deletion is free.
	if len(npc.Deck) > 10 {
		deleteIdx := -1
		for i, card := range npc.Deck {
			isNonMatching := false
			switch strategy {
			case "Aggro":
				isNonMatching = (card.Attribute != "Movie" && card.Attribute != "Ghost")
			case "Combo":
				isNonMatching = (card.Attribute != "Space" && card.Attribute != "Fairground")
			case "Control":
				isNonMatching = (card.Attribute != "Castle" && card.Attribute != "City" && card.Attribute != "Shipwreck")
			}

			if isNonMatching {
				deleteIdx = i
				break
			}
		}

		if deleteIdx != -1 {
			// Delete card for free
			npc.Deck = append(npc.Deck[:deleteIdx], npc.Deck[deleteIdx+1:]...)
		}
	}
}

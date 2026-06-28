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

		// 1. Evaluate and buy matching cards — score by attribute + power + synergy
		remainingCards := make([]models.Card, 0, len(shop.Cards))
		for _, card := range shop.Cards {
			isPreferred := false
			// Adapt to new attributes: Mainframe, Sector, Orbit, HoloMedia, DeepWeb, Daemon, Matrix
			// Aggro: HoloMedia, Daemon
			// Combo: Orbit, Matrix
			// Control: Mainframe, Sector, DeepWeb
			switch strategy {
			case "Aggro":
				isPreferred = (card.Attribute == "HoloMedia" || card.Attribute == "Daemon")
			case "Combo":
				isPreferred = (card.Attribute == "Orbit" || card.Attribute == "Matrix")
			case "Control":
				isPreferred = (card.Attribute == "Mainframe" || card.Attribute == "Sector" || card.Attribute == "DeepWeb")
			}

			cost := card.RarityCost()
			if !isPreferred && npc.Credits >= cost && card.Power >= 7 {
				// High-power off-strategy cards are still worth grabbing late
				isPreferred = true
			}
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
	// delete cards that do NOT match their strategy archetype. Deletion is free.
	for len(npc.Deck) > 10 {
		deleteIdx := -1
		lowestPower := 999
		for i, card := range npc.Deck {
			isNonMatching := false
			switch strategy {
			case "Aggro":
				isNonMatching = (card.Attribute != "HoloMedia" && card.Attribute != "Daemon")
			case "Combo":
				isNonMatching = (card.Attribute != "Orbit" && card.Attribute != "Matrix")
			case "Control":
				isNonMatching = (card.Attribute != "Mainframe" && card.Attribute != "Sector" && card.Attribute != "DeepWeb")
			}

			if isNonMatching && card.Power < lowestPower {
				deleteIdx = i
				lowestPower = card.Power
			}
		}

		if deleteIdx != -1 {
			// Delete the lowest-power non-matching card for free
			npc.Deck = append(npc.Deck[:deleteIdx], npc.Deck[deleteIdx+1:]...)
		} else {
			// No non-matching cards left; stop to avoid deleting strategy cards
			break
		}
	}
}

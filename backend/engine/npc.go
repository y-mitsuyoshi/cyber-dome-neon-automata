package engine

import (
	"backend/models"
	"math/rand"
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
	pool := AllCards()
	// Symmetrical starting deck size: 6 cards, just like humans
	deck := buildBiasedDeck(pool, strategy, 6)

	return models.Player{
		Name:       name,
		Credits:    10, // Symmetrical starting credits
		Deck:       deck,
		Wins:       0,
		Fans:       0,
		IsNPC:      true,
		AIStrategy: strategy,
	}
}

// buildBiasedDeck creates a starting deck biased toward the given strategy.
func buildBiasedDeck(pool []models.Card, strategy string, size int) []models.Card {
	var preferred []models.Card
	var others []models.Card

	for _, c := range pool {
		switch strategy {
		case "Aggro":
			if c.Attribute == "Virus" {
				preferred = append(preferred, c)
			} else {
				others = append(others, c)
			}
		case "Combo":
			if c.Attribute == "AI" {
				preferred = append(preferred, c)
			} else {
				others = append(others, c)
			}
		case "Control":
			if c.Attribute == "Hardware" || c.Attribute == "Netrunner" {
				preferred = append(preferred, c)
			} else {
				others = append(others, c)
			}
		}
	}

	deck := make([]models.Card, 0, size)

	// 70% preferred, 30% others for starting deck flavor
	preferredCount := (size * 70) / 100
	if preferredCount < 1 {
		preferredCount = 1
	}

	for i := 0; i < preferredCount && len(preferred) > 0; i++ {
		idx := rand.Intn(len(preferred))
		deck = append(deck, preferred[idx].Clone())
	}

	for len(deck) < size {
		if len(others) > 0 {
			idx := rand.Intn(len(others))
			deck = append(deck, others[idx].Clone())
		} else if len(preferred) > 0 {
			idx := rand.Intn(len(preferred))
			deck = append(deck, preferred[idx].Clone())
		}
	}

	// Shuffle deck
	rand.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})

	return deck
}

// NPCShopPhase simulates a symmetrical shop phase for an NPC player.
// They receive 10 new credits (handled outside or inside this function),
// then browse cards, buy matching ones, reroll if credits allow, and delete bad cards.
func NPCShopPhase(npc *models.Player) {
	strategy := npc.AIStrategy
	
	// Max 3 purchase/reroll iterations to prevent infinite loops and simulate human speed
	for iter := 0; iter < 3; iter++ {
		// Generate standard shop of 3 cards
		shop := GenerateShop(npc.Credits)
		boughtAny := false

		// 1. Evaluate and buy matching cards
		remainingCards := make([]models.Card, 0, len(shop.Cards))
		for _, card := range shop.Cards {
			isPreferred := false
			switch strategy {
			case "Aggro":
				isPreferred = (card.Attribute == "Virus")
			case "Combo":
				isPreferred = (card.Attribute == "AI")
			case "Control":
				isPreferred = (card.Attribute == "Hardware" || card.Attribute == "Netrunner")
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
		shop.Cards = remainingCards

		// 2. Reroll decision: If didn't buy anything, has >= 3 credits, and has iteration left, spend 1 credit to reroll
		if !boughtAny && npc.Credits >= 3 && iter < 2 {
			npc.Credits-- // Spend 1 credit to reroll
			// Loop continues to generate a new shop next iteration
		} else {
			// Done buying for this round
			break
		}
	}

	// 3. Compact deck: If deck is getting bloated (> 10 cards) and they have >= 2 credits,
	// delete a card that does NOT match their strategy archetype.
	if len(npc.Deck) > 10 && npc.Credits >= 2 {
		deleteIdx := -1
		for i, card := range npc.Deck {
			isNonMatching := false
			switch strategy {
			case "Aggro":
				isNonMatching = (card.Attribute != "Virus")
			case "Combo":
				isNonMatching = (card.Attribute != "AI")
			case "Control":
				isNonMatching = (card.Attribute != "Hardware" && card.Attribute != "Netrunner")
			}

			if isNonMatching {
				deleteIdx = i
				break
			}
		}

		if deleteIdx != -1 {
			// Delete card and pay 2 credits
			npc.Credits -= 2
			npc.Deck = append(npc.Deck[:deleteIdx], npc.Deck[deleteIdx+1:]...)
		}
	}
}

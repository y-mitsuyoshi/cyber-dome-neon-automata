package engine

import (
	"backend/models"
	"fmt"
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
}

// NPCStrategies assigns AI strategies in the required distribution.
var NPCStrategies = []string{
	"Aggro",   // ZERO_COOL
	"Aggro",   // ACID_BURN
	"Aggro",   // CRASH_OVERRIDE
	"Combo",   // PHANTOM_PHREAK
	"Combo",   // CEREAL_KILLER
	"Control", // LORD_NIKON
	"Control", // THE_PLAGUE
}

// CreateNPCs generates 7 NPCs with biased starting decks.
func CreateNPCs() []models.Player {
	npcs := make([]models.Player, 7)
	pool := AllCards()

	for i := 0; i < 7; i++ {
		strategy := NPCStrategies[i]
		deck := buildBiasedDeck(pool, strategy, 6)

		npcs[i] = models.Player{
			Name:       NPCNames[i],
			Credits:    0,
			Deck:       deck,
			Wins:       0,
			Fans:       0,
			IsNPC:      true,
			AIStrategy: strategy,
		}
	}
	return npcs
}

// buildBiasedDeck creates a deck biased toward the given strategy.
func buildBiasedDeck(pool []models.Card, strategy string, size int) []models.Card {
	// Get preferred cards
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

	// 70% preferred, 30% others
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

	// Shuffle
	rand.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})

	return deck
}

// NPCShopPhase simulates an NPC buying 1-2 cards to add to their deck each round.
func NPCShopPhase(npc *models.Player) {
	pool := AllCards()
	cardsToAdd := 1 + rand.Intn(2) // 1 or 2 cards

	for i := 0; i < cardsToAdd; i++ {
		newCard := pickBiasedCard(pool, npc.AIStrategy)
		npc.Deck = append(npc.Deck, newCard.Clone())
	}
}

// pickBiasedCard picks a card biased toward the NPC's strategy.
func pickBiasedCard(pool []models.Card, strategy string) models.Card {
	// 70% chance to pick from preferred, 30% random
	if rand.Intn(100) < 70 {
		var preferred []models.Card
		for _, c := range pool {
			switch strategy {
			case "Aggro":
				if c.Attribute == "Virus" {
					preferred = append(preferred, c)
				}
			case "Combo":
				if c.Attribute == "AI" {
					preferred = append(preferred, c)
				}
			case "Control":
				if c.Attribute == "Hardware" || c.Attribute == "Netrunner" {
					preferred = append(preferred, c)
				}
			}
		}
		if len(preferred) > 0 {
			return preferred[rand.Intn(len(preferred))]
		}
	}
	return pool[rand.Intn(len(pool))]
}

// RunNPCBattles simulates battles between all NPCs that aren't fighting the player this round.
func RunNPCBattles(npcs []models.Player, playerOpponentIndex int) []string {
	var results []string
	// Pair up remaining NPCs
	available := make([]int, 0)
	for i := range npcs {
		if i != playerOpponentIndex {
			available = append(available, i)
		}
	}

	// Shuffle and pair
	rand.Shuffle(len(available), func(i, j int) {
		available[i], available[j] = available[j], available[i]
	})

	for i := 0; i+1 < len(available); i += 2 {
		a := available[i]
		b := available[i+1]

		deckA := npcs[a].CloneDeck()
		deckB := npcs[b].CloneDeck()
		rand.Shuffle(len(deckA), func(x, y int) { deckA[x], deckA[y] = deckA[y], deckA[x] })
		rand.Shuffle(len(deckB), func(x, y int) { deckB[x], deckB[y] = deckB[y], deckB[x] })

		result := RunBattle(deckA, deckB)
		if result.Winner == "player" {
			// In NPC vs NPC, "player" means side A won
			npcs[a].Wins++
			npcs[a].Fans += result.FansGained
			results = append(results, fmt.Sprintf("%s defeated %s", npcs[a].Name, npcs[b].Name))
		} else {
			npcs[b].Wins++
			npcs[b].Fans += result.FansGained
			results = append(results, fmt.Sprintf("%s defeated %s", npcs[b].Name, npcs[a].Name))
		}
	}

	// If odd NPC left, they get a bye (no battle)
	if len(available)%2 == 1 {
		byeIdx := available[len(available)-1]
		npcs[byeIdx].Fans++
		results = append(results, fmt.Sprintf("%s got a bye", npcs[byeIdx].Name))
	}

	return results
}

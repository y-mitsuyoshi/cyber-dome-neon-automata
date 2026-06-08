package engine

import (
	"backend/models"
	"math/rand"
)

// GenerateShop creates a shop with 5 cards from the shared pool based on the current round.
func GenerateShop(gs *models.GameState, round int) models.ShopState {
	var pool *[]models.Card
	if round <= 2 {
		pool = &gs.DeckAPool
	} else if round <= 4 {
		pool = &gs.DeckBPool
	} else {
		pool = &gs.DeckCPool
	}

	cards := make([]models.Card, 5)
	for i := 0; i < 5; i++ {
		cards[i] = popCardFromPool(pool, round)
	}

	return models.ShopState{
		Cards:   cards,
		Credits: 0,
	}
}

func popCardFromPool(pool *[]models.Card, round int) models.Card {
	if len(*pool) == 0 {
		// Fallback: generate a random card belonging to the correct deck category
		all := AllCards()
		var targetDeck string
		if round <= 2 {
			targetDeck = "A"
		} else if round <= 4 {
			targetDeck = "B"
		} else {
			targetDeck = "C"
		}
		
		var matchingCards []models.Card
		for _, c := range all {
			if c.Deck == targetDeck {
				matchingCards = append(matchingCards, c)
			}
		}
		if len(matchingCards) > 0 {
			return matchingCards[rand.Intn(len(matchingCards))].Clone()
		}
		return all[rand.Intn(len(all))].Clone()
	}
	
	idx := rand.Intn(len(*pool))
	card := (*pool)[idx]
	*pool = append((*pool)[:idx], (*pool)[idx+1:]...)
	return card
}

// ReturnCardsToPool returns cards back to their respective shared deck pools.
func ReturnCardsToPool(gs *models.GameState, cards []models.Card) {
	for _, c := range cards {
		if c.Deck == "A" {
			gs.DeckAPool = append(gs.DeckAPool, c)
		} else if c.Deck == "B" {
			gs.DeckBPool = append(gs.DeckBPool, c)
		} else if c.Deck == "C" {
			gs.DeckCPool = append(gs.DeckCPool, c)
		}
	}
}

// BuyCard attempts to buy a card from the shop at the given index.
// Returns the updated shop, remaining credits, the purchased card, and an error message.
func BuyCard(shop *models.ShopState, deck *[]models.Card, credits int, cardIndex int) (int, *models.Card, string) {
	if cardIndex < 0 || cardIndex >= len(shop.Cards) {
		return credits, nil, "Invalid card index"
	}

	card := shop.Cards[cardIndex]
	cost := card.RarityCost()

	if credits < cost {
		return credits, nil, "Not enough credits"
	}

	credits -= cost
	*deck = append(*deck, card.Clone())

	// Remove the card from shop
	shop.Cards = append(shop.Cards[:cardIndex], shop.Cards[cardIndex+1:]...)
	shop.Credits = credits

	return credits, &card, ""
}

// DeleteCard removes a card from the player's deck at the given index. Costs 0 credits (Free).
func DeleteCard(deck *[]models.Card, credits int, cardIndex int) (int, *models.Card, string) {
	if cardIndex < 0 || cardIndex >= len(*deck) {
		return credits, nil, "Invalid card index"
	}

	deleted := (*deck)[cardIndex]
	*deck = append((*deck)[:cardIndex], (*deck)[cardIndex+1:]...)

	return credits, &deleted, ""
}

// RerollShop spends 1 credit, returns old shop cards to the pool, and draws 5 new cards.
func RerollShop(gs *models.GameState, shop *models.ShopState, credits int, round int) (int, string) {
	if credits < 1 {
		return credits, "Not enough credits to reroll"
	}
	credits -= 1

	// Return current shop cards to the shared pool
	ReturnCardsToPool(gs, shop.Cards)

	// Generate a new shop
	newShop := GenerateShop(gs, round)
	shop.Cards = newShop.Cards
	shop.Credits = credits

	return credits, ""
}

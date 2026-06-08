package engine

import (
	"backend/models"
	"math/rand"
)

// GenerateShop creates a shop with 3 random cards from the pool based on the current round's rarity progression.
func GenerateShop(credits int, round int) models.ShopState {
	pool := AllCards()

	// Separate cards by rarity
	var commons []models.Card
	var rares []models.Card
	var epics []models.Card

	for _, c := range pool {
		switch c.Rarity {
		case "Common":
			commons = append(commons, c)
		case "Rare":
			rares = append(rares, c)
		case "Epic":
			epics = append(epics, c)
		}
	}

	// Default probabilities (fallback)
	pCommon := 100
	pRare := 0
	pEpic := 0

	// Progression probabilities
	if round <= 2 {
		pCommon = 90
		pRare = 10
		pEpic = 0
	} else if round <= 4 {
		pCommon = 50
		pRare = 40
		pEpic = 10
	} else {
		pCommon = 25
		pRare = 50
		pEpic = 25
	}

	cards := make([]models.Card, 5)
	for i := 0; i < 5; i++ {
		roll := rand.Intn(100)
		var selectedCard models.Card

		if roll < pEpic && len(epics) > 0 {
			selectedCard = epics[rand.Intn(len(epics))]
		} else if roll < (pEpic + pRare) && len(rares) > 0 {
			selectedCard = rares[rand.Intn(len(rares))]
		} else if roll < (pEpic + pRare + pCommon) && len(commons) > 0 {
			selectedCard = commons[rand.Intn(len(commons))]
		} else {
			// Fallback to absolute random if something is empty
			selectedCard = pool[rand.Intn(len(pool))]
		}

		cards[i] = selectedCard.Clone()
	}

	return models.ShopState{
		Cards:   cards,
		Credits: credits,
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

// RerollShop regenerates the shop for 1 credit.
func RerollShop(shop *models.ShopState, credits int, round int) (int, string) {
	if credits < 1 {
		return credits, "Not enough credits to reroll"
	}
	credits--
	*shop = GenerateShop(credits, round)
	return credits, ""
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

package engine

import (
	"backend/models"
	"math/rand"
)

// GenerateShop creates a shop with 3 random cards from the pool.
func GenerateShop(credits int) models.ShopState {
	pool := AllCards()
	cards := make([]models.Card, 3)
	for i := 0; i < 3; i++ {
		cards[i] = pool[rand.Intn(len(pool))].Clone()
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
func RerollShop(shop *models.ShopState, credits int) (int, string) {
	if credits < 1 {
		return credits, "Not enough credits to reroll"
	}
	credits--
	*shop = GenerateShop(credits)
	return credits, ""
}

// DeleteCard removes a card from the player's deck at the given index. Costs 2 credits.
func DeleteCard(deck *[]models.Card, credits int, cardIndex int) (int, *models.Card, string) {
	if cardIndex < 0 || cardIndex >= len(*deck) {
		return credits, nil, "Invalid card index"
	}
	if credits < 2 {
		return credits, nil, "Not enough credits to delete (costs 2)"
	}

	credits -= 2
	deleted := (*deck)[cardIndex]
	*deck = append((*deck)[:cardIndex], (*deck)[cardIndex+1:]...)

	return credits, &deleted, ""
}

package brainclient

// ShopRequest represents a request to the Brain server for a shop decision.
type ShopRequest struct {
	Version     string       `json:"version"`
	PlayerID    string       `json:"player_id"`
	Credits     int          `json:"credits"`
	Archetype   string       `json:"archetype"`
	WinCount    int          `json:"win_count"`
	FanCount    int          `json:"fan_count"`
	ShopOffers  []ShopOffer  `json:"shop_offers"`
	OwnedCards  []OwnedCard  `json:"owned_cards"`
	MemorySlots []MemorySlot `json:"memory_slots,omitempty"`
}

// ShopOffer represents a single card in the shop.
type ShopOffer struct {
	ShopIndex int    `json:"shop_index"`
	CardID    string `json:"card_id"`
	Cost      int    `json:"cost"`
}

// OwnedCard represents a card owned by the player.
type OwnedCard struct {
	OwnedIndex int    `json:"owned_index"`
	CardID     string `json:"card_id"`
	Location   string `json:"location"`
}

// MemorySlot represents a stacked memory slot.
type MemorySlot struct {
	BaseCardID string `json:"base_card_id"`
	Count      int    `json:"count"`
}

// ShopResponse is the decision returned by the Brain server.
type ShopResponse struct {
	Version   string `json:"version"`
	Action    string `json:"action"`
	CardIndex *int   `json:"card_index,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

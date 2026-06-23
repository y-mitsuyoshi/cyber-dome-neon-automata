package brainclient

// MemorySlot represents a stacked card in the memory area.
type MemorySlot struct {
	BaseCardID string `json:"base_card_id"`
	Count      int    `json:"count"`
}

// ShopOffer represents a card on offer in the shop.
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

// ShopRequest is the request sent to the Brain Server.
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

// ShopResponse is the response from the Brain Server.
type ShopResponse struct {
	Version   string `json:"version"`
	Action    string `json:"action"`
	CardIndex *int   `json:"card_index,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

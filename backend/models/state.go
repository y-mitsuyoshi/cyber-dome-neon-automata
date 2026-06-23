package models

// MemorySlot represents a memory slot (bench).
type MemorySlot struct {
	BaseCardID string `json:"base_card_id"`
	Count      int    `json:"count"`
}

// NPCState holds the state of an NPC for decision making.
type NPCState struct {
	ID        string       `json:"id"`
	Credits   int          `json:"credits"`
	Archetype string       `json:"archetype"`
	WinCount  int          `json:"win_count"`
	FanCount  int          `json:"fan_count"`
	Hand      []Card       `json:"hand"`
	Deck      []Card       `json:"deck"`
	Memory    []MemorySlot `json:"memory"`
}

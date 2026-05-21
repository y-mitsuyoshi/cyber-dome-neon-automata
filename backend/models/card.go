package models

import (
	"math/rand"
	"sync"
)

// Card represents a single card in the game.
type Card struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Attribute  string `json:"attribute"`  // Virus, AI, Hardware, Netrunner
	Archetype  string `json:"archetype"`  // Aggro, Combo, Control
	Power      int    `json:"power"`
	Rarity     string `json:"rarity"`     // Common, Rare, Epic
	Effect     string `json:"effect"`
	EffectType string `json:"effectType"`
}

// RarityCost returns the credit cost based on rarity.
func (c Card) RarityCost() int {
	switch c.Rarity {
	case "Common":
		return 2
	case "Rare":
		return 4
	case "Epic":
		return 7
	default:
		return 2
	}
}

// Clone creates a deep copy of the card.
func (c Card) Clone() Card {
	return Card{
		ID:         c.ID,
		Name:       c.Name,
		Attribute:  c.Attribute,
		Archetype:  c.Archetype,
		Power:      c.Power,
		Rarity:     c.Rarity,
		Effect:     c.Effect,
		EffectType: c.EffectType,
	}
}

// MemorySlot represents a memory slot that holds stacked cards of the same name.
type MemorySlot struct {
	CardName string `json:"cardName"`
	Cards    []Card `json:"cards"`
	Count    int    `json:"count"`
}

// Player represents a player (human or NPC).
type Player struct {
	Name        string       `json:"name"`
	Credits     int          `json:"credits"`
	Deck        []Card       `json:"deck"`
	Wins        int          `json:"wins"`
	Fans        int          `json:"fans"`
	IsNPC       bool         `json:"isNpc"`
	AIStrategy  string       `json:"aiStrategy"` // Aggro, Combo, Control
	MemorySlots []MemorySlot `json:"-"`
}

// CloneDeck returns a copy of the player's deck.
func (p *Player) CloneDeck() []Card {
	deck := make([]Card, len(p.Deck))
	for i, c := range p.Deck {
		deck[i] = c.Clone()
	}
	return deck
}

// ShuffleDeck randomizes the deck order.
func (p *Player) ShuffleDeck() {
	rand.Shuffle(len(p.Deck), func(i, j int) {
		p.Deck[i], p.Deck[j] = p.Deck[j], p.Deck[i]
	})
}

// ShopState represents the current shop offerings.
type ShopState struct {
	Cards   []Card `json:"cards"`
	Credits int    `json:"credits"`
}

// BattleLogCard is a minimal card representation for the battle log.
type BattleLogCard struct {
	Name      string `json:"name"`
	Power     int    `json:"power"`
	Attribute string `json:"attribute"`
}

// BattleLogEntry represents a single step in the battle log.
type BattleLogEntry struct {
	Step             int             `json:"step"`
	Action           string          `json:"action"`
	Player           string          `json:"player"`
	Card             *BattleLogCard  `json:"card,omitempty"`
	CurrentPower     int             `json:"currentPower"`
	EffectTriggered  string          `json:"effectTriggered"`
	PlayerMemSlots   []string        `json:"playerMemSlots"`
	CPUMemSlots      []string        `json:"cpuMemSlots"`
	PlayerDeckCount  int             `json:"playerDeckCount"`
	CPUDeckCount     int             `json:"cpuDeckCount"`
	FlagHolder       string          `json:"flagHolder"`
	Details          string          `json:"details,omitempty"`
}

// BattleResult stores the outcome of a battle.
type BattleResult struct {
	Winner    string           `json:"winner"`
	Loser     string           `json:"loser"`
	Reason    string           `json:"reason"`
	Log       []BattleLogEntry `json:"log"`
	FansGained int             `json:"fansGained"`
}

// StandingsEntry represents a row in the standings table.
type StandingsEntry struct {
	Name   string `json:"name"`
	Wins   int    `json:"wins"`
	Fans   int    `json:"fans"`
	IsPlayer bool `json:"isPlayer"`
}

// GameState holds all data for a single game/tournament session.
type GameState struct {
	Mu           sync.Mutex     `json:"-"`
	GameID       string         `json:"gameId"`
	CurrentRound int            `json:"currentRound"`
	MaxRounds    int            `json:"maxRounds"`
	Phase        string         `json:"phase"` // shop, battle, results
	Player       Player         `json:"player"`
	NPCs         []Player       `json:"npcs"`
	Shop         ShopState      `json:"shop"`
	Standings    []StandingsEntry `json:"standings"`
	BattleLog    []BattleLogEntry `json:"battleLog"`
	LastResult   *BattleResult  `json:"lastResult,omitempty"`
}

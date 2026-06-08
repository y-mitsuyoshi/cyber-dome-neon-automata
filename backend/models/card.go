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
	Cost       int    `json:"cost"`
}

// RarityCost returns the credit cost based on rarity.
func (c Card) RarityCost() int {
	if c.Cost > 0 {
		return c.Cost
	}
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
		Cost:       c.Cost,
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
	Hand        []Card       `json:"hand"` // In-hand cards for interactive battle
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
	ID        string `json:"id,omitempty"`
	Name      string `json:"name"`
	Power     int    `json:"power"`
	BasePower int    `json:"basePower,omitempty"`
	Attribute string `json:"attribute"`
}

// BattleLogEntry represents a single step in the battle log.
type BattleLogEntry struct {
	Step             int             `json:"step"`
	Action           string          `json:"action"`
	Player           string          `json:"player"`
	Card             *BattleLogCard  `json:"card,omitempty"`
	P1Card           *BattleLogCard  `json:"p1Card,omitempty"`
	P2Card           *BattleLogCard  `json:"p2Card,omitempty"`
	P1Action         string          `json:"p1Action,omitempty"`
	P2Action         string          `json:"p2Action,omitempty"`
	CurrentPower     int             `json:"currentPower"`
	EffectTriggered  string          `json:"effectTriggered"`
	PlayerMemSlots   []string        `json:"playerMemSlots"`
	CPUMemSlots      []string        `json:"cpuMemSlots"`
	PlayerDeckCount  int             `json:"playerDeckCount"`
	CPUDeckCount     int             `json:"cpuDeckCount"`
	PlayerHandCount  int             `json:"playerHandCount"` // Remaining hand size
	CPUHandCount     int             `json:"cpuHandCount"`    // Remaining hand size
	FlagHolder       string          `json:"flagHolder"`
	Details          string          `json:"details,omitempty"`
}

// BattleAction represents a player's decision for a step.
type BattleAction struct {
	PlayerName string `json:"playerName"`
	ActionType string `json:"actionType"` // "PLAY" or "DISCARD"
	CardID     string `json:"cardId"`
}

// BattleSession represents an active interactive match between two combatants.
type BattleSession struct {
	SessionID      string                   `json:"sessionId"`
	Player1Name    string                   `json:"player1Name"`
	Player2Name    string                   `json:"player2Name"`
	Player1Hand    []Card                   `json:"player1Hand"`
	Player2Hand    []Card                   `json:"player2Hand"`
	Player1Deck    []Card                   `json:"player1Deck"`
	Player2Deck    []Card                   `json:"player2Deck"`
	Player1Mem     []MemorySlot             `json:"player1Mem"`
	Player2Mem     []MemorySlot             `json:"player2Mem"`
	Player1Discard []Card                   `json:"player1Discard"`
	Player2Discard []Card                   `json:"player2Discard"`
	FlagHolder     string                   `json:"flagHolder"`
	FlagPower      int                      `json:"flagPower"`
	Step           int                      `json:"step"`
	PendingActions map[string]*BattleAction `json:"pendingActions"` // player -> action
	IsFinished     bool                     `json:"isFinished"`
	Winner         string                   `json:"winner"`
	Loser          string                   `json:"loser"`
	Log            []BattleLogEntry         `json:"log"`
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
	Name     string `json:"name"`
	Wins     int    `json:"wins"`
	Fans     int    `json:"fans"`
	IsPlayer bool   `json:"isPlayer"`
}

// GameState holds all data for a single game/tournament session.
type GameState struct {
	Mu             sync.Mutex                  `json:"-"`
	GameID         string                      `json:"gameId"`
	LobbyCode      string                      `json:"lobbyCode,omitempty"`
	HostName       string                      `json:"hostName"`
	CurrentRound   int                         `json:"currentRound"`
	MaxRounds      int                         `json:"maxRounds"`
	Phase          string                      `json:"phase"` // shop, battle, results
	Players        []Player                    `json:"players"` // Size 3-8: mixture of humans and NPCs
	Shops          map[string]*ShopState       `json:"shops"` // Keyed by player name
	ReadyPlayers   map[string]bool             `json:"readyPlayers"` // Keyed by player name, tracks ready status
	Matchups       [][2]int                    `json:"matchups"` // Pairings of player indexes for the round
	BattleLogs     map[string][]BattleLogEntry `json:"battleLogs"` // Keyed by player name
	LastResults    map[string]*BattleResult    `json:"lastResults"` // Keyed by player name
	Standings      []StandingsEntry            `json:"standings"`
	BattleSessions map[string]*BattleSession   `json:"battleSessions"` // Keyed by player name (participant)
}

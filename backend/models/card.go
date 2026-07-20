package models

import (
	"math/rand"
	"sync"
)

// Card represents a single card in the game.
type Card struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Attribute  string `json:"attribute"` // Castle, City, Space, Movie, Shipwreck, Ghost, Fairground
	Archetype  string `json:"archetype"` // Aggro, Combo, Control
	Power      int    `json:"power"`
	Rarity     string `json:"rarity"` // Common, Uncommon, Rare, Epic
	Effect     string `json:"effect"`
	EffectType string `json:"effectType"`
	Cost       int    `json:"cost"`
	Deck       string `json:"deck"`     // A, B, C
	Quantity   int    `json:"quantity"` // Number of copies of this card in the pool
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
		Deck:       c.Deck,
		Quantity:   c.Quantity,
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
	Name             string       `json:"name"`
	Credits          int          `json:"credits"`
	Deck             []Card       `json:"deck"`
	Hand             []Card       `json:"hand"` // In-hand cards (historical/unused now)
	Wins             int          `json:"wins"`
	Fans             int          `json:"fans"`
	IsNPC            bool         `json:"isNpc"`
	AIStrategy       string       `json:"aiStrategy"` // Aggro, Combo, Control
	MemorySlots      []MemorySlot `json:"-"`
	WonPreviousRound bool         `json:"wonPreviousRound"`
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

// GetTotalFans returns player's trophy fans plus passive stars from their deck.
func (p *Player) GetTotalFans() int {
	total := p.Fans
	for _, c := range p.Deck {
		if c.EffectType == "clone" {
			total += 1
		} else if c.EffectType == "fanbus" {
			if p.Wins <= 3 {
				total += 2
			}
		}
	}
	return total
}

// ShopState represents the current shop offerings.
type ShopState struct {
	Cards   []Card `json:"cards"`
	Credits int    `json:"credits"`
}

// BattleLogCard is a minimal card representation for the battle log.
type BattleLogCard struct {
	ID         string `json:"id,omitempty"`
	Name       string `json:"name"`
	Power      int    `json:"power"`
	BasePower  int    `json:"basePower,omitempty"`
	Attribute  string `json:"attribute"`
	EffectType string `json:"effectType,omitempty"`
}

// BattleLogEntry represents a single step in the battle log.
type BattleLogEntry struct {
	Step            int            `json:"step"`
	Action          string         `json:"action"`
	Player          string         `json:"player"`
	Card            *BattleLogCard `json:"card,omitempty"`
	P1Card          *BattleLogCard `json:"p1Card,omitempty"`
	P2Card          *BattleLogCard `json:"p2Card,omitempty"`
	P1Action        string         `json:"p1Action,omitempty"`
	P2Action        string         `json:"p2Action,omitempty"`
	CurrentPower    int            `json:"currentPower"`
	EffectTriggered string         `json:"effectTriggered"`
	PlayerMemSlots  []string       `json:"playerMemSlots"`
	CPUMemSlots     []string       `json:"cpuMemSlots"`
	PlayerDeckCount int            `json:"playerDeckCount"`
	CPUDeckCount    int            `json:"cpuDeckCount"`
	PlayerHandCount int            `json:"playerHandCount"`
	CPUHandCount    int            `json:"cpuHandCount"`
	FlagHolder      string         `json:"flagHolder"`
	Details         string         `json:"details,omitempty"`
}

// BattleAction represents a player's decision for a step (used in choices).
type BattleAction struct {
	PlayerName string   `json:"playerName"`
	ActionType string   `json:"actionType"` // e.g. "CHOOSE_CARD", "REORDER", "BANISH"
	CardIDs    []string `json:"cardIds"`    // Selected card IDs
}

// BattleSession represents an active interactive match between two combatants.
type BattleSession struct {
	SessionID             string           `json:"sessionId"`
	Player1Name           string           `json:"player1Name"`
	Player2Name           string           `json:"player2Name"`
	Player1Deck           []Card           `json:"player1Deck"`
	Player2Deck           []Card           `json:"player2Deck"`
	Player1Mem            []MemorySlot     `json:"player1Mem"`
	Player2Mem            []MemorySlot     `json:"player2Mem"`
	Player1Discard        []Card           `json:"player1Discard"` // Banish pile for player1
	Player2Discard        []Card           `json:"player2Discard"` // Banish pile for player2
	Player1Wins           int              `json:"player1Wins"`
	Player2Wins           int              `json:"player2Wins"`
	Player1NextAttackBuff int              `json:"player1NextAttackBuff"`
	Player2NextAttackBuff int              `json:"player2NextAttackBuff"`
	FlagHolder            string           `json:"flagHolder"`
	FlagPower             int              `json:"flagPower"`
	FlagCard              *Card            `json:"flagCard,omitempty"` // The card currently defending the flag
	Step                  int              `json:"step"`
	IsFinished            bool             `json:"isFinished"`
	Winner                string           `json:"winner"`
	Loser                 string           `json:"loser"`
	Log                   []BattleLogEntry `json:"log"`
	TurnOwner             string           `json:"turnOwner"`           // "player" or "cpu" / actual name
	RequiredAction        string           `json:"requiredAction"`      // "DRAW", "CHOOSE_REPORTER", "CHOOSE_BUTLER", "CHOOSE_JUGGLER", "CHOOSE_SAILOR", "CHOOSE_MAGICIAN", "CHOOSE_NAVIGATOR", "CHOOSE_PROPHET", "CHOOSE_SIREN", "CHOOSE_VAMPIRE", "CHOOSE_PUMPKIN", "CHOOSE_BUMPER_CAR"
	PendingActionPlayer   string           `json:"pendingActionPlayer"` // Player name we are waiting for
	ActionOptions         []Card           `json:"actionOptions"`       // Card options presented for choice
	ActiveCards           []Card           `json:"activeCards"`         // Cards revealed this turn before taking flag
	DefenderStack         []Card           `json:"defenderStack"`       // Cards the current flag holder revealed to claim the flag (visible to both sides)
	ChallengerPower       int              `json:"challengerPower"`     // Cumulative power of active cards
}

// BattleResult stores the outcome of a battle.
type BattleResult struct {
	Winner     string           `json:"winner"`
	Loser      string           `json:"loser"`
	Reason     string           `json:"reason"`
	Log        []BattleLogEntry `json:"log"`
	FansGained int              `json:"fansGained"`
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
	Phase          string                      `json:"phase"`        // shop, battle, results
	Players        []Player                    `json:"players"`      // Size 3-8: mixture of humans and NPCs
	Shops          map[string]*ShopState       `json:"shops"`        // Keyed by player name
	ReadyPlayers   map[string]bool             `json:"readyPlayers"` // Keyed by player name, tracks ready status
	Matchups       [][2]int                    `json:"matchups"`     // Pairings of player indexes for the round
	BattleLogs     map[string][]BattleLogEntry `json:"battleLogs"`   // Keyed by player name
	LastResults    map[string]*BattleResult    `json:"lastResults"`  // Keyed by player name
	Standings      []StandingsEntry            `json:"standings"`
	BattleSessions map[string]*BattleSession   `json:"battleSessions"` // Keyed by player name (map key is player who initiated, or both)
	DeckAPool      []Card                      `json:"deckAPool"`
	DeckBPool      []Card                      `json:"deckBPool"`
	DeckCPool      []Card                      `json:"deckCPool"`
}

package engine

import (
	"backend/models"
	"fmt"
	"math/rand"
)

// InitializeBattleSession creates a fresh interactive battle session between two players.
func InitializeBattleSession(sessionID string, p1Name, p2Name string, p1Deck, p2Deck []models.Card) *models.BattleSession {
	// Defensive copy to avoid mutating caller's slices
	p1Deck = append([]models.Card(nil), p1Deck...)
	p2Deck = append([]models.Card(nil), p2Deck...)

	// Shuffle decks to randomize initial order
	rand.Shuffle(len(p1Deck), func(i, j int) { p1Deck[i], p1Deck[j] = p1Deck[j], p1Deck[i] })
	rand.Shuffle(len(p2Deck), func(i, j int) { p2Deck[i], p2Deck[j] = p2Deck[j], p2Deck[i] })

	p1HandSize := 5
	if len(p1Deck) < p1HandSize {
		p1HandSize = len(p1Deck)
	}
	p1Hand := make([]models.Card, p1HandSize)
	for i := 0; i < p1HandSize; i++ {
		p1Hand[i] = p1Deck[i].Clone()
	}
	p1RemainingDeck := make([]models.Card, len(p1Deck)-p1HandSize)
	for i := p1HandSize; i < len(p1Deck); i++ {
		p1RemainingDeck[i-p1HandSize] = p1Deck[i].Clone()
	}

	p2HandSize := 5
	if len(p2Deck) < p2HandSize {
		p2HandSize = len(p2Deck)
	}
	p2Hand := make([]models.Card, p2HandSize)
	for i := 0; i < p2HandSize; i++ {
		p2Hand[i] = p2Deck[i].Clone()
	}
	p2RemainingDeck := make([]models.Card, len(p2Deck)-p2HandSize)
	for i := p2HandSize; i < len(p2Deck); i++ {
		p2RemainingDeck[i-p2HandSize] = p2Deck[i].Clone()
	}

	return &models.BattleSession{
		SessionID:      sessionID,
		Player1Name:    p1Name,
		Player2Name:    p2Name,
		Player1Hand:    p1Hand,
		Player2Hand:    p2Hand,
		Player1Deck:    p1RemainingDeck,
		Player2Deck:    p2RemainingDeck,
		Player1Mem:     []models.MemorySlot{},
		Player2Mem:     []models.MemorySlot{},
		Player1Discard: []models.Card{},
		Player2Discard: []models.Card{},
		FlagHolder:     "",
		FlagPower:      0,
		Step:           0,
		PendingActions: make(map[string]*models.BattleAction),
		IsFinished:     false,
	}
}

// EvaluateBestMove decides the next action for an NPC based on their strategy and current hand/memory.
func EvaluateBestMove(hand []models.Card, strategy string, myMem []models.MemorySlot, opponentMem []models.MemorySlot, opponentFlagPower int, isChallenger bool) models.BattleAction {
	if len(hand) == 0 {
		return models.BattleAction{ActionType: "DISCARD", CardID: ""}
	}

	bestPlayCardIdx := -1
	bestPlayScore := -100

	// 1. Evaluate best card to PLAY
	for i, c := range hand {
		score := c.Power

		// Apply strategy synergy biases
		if c.EffectType == "power_per_ai_in_memory" && strategy == "Combo" {
			aiCount := countAttributeInMemory(myMem, "AI")
			score += 2 * aiCount
		} else if c.EffectType == "power_per_virus_in_memory" && strategy == "Aggro" {
			count := countAttributeInMemory(myMem, "Virus")
			score += 2 * count
		} else if c.EffectType == "power_per_hardware_in_memory" && strategy == "Control" {
			count := countAttributeInMemory(myMem, "Hardware")
			score += 2 * count
		}

		// Rarity preference
		if c.Rarity == "Epic" {
			score += 2
		} else if c.Rarity == "Rare" {
			score += 1
		}

		// Strategy matching attribute bias
		if (strategy == "Aggro" && c.Attribute == "Virus") ||
			(strategy == "Combo" && c.Attribute == "AI") ||
			(strategy == "Control" && (c.Attribute == "Hardware" || c.Attribute == "Netrunner")) {
			score += 3
		}

		if score > bestPlayScore {
			bestPlayScore = score
			bestPlayCardIdx = i
		}
	}

	// 2. Decide if we should DISCARD to save memory slots
	// If unique slots occupied is high (>= 5) and we are the challenger, but even our best card cannot exceed opponent's flag power,
	// it's wiser to DISCARD our worst card to save space instead of wasting a slot.
	effectiveSlots := uniqueSlotCount(myMem)
	if effectiveSlots >= 5 && isChallenger && bestPlayScore <= opponentFlagPower {
		worstDiscardIdx := 0
		worstDiscardScore := 9999

		for i, c := range hand {
			score := c.Power
			// Try to preserve strategy cards
			if (strategy == "Aggro" && c.Attribute == "Virus") ||
				(strategy == "Combo" && c.Attribute == "AI") ||
				(strategy == "Control" && (c.Attribute == "Hardware" || c.Attribute == "Netrunner")) {
				score += 10
			}

			if score < worstDiscardScore {
				worstDiscardScore = score
				worstDiscardIdx = i
			}
		}

		return models.BattleAction{
			ActionType: "DISCARD",
			CardID:     hand[worstDiscardIdx].ID,
		}
	}

	// 3. Otherwise, play the best card
	if bestPlayCardIdx != -1 {
		return models.BattleAction{
			ActionType: "PLAY",
			CardID:     hand[bestPlayCardIdx].ID,
		}
	}

	// Fallback to discard first card
	return models.BattleAction{
		ActionType: "DISCARD",
		CardID:     hand[0].ID,
	}
}

// StepBattle advances the interactive battle session by one step.
func StepBattle(session *models.BattleSession) {
	if session.IsFinished {
		return
	}

	session.Step++

	// 1. Retrieve actions
	p1Action := session.PendingActions[session.Player1Name]
	p2Action := session.PendingActions[session.Player2Name]

	// Fallbacks if action is missing
	if p1Action == nil {
		p1Action = &models.BattleAction{PlayerName: session.Player1Name, ActionType: "DISCARD"}
	}
	if p2Action == nil {
		p2Action = &models.BattleAction{PlayerName: session.Player2Name, ActionType: "DISCARD"}
	}

	// 2. Extract and remove cards from hands (value copies to avoid slice reallocation pointer issues)
	var c1 models.Card
	var c1Found bool
	for i, c := range session.Player1Hand {
		if c.ID == p1Action.CardID {
			c1 = c
			c1Found = true
			session.Player1Hand = append(session.Player1Hand[:i], session.Player1Hand[i+1:]...)
			break
		}
	}
	// Fallback first card if ID didn't match but PLAY requested
	if !c1Found && p1Action.ActionType == "PLAY" && len(session.Player1Hand) > 0 {
		c1 = session.Player1Hand[0]
		c1Found = true
		session.Player1Hand = session.Player1Hand[1:]
	}

	var c2 models.Card
	var c2Found bool
	for i, c := range session.Player2Hand {
		if c.ID == p2Action.CardID {
			c2 = c
			c2Found = true
			session.Player2Hand = append(session.Player2Hand[:i], session.Player2Hand[i+1:]...)
			break
		}
	}
	// Fallback first card if ID didn't match but PLAY requested
	if !c2Found && p2Action.ActionType == "PLAY" && len(session.Player2Hand) > 0 {
		c2 = session.Player2Hand[0]
		c2Found = true
		session.Player2Hand = session.Player2Hand[1:]
	}

	// 3. Map to BattleState for high-fidelity effect calculations (symmetrical compatibility)
	bs := &BattleState{
		PlayerDeck:   session.Player1Deck,
		CPUDeck:      session.Player2Deck,
		PlayerMem:    session.Player1Mem,
		CPUMem:       session.Player2Mem,
		FlagHolder:   "", // Temp mapping
		FlagPower:    session.FlagPower,
		Step:         session.Step,
		PrevCardAttr: map[string]string{"player": "", "cpu": ""},
		NullifyNext:  map[string]bool{"player": false, "cpu": false},
		LockedCards:  map[string]string{"player": "", "cpu": ""},
	}
	if session.FlagHolder == session.Player1Name {
		bs.FlagHolder = "player"
	} else if session.FlagHolder == session.Player2Name {
		bs.FlagHolder = "cpu"
	}

	// Resolve the actions
	p1Played := p1Action.ActionType == "PLAY" && c1Found
	p2Played := p2Action.ActionType == "PLAY" && c2Found

	p1Power := 0
	p2Power := 0
	p1Effect := ""
	p2Effect := ""

	// Process discards first
	if !p1Played && c1Found {
		session.Player1Discard = append(session.Player1Discard, c1)
	}
	if !p2Played && c2Found {
		session.Player2Discard = append(session.Player2Discard, c2)
	}

	// Process PLAY reveals & OnReveal effects
	if p1Played {
		p1Power = c1.Power
		p1Effect = bs.applyOnRevealEffects(&c1, "player", &p1Power)
		bs.PrevCardAttr["player"] = c1.Attribute
	}
	if p2Played {
		p2Power = c2.Power
		p2Effect = bs.applyOnRevealEffects(&c2, "cpu", &p2Power)
		bs.PrevCardAttr["cpu"] = c2.Attribute
	}

	// Determine step outcome
	var stepCard *models.BattleLogCard
	stepPlayer := ""
	stepAction := "clash"
	stepDetails := ""
	stepEffect := ""

	if p1Played && p2Played {
		// --- CLASH CASE ---
		stepCard = &models.BattleLogCard{Name: fmt.Sprintf("%s vs %s", c1.Name, c2.Name), Power: p1Power, Attribute: "Clash"}
		stepDetails = fmt.Sprintf("Clash! %s (%d POW) vs %s (%d POW)", c1.Name, p1Power, c2.Name, p2Power)

		var winnerCard models.Card
		var winnerSide string
		var winnerName string
		var loserName string
		var winnerPower int

		if p1Power > p2Power {
			winnerCard = c1
			winnerSide = "player"
			winnerName = session.Player1Name
			loserName = session.Player2Name
			winnerPower = p1Power
		} else if p2Power > p1Power {
			winnerCard = c2
			winnerSide = "cpu"
			winnerName = session.Player2Name
			loserName = session.Player1Name
			winnerPower = p2Power
		} else {
			// Tie breaker: Random coin toss or keep flag holder
			if session.FlagHolder == session.Player2Name {
				winnerCard = c2
				winnerSide = "cpu"
				winnerName = session.Player2Name
				loserName = session.Player1Name
				winnerPower = p2Power
			} else {
				winnerCard = c1
				winnerSide = "player"
				winnerName = session.Player1Name
				loserName = session.Player2Name
				winnerPower = p1Power
			}
			stepDetails += " (Tie breaker applied)"
		}

		// Apply OnWin effect
		winEffect := bs.applyOnWinEffect(winnerCard, winnerSide)
		if winEffect != "" {
			stepEffect = fmt.Sprintf("Win Effect: %s", winEffect)
		}

		// Apply OnDefend effects from memory of the loser
		var defenderMem *[]models.MemorySlot
		defenderSide := "player"
		if loserName == session.Player2Name {
			defenderMem = &bs.PlayerMem // P1 defending
		} else {
			defenderMem = &bs.CPUMem    // P2 defending
			defenderSide = "cpu"
		}
		
		for _, slot := range *defenderMem {
			for _, mc := range slot.Cards {
				isDefendEffect := mc.EffectType == "redirect_30pct" || mc.EffectType == "redirect_50pct" ||
					mc.EffectType == "lock_enemy_highest" || mc.EffectType == "lock_enemy_highest_x2" ||
					mc.EffectType == "lock_enemy_lowest"
				if isDefendEffect {
					dEffect := bs.applyOnDefendEffect(mc, defenderSide)
					if dEffect != "" {
						stepEffect += " | Defend Effect: " + dEffect
						isRedirect := mc.EffectType == "redirect_30pct" || mc.EffectType == "redirect_50pct"
						if isRedirect && len(dEffect) > 0 && len(dEffect) >= 4 && dEffect[len(dEffect)-4:] == "back" {
							// Redirect succeeded: swap winner
							winnerName = loserName
							stepDetails += " (Flag redirected!)"
						}
					}
				}
			}
		}

		// Update flag
		session.FlagHolder = winnerName
		session.FlagPower = winnerPower

		// Symmetrical: Send both played cards to memory
		p1Added := addToMemory(&bs.PlayerMem, c1)
		p2Added := addToMemory(&bs.CPUMem, c2)

		if !p1Added || !p2Added {
			session.IsFinished = true
			session.Winner = session.Player2Name
			session.Loser = session.Player1Name
			if !p2Added {
				session.Winner = session.Player1Name
				session.Loser = session.Player2Name
			}
			stepAction = "memory_overflow"
			stepDetails = fmt.Sprintf("Memory Overflow! %s has exhausted unique memory capacity limit.", session.Loser)
		}

	} else if p1Played {
		// --- ONLY P1 PLAYED ---
		stepCard = &models.BattleLogCard{ID: c1.ID, Name: c1.Name, Power: p1Power, Attribute: c1.Attribute}
		stepAction = "reveal"
		stepPlayer = session.Player1Name
		stepDetails = fmt.Sprintf("%s played %s (%d POW). %s discarded.", session.Player1Name, c1.Name, p1Power, session.Player2Name)
		stepEffect = p1Effect

		session.FlagHolder = session.Player1Name
		session.FlagPower = p1Power

		// Send P1 card to memory
		if !addToMemory(&bs.PlayerMem, c1) {
			session.IsFinished = true
			session.Winner = session.Player2Name
			session.Loser = session.Player1Name
			stepAction = "memory_overflow"
			stepDetails = fmt.Sprintf("Memory Overflow! %s has exhausted unique memory capacity limit.", session.Player1Name)
		}

	} else if p2Played {
		// --- ONLY P2 PLAYED ---
		stepCard = &models.BattleLogCard{ID: c2.ID, Name: c2.Name, Power: p2Power, Attribute: c2.Attribute}
		stepAction = "reveal"
		stepPlayer = session.Player2Name
		stepDetails = fmt.Sprintf("%s played %s (%d POW). %s discarded.", session.Player2Name, c2.Name, p2Power, session.Player1Name)
		stepEffect = p2Effect

		session.FlagHolder = session.Player2Name
		session.FlagPower = p2Power

		// Send P2 card to memory
		if !addToMemory(&bs.CPUMem, c2) {
			session.IsFinished = true
			session.Winner = session.Player1Name
			session.Loser = session.Player2Name
			stepAction = "memory_overflow"
			stepDetails = fmt.Sprintf("Memory Overflow! %s has exhausted unique memory capacity limit.", session.Player2Name)
		}

	} else {
		// --- BOTH DISCARDED ---
		stepAction = "discard"
		stepDetails = "Both players chose to discard. Grid matrix is stagnant."
	}

	// 4. Map back Memory slots and Decks from BattleState
	session.Player1Mem = bs.PlayerMem
	session.Player2Mem = bs.CPUMem
	session.Player1Deck = bs.PlayerDeck
	session.Player2Deck = bs.CPUDeck

	// Draw a card for each player at the end of the step if they have cards in deck
	if len(session.Player1Deck) > 0 {
		draw := session.Player1Deck[0]
		session.Player1Deck = session.Player1Deck[1:]
		session.Player1Hand = append(session.Player1Hand, draw)
	}
	if len(session.Player2Deck) > 0 {
		draw := session.Player2Deck[0]
		session.Player2Deck = session.Player2Deck[1:]
		session.Player2Hand = append(session.Player2Hand, draw)
	}

	var p1CardPtr *models.BattleLogCard
	if c1Found {
		p1CardPtr = &models.BattleLogCard{
			ID:        c1.ID,
			Name:      c1.Name,
			Power:     c1.Power,
			Attribute: c1.Attribute,
		}
	}
	var p2CardPtr *models.BattleLogCard
	if c2Found {
		p2CardPtr = &models.BattleLogCard{
			ID:        c2.ID,
			Name:      c2.Name,
			Power:     c2.Power,
			Attribute: c2.Attribute,
		}
	}

	// 5. Append step log entry
	logEntry := models.BattleLogEntry{
		Step:            session.Step,
		Action:          stepAction,
		Player:          stepPlayer,
		Card:            stepCard,
		P1Card:          p1CardPtr,
		P2Card:          p2CardPtr,
		P1Action:        p1Action.ActionType,
		P2Action:        p2Action.ActionType,
		CurrentPower:    session.FlagPower,
		EffectTriggered: stepEffect,
		PlayerMemSlots:  memSlotNames(session.Player1Mem),
		CPUMemSlots:     memSlotNames(session.Player2Mem),
		PlayerDeckCount: len(session.Player1Deck),
		CPUDeckCount:    len(session.Player2Deck),
		PlayerHandCount: len(session.Player1Hand),
		CPUHandCount:    len(session.Player2Hand),
		FlagHolder:      session.FlagHolder,
		Details:         stepDetails,
	}
	session.Log = append(session.Log, logEntry)

	// 6. Check End conditions (when either hand empty)
	if !session.IsFinished && (len(session.Player1Hand) == 0 || len(session.Player2Hand) == 0) {
		session.IsFinished = true
		if session.FlagHolder == session.Player1Name {
			session.Winner = session.Player1Name
			session.Loser = session.Player2Name
		} else if session.FlagHolder == session.Player2Name {
			session.Winner = session.Player2Name
			session.Loser = session.Player1Name
		} else {
			// Symmetrical tie: Coin toss
			if rand.Intn(2) == 0 {
				session.Winner = session.Player1Name
				session.Loser = session.Player2Name
			} else {
				session.Winner = session.Player2Name
				session.Loser = session.Player1Name
			}
		}

		session.Log = append(session.Log, models.BattleLogEntry{
			Step:            session.Step + 1,
			Action:          "game_end",
			Player:          session.Winner,
			CurrentPower:    session.FlagPower,
			PlayerMemSlots:  memSlotNames(session.Player1Mem),
			CPUMemSlots:     memSlotNames(session.Player2Mem),
			FlagHolder:      session.FlagHolder,
			Details:         fmt.Sprintf("Tournament Grid Exhausted. %s claims absolute dominance!", session.Winner),
		})
	}

	// Reset pending actions for the next step
	session.PendingActions = make(map[string]*models.BattleAction)
}

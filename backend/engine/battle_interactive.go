package engine

import (
	"backend/models"
	"fmt"
	"math/rand"
	"strings"
)

// InitializeBattleSession creates a fresh interactive battle session between two players.
func InitializeBattleSession(sessionID string, p1Name, p2Name string, p1Deck, p2Deck []models.Card) *models.BattleSession {
	p1DeckCopy := make([]models.Card, len(p1Deck))
	for i, c := range p1Deck {
		p1DeckCopy[i] = c.Clone()
	}
	p2DeckCopy := make([]models.Card, len(p2Deck))
	for i, c := range p2Deck {
		p2DeckCopy[i] = c.Clone()
	}

	// Shuffle decks
	rand.Shuffle(len(p1DeckCopy), func(i, j int) { p1DeckCopy[i], p1DeckCopy[j] = p1DeckCopy[j], p1DeckCopy[i] })
	rand.Shuffle(len(p2DeckCopy), func(i, j int) { p2DeckCopy[i], p2DeckCopy[j] = p2DeckCopy[j], p2DeckCopy[i] })

	// Cointoss for first turn owner
	turnOwner := p1Name
	if rand.Intn(2) == 0 {
		turnOwner = p2Name
	}

	return &models.BattleSession{
		SessionID:           sessionID,
		Player1Name:         p1Name,
		Player2Name:         p2Name,
		Player1Deck:         p1DeckCopy,
		Player2Deck:         p2DeckCopy,
		Player1Mem:          []models.MemorySlot{},
		Player2Mem:          []models.MemorySlot{},
		Player1Discard:      []models.Card{},
		Player2Discard:      []models.Card{},
		FlagHolder:          "",
		FlagPower:           0,
		Step:                0,
		IsFinished:          false,
		Log:                 []models.BattleLogEntry{},
		TurnOwner:           turnOwner,
		RequiredAction:      "DRAW",
		PendingActionPlayer: turnOwner,
		ActionOptions:       []models.Card{},
		ActiveCards:         []models.Card{},
		ChallengerPower:     0,
	}
}

// StepBattle processes one step of drawing from the current TurnOwner's deck.
func StepBattle(session *models.BattleSession, isP1NPC, isP2NPC bool) {
	if session.IsFinished {
		return
	}

	// 1. Check if we are waiting for a choice. If so, do nothing here.
	if session.RequiredAction != "DRAW" {
		return
	}

	session.Step++

	// Determine active deck and opponent deck
	var activeDeck *[]models.Card
	var activeMem *[]models.MemorySlot
	var activeDiscard *[]models.Card
	var activePlayerName, oppPlayerName string
	var isActiveNPC bool

	if session.TurnOwner == session.Player1Name {
		activeDeck = &session.Player1Deck
		activeMem = &session.Player1Mem
		activeDiscard = &session.Player1Discard
		activePlayerName = session.Player1Name
		oppPlayerName = session.Player2Name
		isActiveNPC = isP1NPC
	} else {
		activeDeck = &session.Player2Deck
		activeMem = &session.Player2Mem
		activeDiscard = &session.Player2Discard
		activePlayerName = session.Player2Name
		oppPlayerName = session.Player1Name
		isActiveNPC = isP2NPC
	}

	// 2. Draw card
	if len(*activeDeck) == 0 {
		// Deck empty - opponent wins
		session.IsFinished = true
		session.Winner = oppPlayerName
		session.Loser = activePlayerName

		session.Log = append(session.Log, models.BattleLogEntry{
			Step:            session.Step,
			Action:          "deck_empty",
			Player:          activePlayerName,
			CurrentPower:    session.FlagPower,
			PlayerMemSlots:  memSlotNames(session.Player1Mem),
			CPUMemSlots:     memSlotNames(session.Player2Mem),
			PlayerDeckCount: len(session.Player1Deck),
			CPUDeckCount:    len(session.Player2Deck),
			FlagHolder:      session.FlagHolder,
			Details:         fmt.Sprintf("%s has no cards left in deck. %s wins!", activePlayerName, oppPlayerName),
		})
		return
	}

	card := (*activeDeck)[0]
	*activeDeck = (*activeDeck)[1:]

	// Apply NextAttackBuff if this is the first card of the challenger's attack
	if len(session.ActiveCards) == 0 {
		var buff int
		if session.TurnOwner == session.Player1Name {
			buff = session.Player1NextAttackBuff
			session.Player1NextAttackBuff = 0
		} else {
			buff = session.Player2NextAttackBuff
			session.Player2NextAttackBuff = 0
		}
		if buff > 0 {
			card.Power += buff
		}
	}

	session.ActiveCards = append(session.ActiveCards, card)

	// Calculate base and temporary power (excluding active card-specific calculations yet)
	// We'll calculate the cumulative challenger power including passive buffs
	recalculateChallengerPower(session)

	// Apply On Reveal effects
	details := fmt.Sprintf("%s played %s (Power: %d)", activePlayerName, card.Name, card.Power)
	effectText := ""

	// Process card effects that trigger immediately
	switch card.EffectType {
	case "jester":
		if hasPower1Card(activeMem) {
			// Find jester in active cards and buff it
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += 3
					effectText = "ベンチにパワー1のカードがあるため、パワー+3"
					break
				}
			}
		}
	case "hermit":
		leakCount := len(*activeDiscard)
		if leakCount > 0 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += leakCount
					effectText = fmt.Sprintf("除外エリアのカード数 (%d) 分パワー+%d", leakCount, leakCount)
					break
				}
			}
		}
	case "pig":
		var oppMem *[]models.MemorySlot
		if session.TurnOwner == session.Player1Name {
			oppMem = &session.Player2Mem
		} else {
			oppMem = &session.Player1Mem
		}
		attrCount := countUniqueAttributes(oppMem)
		if attrCount > 0 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += attrCount
					effectText = fmt.Sprintf("相手ベンチの属性種類数 (%d) 分パワー+%d", attrCount, attrCount)
					break
				}
			}
		}
	case "talent":
		deckCount := len(*activeDeck)
		if deckCount%2 == 0 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += 3
					effectText = "山札の残り枚数が偶数のため、パワー+3"
					break
				}
			}
		}
	case "stable_boy":
		count2 := countPower2Cards(activeMem)
		if count2 > 0 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += count2
					effectText = fmt.Sprintf("ベンチのパワー2カード数 (%d) 分パワー+%d", count2, count2)
					break
				}
			}
		}
	case "gangster":
		// Gangster gets +2 on attack (which is always true when revealed as challenger)
		for i := range session.ActiveCards {
			if session.ActiveCards[i].ID == card.ID {
				session.ActiveCards[i].Power += 2
				effectText = "攻撃時、パワー+2"
				break
			}
		}
	case "merman":
		deepCount := countAttributeInMemory(*activeMem, "DeepWeb")
		if deepCount >= 2 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += 4
					effectText = "ベンチにディープウェブ属性のカードが2枚以上あるため、パワー+4"
					break
				}
			}
		}
	case "lifeguard":
		if len(*activeDeck) <= 3 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += 4
					effectText = "山札が3枚以下のため、パワー+4"
					break
				}
			}
		}
	case "teenager":
		daemonCount := countAttributeInMemory(*activeMem, "Daemon")
		if daemonCount > 0 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += daemonCount * 2
					effectText = fmt.Sprintf("ベンチのデーモン属性数 (%d) 分パワー+%d", daemonCount, daemonCount*2)
					break
				}
			}
		}
	case "mime":
		emptySlots := 6 - uniqueSlotCount(*activeMem)
		if emptySlots > 0 {
			for i := range session.ActiveCards {
				if session.ActiveCards[i].ID == card.ID {
					session.ActiveCards[i].Power += emptySlots * 3
					effectText = fmt.Sprintf("ベンチの空き数 (%d) 分パワー+%d", emptySlots, emptySlots*3)
					break
				}
			}
		}
	case "ufo":
		// UFO: Add 2 cards from Deck A pool to the bottom of the player's deck
		// Handled immediately (non-interactive, just draws randomly from A-pool if available)
		// We'll simulate this by adding two random A-deck cards to the bottom of their deck
		all := AllCards()
		var aCards []models.Card
		for _, ac := range all {
			if ac.Deck == "A" {
				aCards = append(aCards, ac)
			}
		}
		addedCount := 0
		for addedCount < 2 && len(aCards) > 0 {
			rc := aCards[rand.Intn(len(aCards))].Clone()
			rc.ID = fmt.Sprintf("%s_ufo_%d_%d", rc.ID, session.Step, addedCount)
			*activeDeck = append(*activeDeck, rc)
			addedCount++
		}
		effectText = "Aデッキの山札から2枚カードを山札の下に追加しました"
	case "ghost":
		// Ghost: Send top card of opponent's deck to their banish pile (discard)
		var oppDeck *[]models.Card
		var oppDiscard *[]models.Card
		if session.TurnOwner == session.Player1Name {
			oppDeck = &session.Player2Deck
			oppDiscard = &session.Player2Discard
		} else {
			oppDeck = &session.Player1Deck
			oppDiscard = &session.Player1Discard
		}
		if len(*oppDeck) > 0 {
			c := (*oppDeck)[0]
			*oppDeck = (*oppDeck)[1:]
			*oppDiscard = append(*oppDiscard, c)
			effectText = fmt.Sprintf("相手の山札から %s を除外エリアへ送りました", c.Name)
		} else {
			effectText = "相手の山札が空のため、除外できませんでした"
		}
	case "hologram":
		// Hologram: Put 1 random card from B-deck on top of opponent's deck
		var oppDeck *[]models.Card
		if session.TurnOwner == session.Player1Name {
			oppDeck = &session.Player2Deck
		} else {
			oppDeck = &session.Player1Deck
		}
		all := AllCards()
		var bCards []models.Card
		for _, bc := range all {
			if bc.Deck == "B" {
				bCards = append(bCards, bc)
			}
		}
		if len(bCards) > 0 {
			rc := bCards[rand.Intn(len(bCards))].Clone()
			rc.ID = fmt.Sprintf("%s_holo_%d", rc.ID, session.Step)
			*oppDeck = append([]models.Card{rc}, *oppDeck...)
			effectText = fmt.Sprintf("Bデッキから1枚、相手の山札の上に置きました")
		}
	case "villain":
		// Villain: Put 1 random card from A-deck on top of own deck
		all := AllCards()
		var aCards []models.Card
		for _, ac := range all {
			if ac.Deck == "A" {
				aCards = append(aCards, ac)
			}
		}
		if len(aCards) > 0 {
			rc := aCards[rand.Intn(len(aCards))].Clone()
			rc.ID = fmt.Sprintf("%s_villain_%d", rc.ID, session.Step)
			*activeDeck = append([]models.Card{rc}, *activeDeck...)
			effectText = fmt.Sprintf("Aデッキから1枚、自分の山札の上に置きました")
		}
	case "submarine":
		// Submarine: Put bottom card of own deck to own discard (banish)
		if len(*activeDeck) > 0 {
			lastIdx := len(*activeDeck) - 1
			c := (*activeDeck)[lastIdx]
			*activeDeck = (*activeDeck)[:lastIdx]
			*activeDiscard = append(*activeDiscard, c)
			effectText = fmt.Sprintf("自分の山札の底から %s を除外エリアへ送りました", c.Name)
		} else {
			effectText = "山札が空のため、除外できませんでした"
		}
	case "pyrotechnist":
		// Pyrotechnist: Buff fans +3 if active memory is full (6 slots filled)
		if uniqueSlotCount(*activeMem) >= 6 {
			effectText = "バッファオーバーフロー：ベンチが満杯なため、ファン+3を獲得！"
		} else {
			effectText = "ベンチが満杯ではないため、ファン獲得効果は発動しませんでした"
		}
	case "necromancer":
		// Necromancer: Automatically return the lowest power card on bench to top of deck
		var lowestCard *models.Card
		for _, slot := range *activeMem {
			if len(slot.Cards) > 0 {
				c := &slot.Cards[0]
				if lowestCard == nil || c.Power < lowestCard.Power {
					lowestCard = c
				}
			}
		}
		if lowestCard != nil {
			c, found := removeCardFromMemory(activeMem, lowestCard.ID)
			if found {
				*activeDeck = append([]models.Card{c}, *activeDeck...)
				effectText = fmt.Sprintf("リサイクルビンの効果でベンチから %s を山札の上に戻しました", c.Name)
			}
		} else {
			effectText = "ベンチが空のため、山札に戻せませんでした"
		}
	case "siren":
		// Siren: Automatically banish the highest power card from opponent's bench
		var highestCard *models.Card
		var oppMem *[]models.MemorySlot
		var oppDiscard *[]models.Card
		if session.TurnOwner == session.Player1Name {
			oppMem = &session.Player2Mem
			oppDiscard = &session.Player2Discard
		} else {
			oppMem = &session.Player1Mem
			oppDiscard = &session.Player1Discard
		}
		for _, slot := range *oppMem {
			if len(slot.Cards) > 0 {
				c := &slot.Cards[0]
				if highestCard == nil || c.Power > highestCard.Power {
					highestCard = c
				}
			}
		}
		if highestCard != nil {
			c, found := removeCardFromMemory(oppMem, highestCard.ID)
			if found {
				*oppDiscard = append(*oppDiscard, c)
				effectText = fmt.Sprintf("フィッシングプログラムの効果で相手のベンチから %s を除外しました", c.Name)
			}
		} else {
			effectText = "相手のベンチが空のため、除外効果は発動しませんでした"
		}
	}

	// Re-calculate power after immediate reveal effects
	recalculateChallengerPower(session)

	// Check for interactive choice effects
	isChoice := false
	var requiredAction string
	var options []models.Card

	switch card.EffectType {
	case "reporter":
		isChoice = true
		requiredAction = "CHOOSE_REPORTER"
		// Options: top 2 cards of active deck
		limit := 2
		if len(*activeDeck) < limit {
			limit = len(*activeDeck)
		}
		options = make([]models.Card, limit)
		for i := 0; i < limit; i++ {
			options[i] = (*activeDeck)[i]
		}
	case "juggler", "bumper_car":
		isChoice = true
		requiredAction = "CHOOSE_JUGGLER"
		// Options: top 3 cards of active deck
		limit := 3
		if len(*activeDeck) < limit {
			limit = len(*activeDeck)
		}
		options = make([]models.Card, limit)
		for i := 0; i < limit; i++ {
			options[i] = (*activeDeck)[i]
		}
	case "sailor", "fortune_teller":
		isChoice = true
		requiredAction = "CHOOSE_SAILOR"
		// Options: all cards in active deck
		options = make([]models.Card, len(*activeDeck))
		for i, c := range *activeDeck {
			options[i] = c
		}
	case "butler", "pumpkin":
		// Butler/Pumpkin: Banish up to 2 cards from bench
		// Only trigger choice if bench has cards
		uniqueCards := getUniqueCardsInMem(*activeMem)
		if len(uniqueCards) > 0 {
			isChoice = true
			requiredAction = "CHOOSE_BUTLER"
			options = uniqueCards
		}
	case "magician":
		// Magician: Banish 1 card <= 3 power from bench
		var validCards []models.Card
		for _, slot := range *activeMem {
			if len(slot.Cards) > 0 && slot.Cards[0].Power <= 3 {
				validCards = append(validCards, slot.Cards[0])
			}
		}
		if len(validCards) > 0 {
			isChoice = true
			requiredAction = "CHOOSE_MAGICIAN"
			options = validCards
		}
	case "vampire":
		// Vampire: Put 1 B-deck card from bench on top of deck
		var bCards []models.Card
		for _, slot := range *activeMem {
			if len(slot.Cards) > 0 && slot.Cards[0].Deck == "B" {
				bCards = append(bCards, slot.Cards[0])
			}
		}
		if len(bCards) > 0 {
			isChoice = true
			requiredAction = "CHOOSE_VAMPIRE"
			options = bCards
		}
	case "moviestar":
		// Moviestar: Put up to 2 HoloMedia cards of power 1 or 2 from bench on top of deck
		var movieCards []models.Card
		for _, slot := range *activeMem {
			if len(slot.Cards) > 0 && slot.Cards[0].Attribute == "HoloMedia" && (slot.Cards[0].Power == 1 || slot.Cards[0].Power == 2) {
				movieCards = append(movieCards, slot.Cards[0])
			}
		}
		if len(movieCards) > 0 {
			isChoice = true
			requiredAction = "CHOOSE_MOVIESTAR"
			options = movieCards
		}
	}

	// Find the card in ActiveCards to get its fully buffed power
	finalPower := card.Power
	for _, ac := range session.ActiveCards {
		if ac.ID == card.ID {
			finalPower = ac.Power
			break
		}
	}

	logCard := &models.BattleLogCard{
		ID:         card.ID,
		Name:       card.Name,
		Power:      finalPower,
		BasePower:  card.Power, // original power (excluding On Reveal buffs)
		Attribute:  card.Attribute,
		EffectType: card.EffectType,
	}

	session.Log = append(session.Log, models.BattleLogEntry{
		Step:            session.Step,
		Action:          "reveal",
		Player:          activePlayerName,
		Card:            logCard,
		CurrentPower:    session.ChallengerPower,
		EffectTriggered: effectText,
		PlayerMemSlots:  memSlotNames(session.Player1Mem),
		CPUMemSlots:     memSlotNames(session.Player2Mem),
		PlayerDeckCount: len(session.Player1Deck),
		CPUDeckCount:    len(session.Player2Deck),
		FlagHolder:      session.FlagHolder,
		Details:         details,
	})

	if isChoice {
		if isActiveNPC {
			// Resolve NPC choice automatically
			resolveNPCChoice(session, activePlayerName, requiredAction, options)
			// Proceed to power comparison immediately
			resolvePowerComparison(session, isP1NPC, isP2NPC)
		} else {
			// Pause and ask the human player
			session.RequiredAction = requiredAction
			session.PendingActionPlayer = activePlayerName
			session.ActionOptions = options
		}
	} else {
		// Proceed to power comparison
		resolvePowerComparison(session, isP1NPC, isP2NPC)
	}
}

// SubmitChoice handles user input for interactive card choices.
func SubmitChoice(session *models.BattleSession, action *models.BattleAction, isP1NPC, isP2NPC bool) {
	if session.IsFinished || session.RequiredAction == "DRAW" {
		return
	}

	// Verify the action is from the expected player
	if action.PlayerName != session.PendingActionPlayer {
		return
	}

	var activeDeck *[]models.Card
	var activeMem *[]models.MemorySlot
	var activeDiscard *[]models.Card
	var oppMem *[]models.MemorySlot
	var activePlayerName string

	if action.PlayerName == session.Player1Name {
		activeDeck = &session.Player1Deck
		activeMem = &session.Player1Mem
		activeDiscard = &session.Player1Discard
		oppMem = &session.Player2Mem
		activePlayerName = session.Player1Name
	} else {
		activeDeck = &session.Player2Deck
		activeMem = &session.Player2Mem
		activeDiscard = &session.Player2Discard
		oppMem = &session.Player1Mem
		activePlayerName = session.Player2Name
	}

	details := ""

	switch session.RequiredAction {
	case "CHOOSE_REPORTER", "CHOOSE_NAVIGATOR":
		// Put selected card on top, remaining on bottom
		if len(action.CardIDs) > 0 && len(*activeDeck) >= len(action.CardIDs) {
			topCardID := action.CardIDs[0]
			var topCard *models.Card
			var bottomCard *models.Card

			// Find which card is top, which is bottom
			for i := 0; i < 2 && i < len(*activeDeck); i++ {
				c := (*activeDeck)[i]
				if c.ID == topCardID {
					topCard = &c
				} else {
					bottomCard = &c
				}
			}

			// Reconstruct deck: remove top 2, place topCard at index 0, bottomCard at bottom of deck
			if topCard != nil && bottomCard != nil {
				*activeDeck = (*activeDeck)[2:]
				// Put topCard on top
				*activeDeck = append([]models.Card{*topCard}, *activeDeck...)
				// Put bottomCard at the bottom
				*activeDeck = append(*activeDeck, *bottomCard)
				details = fmt.Sprintf("%s は %s を山札の上に、%s を山札の下に置きました", activePlayerName, topCard.Name, bottomCard.Name)
			} else if topCard != nil {
				// Only 1 card was in deck
				*activeDeck = (*activeDeck)[1:]
				*activeDeck = append([]models.Card{*topCard}, *activeDeck...)
				details = fmt.Sprintf("%s は %s を山札の上に置きました", activePlayerName, topCard.Name)
			}
		}
	case "CHOOSE_JUGGLER":
		// Reorder top 3 cards based on CardIDs list
		if len(action.CardIDs) > 0 {
			var reordered []models.Card

			// Extract them
			for _, id := range action.CardIDs {
				for i, c := range *activeDeck {
					if c.ID == id {
						reordered = append(reordered, c)
						*activeDeck = append((*activeDeck)[:i], (*activeDeck)[i+1:]...)
						break
					}
				}
			}
			// Prepend reordered cards back to the deck
			*activeDeck = append(reordered, *activeDeck...)
			details = fmt.Sprintf("%s は山札の上3枚を並び替えました", activePlayerName)
		}
	case "CHOOSE_SAILOR":
		// Banish one specific card in deck to the bottom
		if len(action.CardIDs) > 0 {
			targetID := action.CardIDs[0]
			var foundCard *models.Card
			foundIdx := -1
			for i, c := range *activeDeck {
				if c.ID == targetID {
					foundIdx = i
					foundCard = &c
					break
				}
			}
			if foundIdx != -1 && foundCard != nil {
				// Remove from deck
				*activeDeck = append((*activeDeck)[:foundIdx], (*activeDeck)[foundIdx+1:]...)
				// Append to bottom
				*activeDeck = append(*activeDeck, *foundCard)
				details = fmt.Sprintf("%s は %s を山札の一番下に移動しました", activePlayerName, foundCard.Name)
			}
		}
	case "CHOOSE_FORTUNE_TELLER":
		// Move the chosen card in deck to the very top
		if len(action.CardIDs) > 0 {
			targetID := action.CardIDs[0]
			var foundCard *models.Card
			foundIdx := -1
			for i, c := range *activeDeck {
				if c.ID == targetID {
					foundIdx = i
					foundCard = &c
					break
				}
			}
			if foundIdx != -1 && foundCard != nil {
				// Remove from deck
				*activeDeck = append((*activeDeck)[:foundIdx], (*activeDeck)[foundIdx+1:]...)
				// Prepend to top
				*activeDeck = append([]models.Card{*foundCard}, *activeDeck...)
				details = fmt.Sprintf("%s は %s を山札の一番上に移動しました", activePlayerName, foundCard.Name)
			}
		}
	case "CHOOSE_BUTLER":
		// Banish up to 2 cards from bench
		banishedNames := []string{}
		for _, id := range action.CardIDs {
			c, found := removeCardFromMemory(activeMem, id)
			if found {
				*activeDiscard = append(*activeDiscard, c)
				banishedNames = append(banishedNames, c.Name)
			}
		}
		if len(banishedNames) > 0 {
			details = fmt.Sprintf("%s はベンチから %s を除外エリアへ送りました", activePlayerName, strings.Join(banishedNames, ", "))
		}
	case "CHOOSE_MAGICIAN":
		// Banish 1 card <= 3 power from bench
		if len(action.CardIDs) > 0 {
			id := action.CardIDs[0]
			c, found := removeCardFromMemory(activeMem, id)
			if found {
				*activeDiscard = append(*activeDiscard, c)
				details = fmt.Sprintf("%s は魔術師の効果でベンチから %s を除外しました", activePlayerName, c.Name)
			}
		}
	case "CHOOSE_VAMPIRE":
		// Put 1 B-deck card from bench on top of deck
		if len(action.CardIDs) > 0 {
			id := action.CardIDs[0]
			c, found := removeCardFromMemory(activeMem, id)
			if found {
				*activeDeck = append([]models.Card{c}, *activeDeck...)
				details = fmt.Sprintf("%s はバンパイアの効果でベンチから %s を山札の上に戻しました", activePlayerName, c.Name)
			}
		}
	case "CHOOSE_MOVIESTAR":
		// Put up to 2 Movie cards of power 1 or 2 from bench on top of deck
		restoredNames := []string{}
		// Place them in order chosen
		for _, id := range action.CardIDs {
			c, found := removeCardFromMemory(activeMem, id)
			if found {
				*activeDeck = append([]models.Card{c}, *activeDeck...)
				restoredNames = append(restoredNames, c.Name)
			}
		}
		if len(restoredNames) > 0 {
			details = fmt.Sprintf("%s はムービースターの効果でベンチから映画カード %s を山札の上に戻しました", activePlayerName, strings.Join(restoredNames, ", "))
		}
	case "CHOOSE_SIREN":
		// Banish 1 card from opponent's bench
		if len(action.CardIDs) > 0 {
			id := action.CardIDs[0]
			c, found := removeCardFromMemory(oppMem, id)
			if found {
				// Put in opponent's discard
				var oppDiscard *[]models.Card
				if action.PlayerName == session.Player1Name {
					oppDiscard = &session.Player2Discard
				} else {
					oppDiscard = &session.Player1Discard
				}
				*oppDiscard = append(*oppDiscard, c)
				details = fmt.Sprintf("%s はサイレンの効果で相手のベンチから %s を除外しました", activePlayerName, c.Name)
			}
		}
	}

	// Log the choice
	session.Log = append(session.Log, models.BattleLogEntry{
		Step:            session.Step,
		Action:          "effect_choice",
		Player:          activePlayerName,
		CurrentPower:    session.FlagPower,
		EffectTriggered: session.RequiredAction,
		PlayerMemSlots:  memSlotNames(session.Player1Mem),
		CPUMemSlots:     memSlotNames(session.Player2Mem),
		PlayerDeckCount: len(session.Player1Deck),
		CPUDeckCount:    len(session.Player2Deck),
		FlagHolder:      session.FlagHolder,
		Details:         details,
	})

	isLossChoice := session.RequiredAction == "CHOOSE_NAVIGATOR" || session.RequiredAction == "CHOOSE_FORTUNE_TELLER"

	// Reset choice requirements
	session.RequiredAction = "DRAW"
	session.PendingActionPlayer = session.TurnOwner
	session.ActionOptions = []models.Card{}

	if isLossChoice {
		// Proceed to draw phase transition
		var activePlayer, oppPlayer string
		if session.TurnOwner == session.Player1Name {
			activePlayer = session.Player1Name
			oppPlayer = session.Player2Name
		} else {
			activePlayer = session.Player2Name
			oppPlayer = session.Player1Name
		}
		winningCard := session.ActiveCards[len(session.ActiveCards)-1]
		// Determine transition log effectText (we can check from log if hero/cowboy triggered)
		transitionToDrawPhase(session, activePlayer, oppPlayer, winningCard, "")
	} else {
		// Recalculate power and perform check (for reveal choices)
		recalculateChallengerPower(session)
		resolvePowerComparison(session, isP1NPC, isP2NPC)
	}
}

func resolveNPCChoice(session *models.BattleSession, npcName string, action string, options []models.Card) {
	// Simple AI auto-choice
	var activeDeck *[]models.Card
	var activeMem *[]models.MemorySlot
	var activeDiscard *[]models.Card
	var oppMem *[]models.MemorySlot

	if npcName == session.Player1Name {
		activeDeck = &session.Player1Deck
		activeMem = &session.Player1Mem
		activeDiscard = &session.Player1Discard
		oppMem = &session.Player2Mem
	} else {
		activeDeck = &session.Player2Deck
		activeMem = &session.Player2Mem
		activeDiscard = &session.Player2Discard
		oppMem = &session.Player1Mem
	}

	details := ""
	switch action {
	case "CHOOSE_REPORTER", "CHOOSE_NAVIGATOR":
		// Strategic: reorder top 2 so the higher-power card is on top (drawn next),
		// the lower-power card is sent to the bottom.
		if len(*activeDeck) >= 2 {
			top := (*activeDeck)[0]
			next := (*activeDeck)[1]
			if next.Power > top.Power {
				(*activeDeck)[0], (*activeDeck)[1] = next, top
				// Move the now-second (lower) card to the bottom
				low := (*activeDeck)[1]
				*activeDeck = append((*activeDeck)[:1], (*activeDeck)[2:]...)
				*activeDeck = append(*activeDeck, low)
				details = fmt.Sprintf("%s (AI) は %s を山札の上に、%s を底に配置しました", npcName, next.Name, low.Name)
			} else {
				// Already optimal: keep top on top, send next to bottom
				low := (*activeDeck)[1]
				*activeDeck = append((*activeDeck)[:1], (*activeDeck)[2:]...)
				*activeDeck = append(*activeDeck, low)
				details = fmt.Sprintf("%s (AI) は %s を山札の上に維持し、%s を底に移動しました", npcName, top.Name, low.Name)
			}
		}
	case "CHOOSE_JUGGLER", "CHOOSE_BUMPER_CAR":
		// Strategic: sort the seen options by power descending so highest power is drawn next.
		if len(options) > 0 {
			limit := len(options)
			if limit > len(*activeDeck) {
				limit = len(*activeDeck)
			}
			*activeDeck = (*activeDeck)[limit:]
			sorted := make([]models.Card, len(options))
			copy(sorted, options)
			// Stable sort by power descending (keep original order on ties to reduce churn)
			for i := 1; i < len(sorted); i++ {
				key := sorted[i]
				j := i - 1
				for j >= 0 && sorted[j].Power < key.Power {
					sorted[j+1] = sorted[j]
					j--
				}
				sorted[j+1] = key
			}
			*activeDeck = append(sorted, *activeDeck...)
			details = fmt.Sprintf("%s (AI) は山札の上をパワー降順に並び替えました", npcName)
		}
	case "CHOOSE_SAILOR":
		// Strategic: move the lowest-power card among the seen options to the bottom,
		// keeping higher-power cards on top for stronger attacks.
		if len(options) > 0 && len(*activeDeck) > 0 {
			// options are the full deck seen; find lowest power index in current deck top slice
			limit := len(options)
			if limit > len(*activeDeck) {
				limit = len(*activeDeck)
			}
			lowIdx := 0
			for i := 1; i < limit; i++ {
				if (*activeDeck)[i].Power < (*activeDeck)[lowIdx].Power {
					lowIdx = i
				}
			}
			c := (*activeDeck)[lowIdx]
			*activeDeck = append((*activeDeck)[:lowIdx], (*activeDeck)[lowIdx+1:]...)
			*activeDeck = append(*activeDeck, c)
			details = fmt.Sprintf("%s (AI) は最もパワーの低い %s を山札の底に移動しました", npcName, c.Name)
		}
	case "CHOOSE_FORTUNE_TELLER":
		// Strategic: put the highest-power card from options on top so it's drawn next.
		if len(options) > 0 {
			best := options[0]
			for _, c := range options {
				if c.Power > best.Power {
					best = c
				}
			}
			// Remove best from deck and prepend it
			for i, c := range *activeDeck {
				if c.ID == best.ID {
					*activeDeck = append((*activeDeck)[:i], (*activeDeck)[i+1:]...)
					break
				}
			}
			*activeDeck = append([]models.Card{best}, *activeDeck...)
			details = fmt.Sprintf("%s (AI) は %s を山札の上に移動しました", npcName, best.Name)
		}
	case "CHOOSE_BUTLER":
		// Strategic: banish the lowest-power card from bench (frees slots, minimal loss).
		if len(options) > 0 {
			lowest := options[0]
			for _, c := range options {
				if c.Power < lowest.Power {
					lowest = c
				}
			}
			c, found := removeCardFromMemory(activeMem, lowest.ID)
			if found {
				*activeDiscard = append(*activeDiscard, c)
				details = fmt.Sprintf("%s (AI) はベンチから %s を除外しました", npcName, c.Name)
			}
		}
	case "CHOOSE_MAGICIAN":
		// Strategic: banish the lowest-power valid card (≤3 power) to free a slot cheaply.
		if len(options) > 0 {
			target := options[0]
			for _, c := range options {
				if c.Power <= 3 && c.Power < target.Power {
					target = c
				}
			}
			c, found := removeCardFromMemory(activeMem, target.ID)
			if found {
				*activeDiscard = append(*activeDiscard, c)
				details = fmt.Sprintf("%s (AI) は魔術師の効果で %s を除外しました", npcName, c.Name)
			}
		}
	case "CHOOSE_VAMPIRE":
		// Strategic: return the highest-power B-deck card to the top so it can attack again soon.
		if len(options) > 0 {
			target := options[0]
			for _, c := range options {
				if c.Power > target.Power {
					target = c
				}
			}
			c, found := removeCardFromMemory(activeMem, target.ID)
			if found {
				*activeDeck = append([]models.Card{c}, *activeDeck...)
				details = fmt.Sprintf("%s (AI) はバンパイアの効果で %s を山札の上に戻しました", npcName, c.Name)
			}
		}
	case "CHOOSE_MOVIESTAR":
		// Strategic: return up to 2 highest-power HoloMedia cards (power 1-2) to the top.
		if len(options) > 0 {
			// Pick up to 2 highest power valid cards
			chosen := make([]models.Card, 0, 2)
			pool := make([]models.Card, len(options))
			copy(pool, options)
			for k := 0; k < 2 && len(pool) > 0; k++ {
				bestIdx := 0
				for i := 1; i < len(pool); i++ {
					if pool[i].Power > pool[bestIdx].Power {
						bestIdx = i
					}
				}
				chosen = append(chosen, pool[bestIdx])
				pool = append(pool[:bestIdx], pool[bestIdx+1:]...)
			}
			// Remove chosen from memory and prepend to deck (highest first)
			prepend := make([]models.Card, 0, len(chosen))
			for _, target := range chosen {
				c, found := removeCardFromMemory(activeMem, target.ID)
				if found {
					prepend = append(prepend, c)
				}
			}
			if len(prepend) > 0 {
				*activeDeck = append(prepend, *activeDeck...)
				names := ""
				for i, c := range prepend {
					if i > 0 {
						names += ", "
					}
					names += c.Name
				}
				details = fmt.Sprintf("%s (AI) はムービースターの効果で %s を山札の上に戻しました", npcName, names)
			}
		}
	case "CHOOSE_SIREN":
		// Strategic: banish the highest power card from opponent's bench.
		if len(options) > 0 {
			highest := options[0]
			for _, c := range options {
				if c.Power > highest.Power {
					highest = c
				}
			}
			c, found := removeCardFromMemory(oppMem, highest.ID)
			if found {
				var oppDiscard *[]models.Card
				if npcName == session.Player1Name {
					oppDiscard = &session.Player2Discard
				} else {
					oppDiscard = &session.Player1Discard
				}
				*oppDiscard = append(*oppDiscard, c)
				details = fmt.Sprintf("%s (AI) はサイレンの効果で相手のベンチから %s を除外しました", npcName, c.Name)
			}
		}
	}

	session.Log = append(session.Log, models.BattleLogEntry{
		Step:            session.Step,
		Action:          "effect_choice",
		Player:          npcName,
		CurrentPower:    session.FlagPower,
		EffectTriggered: action,
		PlayerMemSlots:  memSlotNames(session.Player1Mem),
		CPUMemSlots:     memSlotNames(session.Player2Mem),
		PlayerDeckCount: len(session.Player1Deck),
		CPUDeckCount:    len(session.Player2Deck),
		FlagHolder:      session.FlagHolder,
		Details:         details,
	})
}

func transitionToDrawPhase(session *models.BattleSession, activePlayerName, oppPlayerName string, winningCard models.Card, effectText string) {
	// Update flag details
	session.FlagHolder = activePlayerName

	// Flag power becomes the winning card's power
	var activeMem, oppMem *[]models.MemorySlot
	if session.TurnOwner == session.Player1Name {
		activeMem = &session.Player1Mem
		oppMem = &session.Player2Mem
	} else {
		activeMem = &session.Player2Mem
		oppMem = &session.Player1Mem
	}
	winCardPower := calculateIndividualCardPower(winningCard, activeMem, oppMem, activePlayerName, session)
	session.FlagPower = winCardPower

	// Apply Illusionist on-win power buff (if applicable)
	if winningCard.EffectType == "illusionist" {
		emptySlots := 6 - uniqueSlotCount(*activeMem)
		if emptySlots > 0 {
			session.FlagPower += emptySlots
			effectText += fmt.Sprintf(" (イリュージョニスト効果でパワー+%d)", emptySlots)
		}
	}

	// Swap turn
	session.TurnOwner = oppPlayerName
	session.PendingActionPlayer = oppPlayerName
	session.RequiredAction = "DRAW"

	// Preserve the challenger's full stack (all revealed cards including the
	// winner) as the new defender's stack, so both sides can see how the flag
	// was claimed. Must capture BEFORE resetting ActiveCards.
	session.DefenderStack = append([]models.Card{}, session.ActiveCards...)
	// Reset active cards: now contains only the new defending flag card
	session.ActiveCards = []models.Card{winningCard}
	session.ChallengerPower = 0

	logCard := &models.BattleLogCard{
		ID:         winningCard.ID,
		Name:       winningCard.Name,
		Power:      session.FlagPower,
		BasePower:  winningCard.Power,
		Attribute:  winningCard.Attribute,
		EffectType: winningCard.EffectType,
	}

	session.Log = append(session.Log, models.BattleLogEntry{
		Step:            session.Step,
		Action:          "flag_change",
		Player:          activePlayerName,
		Card:            logCard,
		CurrentPower:    session.FlagPower,
		EffectTriggered: effectText,
		PlayerMemSlots:  memSlotNames(session.Player1Mem),
		CPUMemSlots:     memSlotNames(session.Player2Mem),
		PlayerDeckCount: len(session.Player1Deck),
		CPUDeckCount:    len(session.Player2Deck),
		FlagHolder:      session.FlagHolder,
		Details:         fmt.Sprintf("%s がフラッグを奪いました！防衛パワー: %d", activePlayerName, session.FlagPower),
	})

	// Check if opponent is dead (no cards left to challenge)
	var oppDeck *[]models.Card
	if session.TurnOwner == session.Player1Name {
		oppDeck = &session.Player1Deck
	} else {
		oppDeck = &session.Player2Deck
	}
	if len(*oppDeck) == 0 {
		session.IsFinished = true
		session.Winner = activePlayerName
		session.Loser = oppPlayerName
		session.Log = append(session.Log, models.BattleLogEntry{
			Step:            session.Step + 1,
			Action:          "game_end",
			Player:          activePlayerName,
			CurrentPower:    session.FlagPower,
			PlayerMemSlots:  memSlotNames(session.Player1Mem),
			CPUMemSlots:     memSlotNames(session.Player2Mem),
			PlayerDeckCount: len(session.Player1Deck),
			CPUDeckCount:    len(session.Player2Deck),
			FlagHolder:      session.FlagHolder,
			Details:         fmt.Sprintf("対戦相手 %s の山札がなくなりました。%s の勝利です！", oppPlayerName, activePlayerName),
		})
	}
}

func resolvePowerComparison(session *models.BattleSession, isP1NPC, isP2NPC bool) {
	// Check if challenger power exceeds flag power
	if session.ChallengerPower > session.FlagPower {
		// FLAG SECURED!
		oldFlagHolder := session.FlagHolder

		var activeMem *[]models.MemorySlot
		var oppMem *[]models.MemorySlot
		var oppDeck *[]models.Card
		var oppDiscard *[]models.Card
		var activePlayerName, oppPlayerName string
		var isOpponentNPC bool

		if session.TurnOwner == session.Player1Name {
			activeMem = &session.Player1Mem
			oppMem = &session.Player2Mem
			oppDeck = &session.Player2Deck
			oppDiscard = &session.Player2Discard
			activePlayerName = session.Player1Name
			oppPlayerName = session.Player2Name
			isOpponentNPC = isP2NPC
		} else {
			activeMem = &session.Player2Mem
			oppMem = &session.Player1Mem
			oppDeck = &session.Player1Deck
			oppDiscard = &session.Player1Discard
			activePlayerName = session.Player2Name
			oppPlayerName = session.Player1Name
			isOpponentNPC = isP1NPC
		}

		var oldFlagCard *models.Card

		// 1. Move old defender cards to defender's memory
		if oldFlagHolder != "" {
			// Find the previous defender card
			for i := len(session.Log) - 1; i >= 0; i-- {
				if session.Log[i].Action == "flag_change" && session.Log[i].Player == oldFlagHolder && session.Log[i].Card != nil {
					// Found the card
					c := convertLogCardToCard(session.Log[i].Card)
					oldFlagCard = &c
					break
				}
			}

			if oldFlagCard != nil {
				// Check Prince effect: Prince is banished instead of benched when losing the flag
				if oldFlagCard.EffectType == "prince" {
					*oppDiscard = append(*oppDiscard, *oldFlagCard)
					session.Log = append(session.Log, models.BattleLogEntry{
						Step:            session.Step,
						Action:          "bench",
						Player:          oldFlagHolder,
						CurrentPower:    session.FlagPower,
						EffectTriggered: "prince",
						PlayerMemSlots:  memSlotNames(session.Player1Mem),
						CPUMemSlots:     memSlotNames(session.Player2Mem),
						PlayerDeckCount: len(session.Player1Deck),
						CPUDeckCount:    len(session.Player2Deck),
						FlagHolder:      session.FlagHolder,
						Details:         fmt.Sprintf("プリンスがフラッグを失ったため、ベンチではなく除外エリアに送られました"),
					})
				} else if oldFlagCard.EffectType == "rescue_pod" {
					*oppDiscard = append(*oppDiscard, *oldFlagCard)
					session.Log = append(session.Log, models.BattleLogEntry{
						Step:            session.Step,
						Action:          "bench",
						Player:          oldFlagHolder,
						CurrentPower:    session.FlagPower,
						EffectTriggered: "rescue_pod",
						PlayerMemSlots:  memSlotNames(session.Player1Mem),
						CPUMemSlots:     memSlotNames(session.Player2Mem),
						PlayerDeckCount: len(session.Player1Deck),
						CPUDeckCount:    len(session.Player2Deck),
						FlagHolder:      session.FlagHolder,
						Details:         fmt.Sprintf("レスキューポッドがフラッグを失い、除外されました"),
					})
				} else {
					added := addToMemory(oppMem, *oldFlagCard)
					if !added {
						session.IsFinished = true
						session.Winner = activePlayerName
						session.Loser = oppPlayerName
						session.Log = append(session.Log, models.BattleLogEntry{
							Step:            session.Step,
							Action:          "memory_overflow",
							Player:          oppPlayerName,
							CurrentPower:    session.FlagPower,
							PlayerMemSlots:  memSlotNames(session.Player1Mem),
							CPUMemSlots:     memSlotNames(session.Player2Mem),
							PlayerDeckCount: len(session.Player1Deck),
							CPUDeckCount:    len(session.Player2Deck),
							FlagHolder:      session.FlagHolder,
							Details:         fmt.Sprintf("メモリ上限超過！ %s のベンチが満杯になり敗北しました", oppPlayerName),
						})
						return
					}
				}

				// Apply Comic buff (next attack gets +2)
				if oldFlagCard.EffectType == "comic" {
					if oldFlagHolder == session.Player1Name {
						session.Player1NextAttackBuff += 2
					} else {
						session.Player2NextAttackBuff += 2
					}
					session.Log = append(session.Log, models.BattleLogEntry{
						Step:            session.Step,
						Action:          "effect_trigger",
						Player:          oldFlagHolder,
						CurrentPower:    session.FlagPower,
						EffectTriggered: "comic",
						PlayerMemSlots:  memSlotNames(session.Player1Mem),
						CPUMemSlots:     memSlotNames(session.Player2Mem),
						PlayerDeckCount: len(session.Player1Deck),
						CPUDeckCount:    len(session.Player2Deck),
						FlagHolder:      session.FlagHolder,
						Details:         fmt.Sprintf("ホロヒーローの効果発動：次の %s の攻撃にパワー+2を付与", oldFlagHolder),
					})
				}
			}
		}

		// 2. Move challenger's non-winning active cards to memory
		winningCard := session.ActiveCards[len(session.ActiveCards)-1]
		for i := 0; i < len(session.ActiveCards)-1; i++ {
			c := session.ActiveCards[i]
			added := addToMemory(activeMem, c)
			if !added {
				session.IsFinished = true
				session.Winner = oppPlayerName
				session.Loser = activePlayerName
				session.Log = append(session.Log, models.BattleLogEntry{
					Step:            session.Step,
					Action:          "memory_overflow",
					Player:          activePlayerName,
					CurrentPower:    session.FlagPower,
					PlayerMemSlots:  memSlotNames(session.Player1Mem),
					CPUMemSlots:     memSlotNames(session.Player2Mem),
					PlayerDeckCount: len(session.Player1Deck),
					CPUDeckCount:    len(session.Player2Deck),
					FlagHolder:      session.FlagHolder,
					Details:         fmt.Sprintf("メモリ上限超過！ %s のベンチが満杯になり敗北しました", activePlayerName),
				})
				return
			}
		}

		// Apply OnWin effects (Hero, Cowboy, etc.)
		effectText := ""
		if winningCard.EffectType == "hero" {
			effectText = "ヒーローの効果でファン+2を獲得！"
		} else if winningCard.EffectType == "cowboy" {
			var highestCard *models.Card
			for _, slot := range *oppMem {
				if len(slot.Cards) > 0 {
					c := &slot.Cards[0]
					if highestCard == nil || c.Power > highestCard.Power {
						highestCard = c
					}
				}
			}
			if highestCard != nil {
				c, found := removeCardFromMemory(oppMem, highestCard.ID)
				if found {
					*oppDiscard = append(*oppDiscard, c)
					effectText = fmt.Sprintf("データバガボンドの効果で相手のベンチから %s を除外しました", c.Name)
				}
			} else {
				effectText = "相手のベンチが空のため、除外効果は発動しませんでした"
			}
		}

		// Check Loss effects that require interactive choices (Navigator, Fortune Teller)
		hasLossChoice := false
		var lossAction string
		var lossOptions []models.Card

		if oldFlagCard != nil {
			if oldFlagCard.EffectType == "navigator" {
				hasLossChoice = true
				lossAction = "CHOOSE_NAVIGATOR"
				limit := 2
				if len(*oppDeck) < limit {
					limit = len(*oppDeck)
				}
				lossOptions = make([]models.Card, limit)
				for i := 0; i < limit; i++ {
					lossOptions[i] = (*oppDeck)[i]
				}
			} else if oldFlagCard.EffectType == "fortune_teller" {
				hasLossChoice = true
				lossAction = "CHOOSE_FORTUNE_TELLER"
				lossOptions = make([]models.Card, len(*oppDeck))
				for i, c := range *oppDeck {
					lossOptions[i] = c
				}
			}
		}

		if hasLossChoice && len(lossOptions) > 0 {
			// Preserve the challenger's full stack before resetting ActiveCards.
			session.DefenderStack = append([]models.Card{}, session.ActiveCards...)
			session.ActiveCards = []models.Card{winningCard}
			session.FlagHolder = activePlayerName

			if isOpponentNPC {
				resolveNPCChoice(session, oldFlagHolder, lossAction, lossOptions)
				transitionToDrawPhase(session, activePlayerName, oppPlayerName, winningCard, effectText)
			} else {
				session.RequiredAction = lossAction
				session.PendingActionPlayer = oldFlagHolder
				session.ActionOptions = lossOptions
				session.Log = append(session.Log, models.BattleLogEntry{
					Step:            session.Step,
					Action:          "flag_change_pending",
					Player:          activePlayerName,
					CurrentPower:    session.ChallengerPower,
					EffectTriggered: lossAction,
					PlayerMemSlots:  memSlotNames(session.Player1Mem),
					CPUMemSlots:     memSlotNames(session.Player2Mem),
					PlayerDeckCount: len(session.Player1Deck),
					CPUDeckCount:    len(session.Player2Deck),
					FlagHolder:      session.FlagHolder,
					Details:         fmt.Sprintf("%s がフラッグを奪いました。%s の暗号マッパー・予測モデルの解決をお待ちください...", activePlayerName, oldFlagHolder),
				})
			}
		} else {
			transitionToDrawPhase(session, activePlayerName, oppPlayerName, winningCard, effectText)
		}

	} else {
		// Challenger power is still <= flag power.
		// Need to draw more cards.
		session.RequiredAction = "DRAW"
		session.PendingActionPlayer = session.TurnOwner
	}
}

// Helper to recalculate the total challenger power
func recalculateChallengerPower(session *models.BattleSession) {
	var activeMem *[]models.MemorySlot
	var oppMem *[]models.MemorySlot
	var activePlayerName string
	if session.TurnOwner == session.Player1Name {
		activeMem = &session.Player1Mem
		oppMem = &session.Player2Mem
		activePlayerName = session.Player1Name
	} else {
		activeMem = &session.Player2Mem
		oppMem = &session.Player1Mem
		activePlayerName = session.Player2Name
	}

	total := 0
	for _, c := range session.ActiveCards {
		total += calculateIndividualCardPower(c, activeMem, oppMem, activePlayerName, session)
	}
	session.ChallengerPower = total
}

func calculateIndividualCardPower(card models.Card, myMem, oppMem *[]models.MemorySlot, playerName string, session *models.BattleSession) int {
	power := card.Power

	// Knight (Core Guard) buff: gains power equal to opponent wins when attacking
	if card.EffectType == "knight" {
		if session.TurnOwner == playerName {
			oppWins := session.Player2Wins
			if playerName == session.Player2Name {
				oppWins = session.Player1Wins
			}
			power += oppWins
		}
	}

	// Apply global bench buffs
	// 1. Bench power bonuses (bench_power_plus_1, bench_power_plus_2)
	power += benchPowerBonus(*myMem)

	// 2. Specific attribute buffs from bench
	// NeuroCore (old AI) buff
	if card.Power == 2 && hasEffectInMem(myMem, "ai") {
		// AI: "自分のパワー2のキャラクターのパワー+1"
		power += countEffectInMem(myMem, "ai")
	}

	// Makeup Artist buff
	if card.Power == 1 && countMakeupArtists(myMem) > 0 {
		// "自分のパワー1のキャラクターの攻撃時、パワー+2"
		// If we are the challenger, we are attacking
		if session.TurnOwner == playerName {
			power += countMakeupArtists(myMem) * 2
		}
	}

	// Vendor buff
	if card.Attribute == "Matrix" && hasVendor(myMem) {
		power += countVendors(myMem)
	}

	// Blacksmith buff
	if card.Attribute == "Sector" && hasBlacksmith(myMem) {
		power += countBlacksmiths(myMem)
	}

	// Band buff
	if card.Attribute == "Orbit" && hasBand(myMem) {
		power += countBands(myMem)
	}

	// Director buff
	if card.Attribute == "HoloMedia" && hasDirector(myMem) && session.TurnOwner == playerName {
		power += countDirectors(myMem)
	}

	// Cook buff
	if hasCook(myMem) && session.FlagHolder == playerName && isFlagCard(session, card.ID) {
		power += countCooks(myMem)
	}

	// Bard buff
	if hasBard(myMem) && session.TurnOwner == playerName {
		power += countBards(myMem)
	}

	return power
}

// Helpers for checking card presence & count in memory
func hasPower1Card(mem *[]models.MemorySlot) bool {
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].Power == 1 {
			return true
		}
	}
	return false
}

func hasCityCard(mem *[]models.MemorySlot) bool {
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].Attribute == "Sector" {
			return true
		}
	}
	return false
}

func countPower3Cards(mem *[]models.MemorySlot) int {
	count := 0
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].Power == 3 {
			count += slot.Count
		}
	}
	return count
}

func countPower2Cards(mem *[]models.MemorySlot) int {
	count := 0
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].Power == 2 {
			count += slot.Count
		}
	}
	return count
}

func countUniqueAttributes(mem *[]models.MemorySlot) int {
	attrs := make(map[string]bool)
	for _, slot := range *mem {
		if len(slot.Cards) > 0 {
			attrs[slot.Cards[0].Attribute] = true
		}
	}
	return len(attrs)
}

func hasAttributeCard(mem *[]models.MemorySlot, attr string) bool {
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].Attribute == attr {
			return true
		}
	}
	return false
}

func countMakeupArtists(mem *[]models.MemorySlot) int {
	count := 0
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].EffectType == "makeup_artist" {
			count += slot.Count
		}
	}
	return count
}

func hasVendor(mem *[]models.MemorySlot) bool {
	return hasEffectInMem(mem, "vendor")
}

func countVendors(mem *[]models.MemorySlot) int {
	return countEffectInMem(mem, "vendor")
}

func hasBlacksmith(mem *[]models.MemorySlot) bool {
	return hasEffectInMem(mem, "blacksmith")
}

func countBlacksmiths(mem *[]models.MemorySlot) int {
	return countEffectInMem(mem, "blacksmith")
}

func hasBand(mem *[]models.MemorySlot) bool {
	return hasEffectInMem(mem, "band")
}

func countBands(mem *[]models.MemorySlot) int {
	return countEffectInMem(mem, "band")
}

func hasDirector(mem *[]models.MemorySlot) bool {
	return hasEffectInMem(mem, "director")
}

func countDirectors(mem *[]models.MemorySlot) int {
	return countEffectInMem(mem, "director")
}

func hasCook(mem *[]models.MemorySlot) bool {
	return hasEffectInMem(mem, "cook")
}

func countCooks(mem *[]models.MemorySlot) int {
	return countEffectInMem(mem, "cook")
}

func hasBard(mem *[]models.MemorySlot) bool {
	return hasEffectInMem(mem, "bard")
}

func countBards(mem *[]models.MemorySlot) int {
	return countEffectInMem(mem, "bard")
}

func hasEffectInMem(mem *[]models.MemorySlot, effectType string) bool {
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].EffectType == effectType {
			return true
		}
	}
	return false
}

func countEffectInMem(mem *[]models.MemorySlot, effectType string) int {
	count := 0
	for _, slot := range *mem {
		if len(slot.Cards) > 0 && slot.Cards[0].EffectType == effectType {
			count += slot.Count
		}
	}
	return count
}

func isFlagCard(session *models.BattleSession, cardID string) bool {
	// Usually the last card in activeCards of the flag holder is the flag card.
	// But during the defender's state, activeCards has exactly the flag card.
	if len(session.ActiveCards) > 0 {
		return session.ActiveCards[0].ID == cardID
	}
	return false
}

func getUniqueCardsInMem(mem []models.MemorySlot) []models.Card {
	var cards []models.Card
	for _, slot := range mem {
		if len(slot.Cards) > 0 {
			cards = append(cards, slot.Cards[0].Clone())
		}
	}
	return cards
}

func removeCardFromMemory(mem *[]models.MemorySlot, cardID string) (models.Card, bool) {
	for i, slot := range *mem {
		for j, c := range slot.Cards {
			if c.ID == cardID {
				// Remove card from slot
				ret := c.Clone()
				slot.Cards = append(slot.Cards[:j], slot.Cards[j+1:]...)
				(*mem)[i].Cards = slot.Cards
				(*mem)[i].Count--

				// If slot is empty, remove slot from memory
				if (*mem)[i].Count <= 0 {
					*mem = append((*mem)[:i], (*mem)[i+1:]...)
				}
				return ret, true
			}
		}
	}
	return models.Card{}, false
}

func convertLogCardToCard(lc *models.BattleLogCard) models.Card {
	return models.Card{
		ID:         lc.ID,
		Name:       lc.Name,
		Power:      lc.Power,
		Attribute:  lc.Attribute,
		EffectType: lc.EffectType,
	}
}

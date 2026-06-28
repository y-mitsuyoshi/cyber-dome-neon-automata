package engine

import (
	"backend/models"
	"fmt"
	"math/rand"
)

const maxMemorySlots = 6

// BattleState tracks the internal state during a battle simulation.
type BattleState struct {
	PlayerDeck           []models.Card
	CPUDeck              []models.Card
	PlayerMem            []models.MemorySlot
	CPUMem               []models.MemorySlot
	PlayerDiscard        []models.Card
	CPUDiscard           []models.Card
	FlagCard             *models.Card
	FlagHolder           string // "player" or "cpu"
	FlagPower            int
	Step                 int
	Log                  []models.BattleLogEntry
	PrevCardAttr         map[string]string // last card attribute by side
	NullifyNext          map[string]bool   // whether next card effect is nullified per side
	LockedCards          map[string]string // side -> locked card name (skip it)
	PlayerExtraFans      int
	CPUExtraFans         int
	PlayerNextAttackBuff int
	CPUNextAttackBuff    int
}

// newBattleState initialises a fresh battle.
func newBattleState(playerDeck, cpuDeck []models.Card) *BattleState {
	return &BattleState{
		PlayerDeck:           playerDeck,
		CPUDeck:              cpuDeck,
		PlayerMem:            []models.MemorySlot{},
		CPUMem:               []models.MemorySlot{},
		PlayerDiscard:        []models.Card{},
		CPUDiscard:           []models.Card{},
		FlagCard:             nil,
		FlagHolder:           "",
		FlagPower:            0,
		Step:                 0,
		Log:                  []models.BattleLogEntry{},
		PrevCardAttr:         map[string]string{"player": "", "cpu": ""},
		NullifyNext:          map[string]bool{"player": false, "cpu": false},
		LockedCards:          map[string]string{"player": "", "cpu": ""},
		PlayerExtraFans:      0,
		CPUExtraFans:         0,
		PlayerNextAttackBuff: 0,
		CPUNextAttackBuff:    0,
	}
}

// memSlotNames returns the card names in memory slots.
func memSlotNames(mem []models.MemorySlot) []string {
	names := make([]string, 0, len(mem))
	for _, s := range mem {
		names = append(names, fmt.Sprintf("%s(x%d)", s.CardName, s.Count))
	}
	return names
}

// uniqueSlotCount returns the effective unique slot count, accounting for reduce_memory_count.
func uniqueSlotCount(mem []models.MemorySlot) int {
	count := len(mem)
	reduction := 0
	for _, slot := range mem {
		for _, c := range slot.Cards {
			if c.EffectType == "reduce_memory_count" {
				reduction++
			}
		}
	}
	count -= reduction
	if count < 0 {
		count = 0
	}
	return count
}

// benchPowerBonus returns the total +power bonus from bench_power_plus_1/2 cards in memory.
func benchPowerBonus(mem []models.MemorySlot) int {
	bonus := 0
	for _, slot := range mem {
		for _, c := range slot.Cards {
			if c.EffectType == "bench_power_plus_1" {
				bonus += 1
			} else if c.EffectType == "bench_power_plus_2" {
				bonus += 2
			}
		}
	}
	return bonus
}

// addToMemory adds a card to memory slots. Returns true if successful, false if overflow.
func addToMemory(mem *[]models.MemorySlot, card models.Card) bool {
	for i, slot := range *mem {
		if slot.CardName == card.Name {
			(*mem)[i].Cards = append((*mem)[i].Cards, card)
			(*mem)[i].Count++
			return true
		}
	}

	effective := uniqueSlotCount(*mem)
	if effective+1 > maxMemorySlots {
		return false
	}

	*mem = append(*mem, models.MemorySlot{
		CardName: card.Name,
		Cards:    []models.Card{card},
		Count:    1,
	})
	return true
}

func countAttributeInMemory(mem []models.MemorySlot, attr string) int {
	count := 0
	for _, slot := range mem {
		if len(slot.Cards) > 0 && slot.Cards[0].Attribute == attr {
			count += slot.Count
		}
	}
	return count
}

// drawCard draws the top card from a deck, skipping locked cards.
func drawCard(deck *[]models.Card, lockedName string) (models.Card, bool) {
	for i, c := range *deck {
		if lockedName != "" && c.Name == lockedName {
			continue
		}
		card := c
		*deck = append((*deck)[:i], (*deck)[i+1:]...)
		return card, true
	}
	return models.Card{}, false
}

// applyOnRevealEffects applies effects that trigger when a card is revealed.
func (bs *BattleState) applyOnRevealEffects(card *models.Card, side string, effectivePower *int) string {
	if bs.NullifyNext[side] {
		bs.NullifyNext[side] = false
		return "Effect nullified by opponent"
	}

	var myMem *[]models.MemorySlot
	var myDeck *[]models.Card
	var myDiscard *[]models.Card
	var oppMem *[]models.MemorySlot
	var oppDeck *[]models.Card
	var oppDiscard *[]models.Card

	if side == "player" {
		myMem = &bs.PlayerMem
		myDeck = &bs.PlayerDeck
		myDiscard = &bs.PlayerDiscard
		oppMem = &bs.CPUMem
		oppDeck = &bs.CPUDeck
		oppDiscard = &bs.CPUDiscard
	} else {
		myMem = &bs.CPUMem
		myDeck = &bs.CPUDeck
		myDiscard = &bs.CPUDiscard
		oppMem = &bs.PlayerMem
		oppDeck = &bs.PlayerDeck
		oppDiscard = &bs.PlayerDiscard
	}

	// Recalculate passive buffs from memory
	bonus := benchPowerBonus(*myMem)
	*effectivePower += bonus

	// ai NeuroCore buff
	if card.Power == 2 && hasEffectInMem(myMem, "ai") {
		*effectivePower += countEffectInMem(myMem, "ai")
	}

	// makeup_artist buff (revealed card is challenger, so always attacking)
	if card.Power == 1 && countMakeupArtists(myMem) > 0 {
		*effectivePower += countMakeupArtists(myMem) * 2
	}

	// vendor buff
	if card.Attribute == "Matrix" && hasVendor(myMem) {
		*effectivePower += countVendors(myMem)
	}

	// blacksmith buff
	if card.Attribute == "Sector" && hasBlacksmith(myMem) {
		*effectivePower += countBlacksmiths(myMem)
	}

	// band buff
	if card.Attribute == "Orbit" && hasBand(myMem) {
		*effectivePower += countBands(myMem)
	}

	// director buff (attacking)
	if card.Attribute == "HoloMedia" && hasDirector(myMem) {
		*effectivePower += countDirectors(myMem)
	}

	// bard buff (attacking)
	if hasBard(myMem) {
		*effectivePower += countBards(myMem)
	}

	effectText := ""

	switch card.EffectType {
	case "jester":
		if hasPower1Card(myMem) {
			*effectivePower += 3
			effectText = fmt.Sprintf("%s gains +3 power (Power 1 on bench)", card.Name)
		}
	case "hermit":
		leakCount := len(*myDiscard)
		if leakCount > 0 {
			*effectivePower += leakCount
			effectText = fmt.Sprintf("%s gains +%d power from discard", card.Name, leakCount)
		}
	case "stable_boy":
		count2 := countPower2Cards(myMem)
		if count2 > 0 {
			*effectivePower += count2
			effectText = fmt.Sprintf("%s gains +%d power (Power 2 on bench)", card.Name, count2)
		}
	case "pig":
		attrCount := countUniqueAttributes(oppMem)
		if attrCount > 0 {
			*effectivePower += attrCount
			effectText = fmt.Sprintf("%s gains +%d power (opponent unique attributes)", card.Name, attrCount)
		}
	case "talent":
		deckCount := len(*myDeck)
		if deckCount%2 == 0 {
			*effectivePower += 3
			effectText = fmt.Sprintf("%s gains +3 power (even deck count)", card.Name)
		}
	case "gangster":
		*effectivePower += 2
		effectText = fmt.Sprintf("%s gains +2 power on attack", card.Name)
	case "merman":
		deepCount := countAttributeInMemory(*myMem, "DeepWeb")
		if deepCount >= 2 {
			*effectivePower += 4
			effectText = fmt.Sprintf("%s gains +4 power (>=2 DeepWeb on bench)", card.Name)
		}
	case "lifeguard":
		if len(*myDeck) <= 3 {
			*effectivePower += 4
			effectText = fmt.Sprintf("%s gains +4 power (deck <= 3)", card.Name)
		}
	case "teenager":
		daemonCount := countAttributeInMemory(*myMem, "Daemon")
		if daemonCount > 0 {
			*effectivePower += daemonCount * 2
			effectText = fmt.Sprintf("%s gains +%d power (Daemon on bench)", card.Name, daemonCount*2)
		}
	case "mime":
		emptySlots := 6 - uniqueSlotCount(*myMem)
		if emptySlots > 0 {
			*effectivePower += emptySlots * 3
			effectText = fmt.Sprintf("%s gains +%d power (empty slots)", card.Name, emptySlots*3)
		}
	case "ufo":
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
			rc.ID = fmt.Sprintf("%s_ufo_%d_%d", rc.ID, bs.Step, addedCount)
			*myDeck = append(*myDeck, rc)
			addedCount++
		}
		effectText = fmt.Sprintf("%s adds 2 A-cards to bottom of deck", card.Name)
	case "ghost":
		if len(*oppDeck) > 0 {
			c := (*oppDeck)[0]
			*oppDeck = (*oppDeck)[1:]
			*oppDiscard = append(*oppDiscard, c)
			effectText = fmt.Sprintf("%s banishes opponent's top card: %s", card.Name, c.Name)
		}
	case "hologram":
		all := AllCards()
		var bCards []models.Card
		for _, bc := range all {
			if bc.Deck == "B" {
				bCards = append(bCards, bc)
			}
		}
		if len(bCards) > 0 {
			rc := bCards[rand.Intn(len(bCards))].Clone()
			rc.ID = fmt.Sprintf("%s_holo_%d", rc.ID, bs.Step)
			*oppDeck = append([]models.Card{rc}, *oppDeck...)
			effectText = fmt.Sprintf("%s puts a B-card on top of opponent's deck", card.Name)
		}
	case "villain":
		all := AllCards()
		var aCards []models.Card
		for _, ac := range all {
			if ac.Deck == "A" {
				aCards = append(aCards, ac)
			}
		}
		if len(aCards) > 0 {
			rc := aCards[rand.Intn(len(aCards))].Clone()
			rc.ID = fmt.Sprintf("%s_villain_%d", rc.ID, bs.Step)
			*myDeck = append([]models.Card{rc}, *myDeck...)
			effectText = fmt.Sprintf("%s puts an A-card on top of deck", card.Name)
		}
	case "submarine":
		if len(*myDeck) > 0 {
			lastIdx := len(*myDeck) - 1
			c := (*myDeck)[lastIdx]
			*myDeck = (*myDeck)[:lastIdx]
			*myDiscard = append(*myDiscard, c)
			effectText = fmt.Sprintf("%s banishes bottom card of deck: %s", card.Name, c.Name)
		}
	case "pyrotechnist":
		if uniqueSlotCount(*myMem) >= 6 {
			if side == "player" {
				bs.PlayerExtraFans += 3
			} else {
				bs.CPUExtraFans += 3
			}
			effectText = fmt.Sprintf("%s gains 3 fans (bench full)", card.Name)
		}
	case "necromancer":
		var lowestCard *models.Card
		for _, slot := range *myMem {
			if len(slot.Cards) > 0 {
				c := &slot.Cards[0]
				if lowestCard == nil || c.Power < lowestCard.Power {
					lowestCard = c
				}
			}
		}
		if lowestCard != nil {
			c, found := removeCardFromMemory(myMem, lowestCard.ID)
			if found {
				*myDeck = append([]models.Card{c}, *myDeck...)
				effectText = fmt.Sprintf("%s returns benched %s to top of deck", card.Name, c.Name)
			}
		}
	case "siren":
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
				effectText = fmt.Sprintf("%s banishes opponent's benched %s", card.Name, c.Name)
			}
		}
	case "butler", "pumpkin":
		banished := 0
		for banished < 2 {
			var lowestCard *models.Card
			for _, slot := range *myMem {
				if len(slot.Cards) > 0 {
					c := &slot.Cards[0]
					if lowestCard == nil || c.Power < lowestCard.Power {
						lowestCard = c
					}
				}
			}
			if lowestCard != nil {
				c, found := removeCardFromMemory(myMem, lowestCard.ID)
				if found {
					*myDiscard = append(*myDiscard, c)
					banished++
				}
			} else {
				break
			}
		}
		if banished > 0 {
			effectText = fmt.Sprintf("%s banishes %d cards from bench", card.Name, banished)
		}
	case "magician":
		var targetCard *models.Card
		for _, slot := range *myMem {
			if len(slot.Cards) > 0 && slot.Cards[0].Power <= 3 {
				targetCard = &slot.Cards[0]
				break
			}
		}
		if targetCard != nil {
			c, found := removeCardFromMemory(myMem, targetCard.ID)
			if found {
				*myDiscard = append(*myDiscard, c)
				effectText = fmt.Sprintf("%s banishes benched %s", card.Name, c.Name)
			}
		}
	case "vampire":
		var targetCard *models.Card
		for _, slot := range *myMem {
			if len(slot.Cards) > 0 && slot.Cards[0].Deck == "B" {
				targetCard = &slot.Cards[0]
				break
			}
		}
		if targetCard != nil {
			c, found := removeCardFromMemory(myMem, targetCard.ID)
			if found {
				*myDeck = append([]models.Card{c}, *myDeck...)
				effectText = fmt.Sprintf("%s returns benched %s to top of deck", card.Name, c.Name)
			}
		}
	case "moviestar":
		var targetCard *models.Card
		for _, slot := range *myMem {
			if len(slot.Cards) > 0 && slot.Cards[0].Attribute == "HoloMedia" && (slot.Cards[0].Power == 1 || slot.Cards[0].Power == 2) {
				targetCard = &slot.Cards[0]
				break
			}
		}
		if targetCard != nil {
			c, found := removeCardFromMemory(myMem, targetCard.ID)
			if found {
				*myDeck = append([]models.Card{c}, *myDeck...)
				effectText = fmt.Sprintf("%s returns benched %s to top of deck", card.Name, c.Name)
			}
		}
	}

	return effectText
}

// applyOnDefendEffect applies effects triggered when a card is used to defend (flag holder).
func (bs *BattleState) applyOnDefendEffect(card models.Card, side string) string {
	var myMem *[]models.MemorySlot
	if side == "player" {
		myMem = &bs.PlayerMem
	} else {
		myMem = &bs.CPUMem
	}

	effectText := ""

	if hasCook(myMem) {
		bs.FlagPower += countCooks(myMem)
		effectText = fmt.Sprintf("Cook buff applied: +%d power", countCooks(myMem))
	}

	return effectText
}

// applyOnWinEffect applies effects triggered when a card wins the flag.
func (bs *BattleState) applyOnWinEffect(card models.Card, side string) string {
	var oppMem *[]models.MemorySlot
	var oppDiscard *[]models.Card
	var myMem *[]models.MemorySlot

	if side == "player" {
		oppMem = &bs.CPUMem
		oppDiscard = &bs.CPUDiscard
		myMem = &bs.PlayerMem
	} else {
		oppMem = &bs.PlayerMem
		oppDiscard = &bs.PlayerDiscard
		myMem = &bs.CPUMem
	}

	effectText := ""

	switch card.EffectType {
	case "hero":
		if side == "player" {
			bs.PlayerExtraFans += 2
		} else {
			bs.CPUExtraFans += 2
		}
		effectText = "Hero wins flag, gains 2 fans"
	case "cowboy":
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
				effectText = fmt.Sprintf("Cowboy banishes opponent's %s", c.Name)
			}
		}
	case "illusionist":
		emptySlots := 6 - uniqueSlotCount(*myMem)
		if emptySlots > 0 {
			bs.FlagPower += emptySlots
			effectText = fmt.Sprintf("Illusionist gains +%d power", emptySlots)
		}
	}

	return effectText
}

func (bs *BattleState) logEntry(action, side string, card *models.Card, power int, effect string, flagHolder string, details string) {
	bs.Step++
	var logCard *models.BattleLogCard
	if card != nil {
		logCard = &models.BattleLogCard{
			ID:        card.ID,
			Name:      card.Name,
			Power:     card.Power,
			BasePower: card.Power,
			Attribute: card.Attribute,
		}
	}
	entry := models.BattleLogEntry{
		Step:            bs.Step,
		Action:          action,
		Player:          side,
		Card:            logCard,
		CurrentPower:    power,
		EffectTriggered: effect,
		PlayerMemSlots:  memSlotNames(bs.PlayerMem),
		CPUMemSlots:     memSlotNames(bs.CPUMem),
		PlayerDeckCount: len(bs.PlayerDeck),
		CPUDeckCount:    len(bs.CPUDeck),
		FlagHolder:      flagHolder,
		Details:         details,
	}
	bs.Log = append(bs.Log, entry)
}

// RunBattle executes the full battle simulation between two players.
// playerDeck and cpuDeck should be pre-shuffled copies.
func RunBattle(playerDeck, cpuDeck []models.Card) models.BattleResult {
	bs := newBattleState(playerDeck, cpuDeck)

	// Phase 1: Player reveals first card to claim the flag
	startingSide := "player"
	otherSide := "cpu"
	if rand.Intn(2) == 0 {
		startingSide = "cpu"
		otherSide = "player"
	}

	var startDeck *[]models.Card
	var lockedKey string
	if startingSide == "player" {
		startDeck = &bs.PlayerDeck
		lockedKey = "player"
	} else {
		startDeck = &bs.CPUDeck
		lockedKey = "cpu"
	}

	card, ok := drawCard(startDeck, bs.LockedCards[lockedKey])
	if !ok {
		return models.BattleResult{
			Winner: otherSide, Loser: startingSide, Reason: fmt.Sprintf("%s has no cards", startingSide),
			Log: bs.Log, FansGained: 1,
		}
	}

	effectivePower := card.Power
	effect := bs.applyOnRevealEffects(&card, startingSide, &effectivePower)
	bs.FlagHolder = startingSide
	bs.FlagPower = effectivePower
	bs.PrevCardAttr[startingSide] = card.Attribute
	bs.logEntry("reveal", startingSide, &card, bs.FlagPower, effect, bs.FlagHolder, fmt.Sprintf("%s claims the flag", startingSide))

	// Main battle loop
	for {
		challengerSide := "cpu"
		if bs.FlagHolder == "cpu" {
			challengerSide = "player"
		}

		challengerPower := 0
		var revealedCards []models.Card
		flagTaken := false
		winCardPower := 0

		for {
			var challengerDeck *[]models.Card
			if challengerSide == "player" {
				challengerDeck = &bs.PlayerDeck
			} else {
				challengerDeck = &bs.CPUDeck
			}

			cCard, cOk := drawCard(challengerDeck, bs.LockedCards[challengerSide])
			if !cOk {
				// Challenger ran out of cards
				bs.logEntry("deck_empty", challengerSide, nil, challengerPower, "No cards left",
					bs.FlagHolder, fmt.Sprintf("%s cannot draw", challengerSide))
				winner := bs.FlagHolder
				loser := challengerSide
				return models.BattleResult{
					Winner: winner, Loser: loser,
					Reason: fmt.Sprintf("%s ran out of cards", loser),
					Log:    bs.Log, FansGained: 2,
				}
			}

			bs.LockedCards[challengerSide] = ""

			// Apply NextAttackBuff for the first card of challenger
			if len(revealedCards) == 0 {
				var buff int
				if challengerSide == "player" {
					buff = bs.PlayerNextAttackBuff
					bs.PlayerNextAttackBuff = 0
				} else {
					buff = bs.CPUNextAttackBuff
					bs.CPUNextAttackBuff = 0
				}
				if buff > 0 {
					cCard.Power += buff
				}
			}

			ePower := cCard.Power
			cEffect := bs.applyOnRevealEffects(&cCard, challengerSide, &ePower)
			challengerPower += ePower
			revealedCards = append(revealedCards, cCard)
			bs.PrevCardAttr[challengerSide] = cCard.Attribute

			bs.logEntry("reveal", challengerSide, &cCard, challengerPower, cEffect,
				bs.FlagHolder, fmt.Sprintf("Challenger cumulative power: %d vs flag: %d", challengerPower, bs.FlagPower))

			if challengerPower >= bs.FlagPower {
				flagTaken = true
				winCardPower = ePower
				break
			}
		}

		if flagTaken {
			oldFlagHolder := bs.FlagHolder
			newFlagHolder := challengerSide

			var oldFlagCard *models.Card
			for i := len(bs.Log) - 1; i >= 0; i-- {
				if bs.Log[i].Action == "flag_change" && bs.Log[i].Player == oldFlagHolder && bs.Log[i].Card != nil {
					c := convertLogCardToCard(bs.Log[i].Card)
					oldFlagCard = &c
					break
				}
			}

			// 1. Move old defender cards to memory / discard
			if oldFlagCard != nil {
				var oppMem *[]models.MemorySlot
				var oppDiscard *[]models.Card
				if oldFlagHolder == "player" {
					oppMem = &bs.PlayerMem
					oppDiscard = &bs.PlayerDiscard
				} else {
					oppMem = &bs.CPUMem
					oppDiscard = &bs.CPUDiscard
				}

				if oldFlagCard.EffectType == "prince" || oldFlagCard.EffectType == "rescue_pod" {
					*oppDiscard = append(*oppDiscard, *oldFlagCard)
					bs.logEntry("bench", oldFlagHolder, oldFlagCard, 0, oldFlagCard.EffectType, bs.FlagHolder,
						fmt.Sprintf("%s was benched to discard (effect: %s)", oldFlagCard.Name, oldFlagCard.EffectType))
				} else {
					if !addToMemory(oppMem, *oldFlagCard) {
						// Memory overflow!
						winner := newFlagHolder
						loser := oldFlagHolder
						bs.logEntry("memory_overflow", oldFlagHolder, oldFlagCard, 0, "MEMORY OVERFLOW", bs.FlagHolder,
							fmt.Sprintf("%s memory overflow", oldFlagHolder))
						return models.BattleResult{
							Winner: winner, Loser: loser,
							Reason: fmt.Sprintf("%s memory overflow", loser),
							Log:    bs.Log, FansGained: 3,
						}
					}
					bs.logEntry("bench", oldFlagHolder, oldFlagCard, 0, "Card benched", bs.FlagHolder,
						fmt.Sprintf("%s benched to memory", oldFlagCard.Name))
				}

				// Apply Comic buff (next attack gets +2)
				if oldFlagCard.EffectType == "comic" {
					if oldFlagHolder == "player" {
						bs.PlayerNextAttackBuff += 2
					} else {
						bs.CPUNextAttackBuff += 2
					}
					bs.logEntry("effect", oldFlagHolder, oldFlagCard, 0, "comic", bs.FlagHolder,
						fmt.Sprintf("%s comic effect triggered: next attack power +2", oldFlagCard.Name))
				}

				// Apply Loss choice effects automatically
				if oldFlagCard.EffectType == "navigator" {
					bs.logEntry("effect", oldFlagHolder, oldFlagCard, 0, "navigator", bs.FlagHolder,
						fmt.Sprintf("%s navigator effect applied (order kept)", oldFlagCard.Name))
				} else if oldFlagCard.EffectType == "fortune_teller" {
					bs.logEntry("effect", oldFlagHolder, oldFlagCard, 0, "fortune_teller", bs.FlagHolder,
						fmt.Sprintf("%s fortune_teller effect applied (first card on top)", oldFlagCard.Name))
				}
			}

			// 2. Move challenger's non-winning active cards to memory
			for i := 0; i < len(revealedCards)-1; i++ {
				var mem *[]models.MemorySlot
				if challengerSide == "player" {
					mem = &bs.PlayerMem
				} else {
					mem = &bs.CPUMem
				}
				if !addToMemory(mem, revealedCards[i]) {
					winner := oldFlagHolder
					loser := challengerSide
					bs.logEntry("memory_overflow", challengerSide, &revealedCards[i], 0, "MEMORY OVERFLOW", bs.FlagHolder,
						fmt.Sprintf("%s memory overflow", challengerSide))
					return models.BattleResult{
						Winner: winner, Loser: loser,
						Reason: fmt.Sprintf("%s memory overflow", loser),
						Log:    bs.Log, FansGained: 3,
					}
				}
				bs.logEntry("bench", challengerSide, &revealedCards[i], 0, "Card benched", bs.FlagHolder,
					fmt.Sprintf("%s benched to memory", revealedCards[i].Name))
			}

			// The winning card becomes the new flag card
			winCard := revealedCards[len(revealedCards)-1]

			// Apply on-win effects
			winEffect := bs.applyOnWinEffect(winCard, challengerSide)
			if winEffect != "" {
				bs.logEntry("effect", challengerSide, &winCard, challengerPower, winEffect,
					newFlagHolder, "On-win effect triggered")
			}

			// Apply on-defend effects (cook)
			dEffect := bs.applyOnDefendEffect(winCard, challengerSide)
			if dEffect != "" {
				bs.logEntry("defend_effect", challengerSide, &winCard, bs.FlagPower, dEffect,
					newFlagHolder, "Defend effect applied")
			}

			// Update flag
			bs.FlagHolder = newFlagHolder
			bs.FlagPower = winCardPower

			// Re-apply Illusionist buff if it won
			if winCard.EffectType == "illusionist" {
				var myMem *[]models.MemorySlot
				if challengerSide == "player" {
					myMem = &bs.PlayerMem
				} else {
					myMem = &bs.CPUMem
				}
				emptySlots := 6 - uniqueSlotCount(*myMem)
				if emptySlots > 0 {
					bs.FlagPower += emptySlots
				}
			}

			bs.logEntry("flag_change", newFlagHolder, &winCard, bs.FlagPower,
				fmt.Sprintf("Flag claimed by %s", newFlagHolder), bs.FlagHolder,
				fmt.Sprintf("%s now holds the flag with power %d", newFlagHolder, bs.FlagPower))

			// Check if both decks are empty — flag holder wins
			if len(bs.PlayerDeck) == 0 && len(bs.CPUDeck) == 0 {
				winner := bs.FlagHolder
				loser := "cpu"
				if winner == "cpu" {
					loser = "player"
				}
				bs.logEntry("game_end", winner, nil, bs.FlagPower, "Both decks empty",
					bs.FlagHolder, fmt.Sprintf("%s wins — both decks exhausted", winner))
				return models.BattleResult{
					Winner: winner, Loser: loser,
					Reason: "Both decks exhausted, flag holder wins",
					Log:    bs.Log, FansGained: 2,
				}
			}

			// Check if only the new challenger's deck is empty
			if bs.FlagHolder == "player" && len(bs.CPUDeck) == 0 {
				bs.logEntry("game_end", "player", nil, bs.FlagPower, "CPU deck empty",
					bs.FlagHolder, "Player wins — CPU has no cards to challenge")
				return models.BattleResult{
					Winner: "player", Loser: "cpu",
					Reason: "CPU ran out of cards",
					Log:    bs.Log, FansGained: 2,
				}
			}
			if bs.FlagHolder == "cpu" && len(bs.PlayerDeck) == 0 {
				bs.logEntry("game_end", "cpu", nil, bs.FlagPower, "Player deck empty",
					bs.FlagHolder, "CPU wins — Player has no cards to challenge")
				return models.BattleResult{
					Winner: "cpu", Loser: "player",
					Reason: "Player ran out of cards",
					Log:    bs.Log, FansGained: 2,
				}
			}
		}

		// Safety: prevent infinite loops if somehow we get stuck
		if bs.Step > 200 {
			bs.logEntry("game_end", bs.FlagHolder, nil, bs.FlagPower, "Max steps reached",
				bs.FlagHolder, "Battle ended due to step limit")
			loser := "cpu"
			if bs.FlagHolder == "cpu" {
				loser = "player"
			}
			return models.BattleResult{
				Winner: bs.FlagHolder, Loser: loser,
				Reason: "Battle step limit reached, flag holder wins",
				Log:    bs.Log, FansGained: 1,
			}
		}
	}
}

// GetMatchups generates round-robin tournament matchups for T players (where T is 3-8) for a given round.
// It returns a list of index pairs representing matches.
// If the number of players is odd, a dummy index -1 is used to represent a BYE.
func GetMatchups(round int, numPlayers int) [][2]int {
	isOdd := numPlayers%2 != 0
	n := numPlayers
	if isOdd {
		n = numPlayers + 1
	}

	r := round - 1 // 0-indexed round
	pairs := make([][2]int, 0, n/2)

	// Circle method rotation
	temp := make([]int, n)
	temp[0] = 0
	for i := 1; i < n; i++ {
		temp[i] = 1 + (i-1+r)%(n-1)
	}

	// Pair elements: temp[i] with temp[n-1-i]
	for i := 0; i < n/2; i++ {
		p1 := temp[i]
		p2 := temp[n-1-i]

		// Map dummy player to -1
		if isOdd {
			if p1 == n-1 {
				p1 = -1
			}
			if p2 == n-1 {
				p2 = -1
			}
		}

		pairs = append(pairs, [2]int{p1, p2})
	}
	return pairs
}

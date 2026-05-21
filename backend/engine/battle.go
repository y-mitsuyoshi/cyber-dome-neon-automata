package engine

import (
	"backend/models"
	"fmt"
	"math/rand"
)

const maxMemorySlots = 6

// BattleState tracks the internal state during a battle simulation.
type BattleState struct {
	PlayerDeck   []models.Card
	CPUDeck      []models.Card
	PlayerMem    []models.MemorySlot
	CPUMem       []models.MemorySlot
	FlagHolder   string // "player" or "cpu"
	FlagPower    int
	Step         int
	Log          []models.BattleLogEntry
	PrevCardAttr map[string]string // last card attribute by side
	NullifyNext  map[string]bool   // whether next card effect is nullified per side
	LockedCards  map[string]string // side -> locked card name (skip it)
}

// newBattleState initialises a fresh battle.
func newBattleState(playerDeck, cpuDeck []models.Card) *BattleState {
	return &BattleState{
		PlayerDeck:   playerDeck,
		CPUDeck:      cpuDeck,
		PlayerMem:    []models.MemorySlot{},
		CPUMem:       []models.MemorySlot{},
		FlagHolder:   "",
		FlagPower:    0,
		Step:         0,
		Log:          []models.BattleLogEntry{},
		PrevCardAttr: map[string]string{"player": "", "cpu": ""},
		NullifyNext:  map[string]bool{"player": false, "cpu": false},
		LockedCards:  map[string]string{"player": "", "cpu": ""},
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

// benchPowerBonus returns the total +power bonus from bench_power_plus_1 cards in memory.
func benchPowerBonus(mem []models.MemorySlot) int {
	bonus := 0
	for _, slot := range mem {
		for _, c := range slot.Cards {
			if c.EffectType == "bench_power_plus_1" {
				bonus++
			}
		}
	}
	return bonus
}

// countAIInMemory counts how many AI-attribute cards are in memory.
func countAIInMemory(mem []models.MemorySlot) int {
	count := 0
	for _, slot := range mem {
		for _, c := range slot.Cards {
			if c.Attribute == "AI" {
				count++
			}
		}
	}
	return count
}

// hasSameNameInMemory checks if a card name exists in memory.
func hasSameNameInMemory(mem []models.MemorySlot, name string) bool {
	for _, slot := range mem {
		if slot.CardName == name {
			return true
		}
	}
	return false
}

// addToMemory adds a card to memory slots. Returns true if successful, false if overflow.
func addToMemory(mem *[]models.MemorySlot, card models.Card) bool {
	// Check if same-name slot exists — stack it.
	for i, slot := range *mem {
		if slot.CardName == card.Name {
			(*mem)[i].Cards = append((*mem)[i].Cards, card)
			(*mem)[i].Count++
			return true
		}
	}

	// ram_save_20pct: 20% chance to skip using a new slot
	if card.EffectType == "ram_save_20pct" {
		if rand.Intn(100) < 20 {
			return true // saved! don't consume slot
		}
	}

	// Need a new unique slot — check overflow
	effective := uniqueSlotCount(*mem)
	if effective+1 > maxMemorySlots {
		return false // memory overflow
	}

	*mem = append(*mem, models.MemorySlot{
		CardName: card.Name,
		Cards:    []models.Card{card},
		Count:    1,
	})
	return true
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
	enemySide := "cpu"
	if side == "cpu" {
		enemySide = "player"
	}

	// Check if this card's effect is nullified
	if bs.NullifyNext[side] {
		bs.NullifyNext[side] = false
		return "Effect nullified by opponent"
	}

	// Apply bench power bonus
	var myMem *[]models.MemorySlot
	if side == "player" {
		myMem = &bs.PlayerMem
	} else {
		myMem = &bs.CPUMem
	}
	bonus := benchPowerBonus(*myMem)
	if bonus > 0 {
		*effectivePower += bonus
	}

	switch card.EffectType {
	case "power_minus_2":
		bs.FlagPower -= 2
		if bs.FlagPower < 0 {
			bs.FlagPower = 0
		}
		return fmt.Sprintf("%s reduces flag holder power by 2 (now %d)", card.Name, bs.FlagPower)

	case "nullify_next_effect":
		bs.NullifyNext[enemySide] = true
		return fmt.Sprintf("%s nullifies the next enemy card effect", card.Name)

	case "power_per_ai_in_memory":
		aiCount := countAIInMemory(*myMem)
		boost := 2 * aiCount
		*effectivePower += boost
		return fmt.Sprintf("%s gains +%d power (%d AI in memory)", card.Name, boost, aiCount)

	case "double_if_same_name":
		if hasSameNameInMemory(*myMem, card.Name) {
			*effectivePower *= 2
			return fmt.Sprintf("%s power doubled (same name in memory) -> %d", card.Name, *effectivePower)
		}
		return "No same-name card in memory"

	case "power_if_prev_ai":
		if bs.PrevCardAttr[side] == "AI" {
			*effectivePower += 3
			return fmt.Sprintf("%s gains +3 power (previous card was AI)", card.Name)
		}
		return "Previous card was not AI"

	case "peek_enemy":
		var enemyDeck *[]models.Card
		if side == "player" {
			enemyDeck = &bs.CPUDeck
		} else {
			enemyDeck = &bs.PlayerDeck
		}
		if len(*enemyDeck) > 0 {
			peek := (*enemyDeck)[0]
			return fmt.Sprintf("%s peeks: enemy next card is %s (power %d)", card.Name, peek.Name, peek.Power)
		}
		return fmt.Sprintf("%s peeks: enemy deck is empty", card.Name)

	case "redirect_30pct", "lock_enemy_highest", "ram_save_20pct",
		"reduce_memory_count", "bench_power_plus_1", "delete_enemy_card":
		// These trigger at other phases, not on reveal
		if bonus > 0 {
			return fmt.Sprintf("Bench bonus applied: +%d power", bonus)
		}
		return "No effect on reveal"

	default:
		if bonus > 0 {
			return fmt.Sprintf("Bench bonus applied: +%d power", bonus)
		}
		return "No effect"
	}
}

// applyOnDefendEffect applies effects triggered when a card is used to defend (flag holder).
func (bs *BattleState) applyOnDefendEffect(card models.Card, side string) string {
	enemySide := "cpu"
	if side == "cpu" {
		enemySide = "player"
	}

	switch card.EffectType {
	case "lock_enemy_highest":
		// Lock the enemy's highest power card
		var enemyDeck *[]models.Card
		if side == "player" {
			enemyDeck = &bs.CPUDeck
		} else {
			enemyDeck = &bs.PlayerDeck
		}
		highestName := ""
		highestPow := -1
		for _, c := range *enemyDeck {
			if c.Power > highestPow {
				highestPow = c.Power
				highestName = c.Name
			}
		}
		if highestName != "" {
			bs.LockedCards[enemySide] = highestName
			return fmt.Sprintf("%s locks enemy card %s (power %d)", card.Name, highestName, highestPow)
		}
		return "No enemy card to lock"

	case "redirect_30pct":
		if rand.Intn(100) < 30 {
			// Swap flag holder back
			return fmt.Sprintf("%s REDIRECTED! Flag holder swaps back", card.Name)
		}
		return fmt.Sprintf("%s redirect failed (70%% chance)", card.Name)

	default:
		return ""
	}
}

// applyOnWinEffect applies effects triggered when a card wins the flag.
func (bs *BattleState) applyOnWinEffect(card models.Card, side string) string {
	switch card.EffectType {
	case "delete_enemy_card":
		var enemyDeck *[]models.Card
		if side == "player" {
			enemyDeck = &bs.CPUDeck
		} else {
			enemyDeck = &bs.PlayerDeck
		}
		if len(*enemyDeck) > 0 {
			deleted := (*enemyDeck)[0]
			*enemyDeck = (*enemyDeck)[1:]
			return fmt.Sprintf("%s deleted enemy card: %s", card.Name, deleted.Name)
		}
		return "No enemy card to delete"
	default:
		return ""
	}
}

func (bs *BattleState) logEntry(action, side string, card *models.Card, power int, effect string, flagHolder string, details string) {
	bs.Step++
	var logCard *models.BattleLogCard
	if card != nil {
		logCard = &models.BattleLogCard{
			Name:      card.Name,
			Power:     card.Power,
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
	card, ok := drawCard(&bs.PlayerDeck, bs.LockedCards["player"])
	if !ok {
		return models.BattleResult{
			Winner: "cpu", Loser: "player", Reason: "Player has no cards",
			Log: bs.Log, FansGained: 1,
		}
	}

	effectivePower := card.Power
	effect := bs.applyOnRevealEffects(&card, "player", &effectivePower)
	bs.FlagHolder = "player"
	bs.FlagPower = effectivePower
	bs.PrevCardAttr["player"] = card.Attribute
	bs.logEntry("reveal", "player", &card, bs.FlagPower, effect, bs.FlagHolder, "Player claims the flag")

	// Main battle loop
	for {
		// Determine challenger and flag holder
		challengerSide := "cpu"
		if bs.FlagHolder == "cpu" {
			challengerSide = "player"
		}

		// Challenger reveals cards until they exceed flag power or run out
		challengerPower := 0
		var revealedCards []models.Card
		flagTaken := false

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
					Log: bs.Log, FansGained: 2,
				}
			}

			// Clear locked card after skipping check
			bs.LockedCards[challengerSide] = ""

			ePower := cCard.Power
			cEffect := bs.applyOnRevealEffects(&cCard, challengerSide, &ePower)
			challengerPower += ePower
			revealedCards = append(revealedCards, cCard)
			bs.PrevCardAttr[challengerSide] = cCard.Attribute

			bs.logEntry("reveal", challengerSide, &cCard, challengerPower, cEffect,
				bs.FlagHolder, fmt.Sprintf("Challenger cumulative power: %d vs flag: %d", challengerPower, bs.FlagPower))

			if challengerPower > bs.FlagPower {
				flagTaken = true
				break
			}
		}

		if flagTaken {
			// The old flag holder's card goes to their memory
			// All the challenger's revealed cards that didn't win go to challenger memory
			// The flag holder loses the flag, their card goes to memory
			oldFlagHolder := bs.FlagHolder
			newFlagHolder := challengerSide

			// All challenger's revealed cards except the last go to challenger's memory
			for i := 0; i < len(revealedCards)-1; i++ {
				var mem *[]models.MemorySlot
				if challengerSide == "player" {
					mem = &bs.PlayerMem
				} else {
					mem = &bs.CPUMem
				}
				if !addToMemory(mem, revealedCards[i]) {
					// Memory overflow!
					bs.logEntry("memory_overflow", challengerSide, &revealedCards[i], 0,
						"MEMORY OVERFLOW", bs.FlagHolder,
						fmt.Sprintf("%s memory overflow with card %s", challengerSide, revealedCards[i].Name))
					return models.BattleResult{
						Winner: oldFlagHolder, Loser: challengerSide,
						Reason: fmt.Sprintf("%s memory overflow (>%d unique slots)", challengerSide, maxMemorySlots),
						Log: bs.Log, FansGained: 3,
					}
				}
				bs.logEntry("bench", challengerSide, &revealedCards[i], 0,
					"Card sent to memory", newFlagHolder,
					fmt.Sprintf("%s benched to %s's memory", revealedCards[i].Name, challengerSide))
			}

			// The winning card becomes the new flag card
			winCard := revealedCards[len(revealedCards)-1]

			// Apply on-win effects
			winEffect := bs.applyOnWinEffect(winCard, challengerSide)
			if winEffect != "" {
				bs.logEntry("effect", challengerSide, &winCard, challengerPower, winEffect,
					newFlagHolder, "On-win effect triggered")
			}

			// Apply on-defend effects from the old flag holder's previous cards
			// (we approximate: check the last card from the flag holder side in the log)
			// For defend effects, we need to apply them now
			var defenderMem *[]models.MemorySlot
			if oldFlagHolder == "player" {
				defenderMem = &bs.PlayerMem
			} else {
				defenderMem = &bs.CPUMem
			}
			// Apply defend effects from cards in the defender's memory
			for _, slot := range *defenderMem {
				for _, mc := range slot.Cards {
					if mc.EffectType == "redirect_30pct" || mc.EffectType == "lock_enemy_highest" {
						dEffect := bs.applyOnDefendEffect(mc, oldFlagHolder)
						if dEffect != "" {
							bs.logEntry("defend_effect", oldFlagHolder, nil, 0, dEffect,
								newFlagHolder, "Defend effect from memory")
							if mc.EffectType == "redirect_30pct" && len(dEffect) > 0 && dEffect[len(dEffect)-4:] == "back" {
								// Redirect succeeded — swap back
								newFlagHolder = oldFlagHolder
								bs.logEntry("redirect", oldFlagHolder, nil, bs.FlagPower, "Flag redirected!",
									newFlagHolder, "Redirect successful")
							}
						}
					}
				}
			}

			// Update flag
			bs.FlagHolder = newFlagHolder
			bs.FlagPower = challengerPower

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
					Log: bs.Log, FansGained: 2,
				}
			}

			// Check if only the new challenger's deck is empty
			if bs.FlagHolder == "player" && len(bs.CPUDeck) == 0 {
				bs.logEntry("game_end", "player", nil, bs.FlagPower, "CPU deck empty",
					bs.FlagHolder, "Player wins — CPU has no cards to challenge")
				return models.BattleResult{
					Winner: "player", Loser: "cpu",
					Reason: "CPU ran out of cards",
					Log: bs.Log, FansGained: 2,
				}
			}
			if bs.FlagHolder == "cpu" && len(bs.PlayerDeck) == 0 {
				bs.logEntry("game_end", "cpu", nil, bs.FlagPower, "Player deck empty",
					bs.FlagHolder, "CPU wins — Player has no cards to challenge")
				return models.BattleResult{
					Winner: "cpu", Loser: "player",
					Reason: "Player ran out of cards",
					Log: bs.Log, FansGained: 2,
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
				Log: bs.Log, FansGained: 1,
			}
		}
	}
}

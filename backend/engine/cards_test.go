package engine

import (
	"backend/models"
	"regexp"
	"testing"
)

// TestAllCards_Basic verifies the basic properties of AllCards.
func TestAllCards_Basic(t *testing.T) {
	cards := AllCards()
	if len(cards) != 71 {
		t.Errorf("AllCards() returned %d cards, want 71", len(cards))
	}

	attrSeen := make(map[string]bool)
	for _, c := range cards {
		attrSeen[c.Attribute] = true

		if c.ID == "" {
			t.Errorf("card has empty ID")
		}
		if c.Name == "" {
			t.Errorf("card %s has empty Name", c.ID)
		}
		if c.Power == 0 {
			t.Errorf("card %s has zero Power", c.ID)
		}
		if c.Rarity == "" {
			t.Errorf("card %s has empty Rarity", c.ID)
		}
		if c.EffectType == "" {
			t.Errorf("card %s has empty EffectType", c.ID)
		}
		if c.Deck == "" {
			t.Errorf("card %s has empty Deck", c.ID)
		}
		if c.Quantity == 0 {
			t.Errorf("card %s has zero Quantity", c.ID)
		}
	}

	requiredAttrs := []string{"Mainframe", "Sector", "Orbit", "HoloMedia", "DeepWeb", "Daemon", "Matrix"}
	for _, attr := range requiredAttrs {
		if !attrSeen[attr] {
			t.Errorf("attribute %s not found in any card", attr)
		}
	}
}

// TestStarterDeck verifies the properties of the starter deck.
func TestStarterDeck(t *testing.T) {
	deck := StarterDeck()
	if len(deck) != 6 {
		t.Errorf("StarterDeck() returned %d cards, want 6", len(deck))
	}
	for _, c := range deck {
		if c.Deck != "Starter" {
			t.Errorf("starter card %s has Deck=%q, want Starter", c.ID, c.Deck)
		}
		if c.Attribute != "None" {
			t.Errorf("starter card %s has Attribute=%q, want None", c.ID, c.Attribute)
		}
		if c.Quantity != 0 {
			t.Errorf("starter card %s has Quantity=%d, want 0", c.ID, c.Quantity)
		}
	}
}

// TestGenerateDeckPools_Count verifies that the total cards in the three pools
// match the sum of Quantities from AllCards.
func TestGenerateDeckPools_Count(t *testing.T) {
	a, b, c := GenerateDeckPools()
	total := len(a) + len(b) + len(c)

	sumQty := 0
	for _, card := range AllCards() {
		sumQty += card.Quantity
	}
	if total != sumQty {
		t.Errorf("total pool cards = %d, want %d", total, sumQty)
	}
}

// TestGenerateDeckPools_IDs verifies that pool card IDs follow
// the expected "<baseID>_<index>" format.
func TestGenerateDeckPools_IDs(t *testing.T) {
	a, b, c := GenerateDeckPools()
	re := regexp.MustCompile(`^[a-z0-9_]+_\d+$`)
	for _, pool := range [][]models.Card{a, b, c} {
		for _, card := range pool {
			if !re.MatchString(card.ID) {
				t.Errorf("unexpected ID format: %s", card.ID)
			}
		}
	}
}

// TestCardsByAttribute verifies CardsByAttribute returns correct cards and clones.
func TestCardsByAttribute(t *testing.T) {
	allCards := AllCards()

	// Store pointers to the original cards for clone detection.
	origPtrs := make(map[string]*models.Card, len(allCards))
	for i := range allCards {
		origPtrs[allCards[i].ID] = &allCards[i]
	}

	// Existing attribute: "Mainframe"
	result := CardsByAttribute("Mainframe")
	if len(result) == 0 {
		t.Fatal("CardsByAttribute(Mainframe) returned empty slice")
	}
	for i := range result {
		c := &result[i]
		if c.Attribute != "Mainframe" {
			t.Errorf("card %s has attribute %q, want Mainframe", c.ID, c.Attribute)
		}
		// Ensure it is a clone (different pointer)
		if origPtr, ok := origPtrs[c.ID]; ok {
			if origPtr == c {
				t.Errorf("card %s is not a clone (same pointer as AllCards)", c.ID)
			}
		}
	}

	// Non‑existing attribute: "Virus"
	empty := CardsByAttribute("Virus")
	if len(empty) != 0 {
		t.Errorf("CardsByAttribute(Virus) returned %d cards, want 0", len(empty))
	}
}

// TestCardsByArchetype verifies that CardsByArchetype returns an empty slice
// because the Archetype field is never set in AllCards.
func TestCardsByArchetype(t *testing.T) {
	res := CardsByArchetype("Mainframe")
	if len(res) != 0 {
		t.Errorf("CardsByArchetype(Mainframe) returned %d cards, want 0", len(res))
	}

	// Verify Archetype is empty for every card
	for _, c := range AllCards() {
		if c.Archetype != "" {
			t.Errorf("card %s has Archetype %q, want empty", c.ID, c.Archetype)
		}
	}

	// Calling with "" returns all cards (since all match)
	res = CardsByArchetype("")
	if len(res) != len(AllCards()) {
		t.Errorf("CardsByArchetype('') returned %d cards, want %d", len(res), len(AllCards()))
	}
}

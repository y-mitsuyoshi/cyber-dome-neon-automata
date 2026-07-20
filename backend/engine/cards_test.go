package engine

import (
	"strings"
	"testing"
)

func TestCardDefinitions(t *testing.T) {
	cards := AllCards()

	// Build a map for easy lookup
	byID := make(map[string]struct {
		power    int
		quantity int
		effect   string
	})
	for _, c := range cards {
		byID[c.ID] = struct {
			power    int
			quantity int
			effect   string
		}{c.Power, c.Quantity, c.Effect}
	}

	tests := []struct {
		name     string
		id       string
		power    int
		quantity int
		effect   string
	}{
		{
			name:     "c_villain power is 9 (ADR-9: not a strict upgrade over c_dragon)",
			id:       "c_villain",
			power:    9,
			quantity: 4,
		},
		{
			name:     "a_skeleton quantity is 4 (ADR-9: standard A-tier common pool)",
			id:       "a_skeleton",
			quantity: 4,
		},
		{
			name:     "b_mime effect text contains +2 (ADR-8: multiplier changed from x3 to x2)",
			id:       "b_mime",
			power:    2,
			quantity: 4,
			effect:   "+2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			card, ok := byID[tt.id]
			if !ok {
				t.Fatalf("card %q not found in AllCards()", tt.id)
			}
			if tt.power > 0 && card.power != tt.power {
				t.Errorf("card %s: expected Power %d, got %d", tt.id, tt.power, card.power)
			}
			if tt.quantity > 0 && card.quantity != tt.quantity {
				t.Errorf("card %s: expected Quantity %d, got %d", tt.id, tt.quantity, card.quantity)
			}
			if tt.effect != "" && !strings.Contains(card.effect, tt.effect) {
				t.Errorf("card %s: expected effect to contain %q, got %q", tt.id, tt.effect, card.effect)
			}
		})
	}
}

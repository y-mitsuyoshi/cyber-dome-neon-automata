package engine

import (
	"backend/models"
	"testing"
)

func TestUniqueSlotCount(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "Test1",
			Cards: []models.Card{
				{EffectType: "none"},
			},
			Count: 1,
		},
		{
			CardName: "Test2",
			Cards: []models.Card{
				{EffectType: "reduce_memory_count"},
			},
			Count: 1,
		},
	}
	
	// Should be 2 slots - 1 reduction = 1
	count := uniqueSlotCount(mem)
	if count != 1 {
		t.Errorf("Expected 1, got %d", count)
	}
}

func TestBenchPowerBonus(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "Test1",
			Cards: []models.Card{
				{EffectType: "bench_power_plus_1"},
				{EffectType: "bench_power_plus_1"},
			},
			Count: 2,
		},
		{
			CardName: "Test2",
			Cards: []models.Card{
				{EffectType: "none"},
			},
			Count: 1,
		},
	}
	
	// Should be 2 bonus power
	bonus := benchPowerBonus(mem)
	if bonus != 2 {
		t.Errorf("Expected 2, got %d", bonus)
	}
}

func TestCountAIInMemory(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "AI Card",
			Cards: []models.Card{
				{Attribute: "AI"},
				{Attribute: "AI"},
			},
			Count: 2,
		},
		{
			CardName: "Virus Card",
			Cards: []models.Card{
				{Attribute: "Virus"},
			},
			Count: 1,
		},
	}
	
	count := countAIInMemory(mem)
	if count != 2 {
		t.Errorf("Expected 2, got %d", count)
	}
}

func TestRunBattle(t *testing.T) {
	playerDeck := []models.Card{
		{Name: "Card1", Power: 10, Attribute: "Hardware"},
		{Name: "Card2", Power: 5, Attribute: "AI"},
	}
	cpuDeck := []models.Card{
		{Name: "Card3", Power: 2, Attribute: "Virus"},
		{Name: "Card4", Power: 2, Attribute: "Virus"},
	}
	
	// Player card is much stronger (10 vs 2,2). Player should win.
	result := RunBattle(playerDeck, cpuDeck)
	
	if result.Winner != "player" {
		t.Errorf("Expected player to win, got %s", result.Winner)
	}
}

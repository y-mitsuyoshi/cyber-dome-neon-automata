package engine

import "backend/models"

// AllCards returns the full card pool of 24 unique cards.
func AllCards() []models.Card {
	return []models.Card{
		// === Virus / Aggro ===
		{
			ID: "virus_001", Name: "Glitch Worm", Attribute: "Virus", Archetype: "Aggro",
			Power: 4, Rarity: "Common",
			Effect: "On reveal: Enemy top card power -2", EffectType: "power_minus_2",
		},
		{
			ID: "virus_002", Name: "Data Leech", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Rare",
			Effect: "On win: Delete 1 card from enemy source code", EffectType: "delete_enemy_card",
		},
		{
			ID: "virus_003", Name: "Trojan Spike", Attribute: "Virus", Archetype: "Aggro",
			Power: 6, Rarity: "Epic",
			Effect: "On reveal: Enemy loses next card effect", EffectType: "nullify_next_effect",
		},
		{
			ID: "virus_004", Name: "Worm Cluster", Attribute: "Virus", Archetype: "Aggro",
			Power: 5, Rarity: "Rare",
			Effect: "On reveal: Enemy top card power -2", EffectType: "power_minus_2",
		},
		{
			ID: "virus_005", Name: "Byte Shredder", Attribute: "Virus", Archetype: "Aggro",
			Power: 7, Rarity: "Epic",
			Effect: "On win: Delete 1 card from enemy source code", EffectType: "delete_enemy_card",
		},
		{
			ID: "virus_006", Name: "Plague Packet", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Common",
			Effect: "On reveal: Enemy loses next card effect", EffectType: "nullify_next_effect",
		},

		// === AI / Combo ===
		{
			ID: "ai_001", Name: "Neural Stack", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Common",
			Effect: "Power +2 for each AI in your memory slots", EffectType: "power_per_ai_in_memory",
		},
		{
			ID: "ai_002", Name: "Deep Learning", Attribute: "AI", Archetype: "Combo",
			Power: 2, Rarity: "Rare",
			Effect: "Power doubles if same-name card in memory", EffectType: "double_if_same_name",
		},
		{
			ID: "ai_003", Name: "Synapse Cluster", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Common",
			Effect: "Power +3 if previous card was AI attribute", EffectType: "power_if_prev_ai",
		},
		{
			ID: "ai_004", Name: "Recursive Mind", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Rare",
			Effect: "Power doubles if same-name card in memory", EffectType: "double_if_same_name",
		},
		{
			ID: "ai_005", Name: "Tensor Core", Attribute: "AI", Archetype: "Combo",
			Power: 5, Rarity: "Epic",
			Effect: "Power +2 for each AI in your memory slots", EffectType: "power_per_ai_in_memory",
		},
		{
			ID: "ai_006", Name: "Logic Gate", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Common",
			Effect: "Power +3 if previous card was AI attribute", EffectType: "power_if_prev_ai",
		},

		// === Hardware / Control ===
		{
			ID: "hw_001", Name: "Firewall Prime", Attribute: "Hardware", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "20% chance to not consume memory slot", EffectType: "ram_save_20pct",
		},
		{
			ID: "hw_002", Name: "ICE Barrier", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "On defend: Lock enemy's highest power card for 1 turn", EffectType: "lock_enemy_highest",
		},
		{
			ID: "hw_003", Name: "RAM Optimizer", Attribute: "Hardware", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "Reduce memory slot count by 1 when benched", EffectType: "reduce_memory_count",
		},
		{
			ID: "hw_004", Name: "Quantum Core", Attribute: "Hardware", Archetype: "Control",
			Power: 6, Rarity: "Epic",
			Effect: "20% chance to not consume memory slot", EffectType: "ram_save_20pct",
		},
		{
			ID: "hw_005", Name: "Silicon Shield", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Rare",
			Effect: "Reduce memory slot count by 1 when benched", EffectType: "reduce_memory_count",
		},
		{
			ID: "hw_006", Name: "Flux Capacitor", Attribute: "Hardware", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "On defend: Lock enemy's highest power card for 1 turn", EffectType: "lock_enemy_highest",
		},

		// === Netrunner / Control ===
		{
			ID: "nr_001", Name: "Ghost Runner", Attribute: "Netrunner", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "On reveal: Peek at enemy's next card", EffectType: "peek_enemy",
		},
		{
			ID: "nr_002", Name: "Cipher Agent", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "On defend: 30% chance to redirect attack", EffectType: "redirect_30pct",
		},
		{
			ID: "nr_003", Name: "Proxy Shield", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "On bench: All your cards get +1 power", EffectType: "bench_power_plus_1",
		},
		{
			ID: "nr_004", Name: "Neon Phantom", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Epic",
			Effect: "On reveal: Peek at enemy's next card", EffectType: "peek_enemy",
		},
		{
			ID: "nr_005", Name: "Shadow Broker", Attribute: "Netrunner", Archetype: "Control",
			Power: 4, Rarity: "Rare",
			Effect: "On defend: 30% chance to redirect attack", EffectType: "redirect_30pct",
		},
		{
			ID: "nr_006", Name: "Data Veil", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "On bench: All your cards get +1 power", EffectType: "bench_power_plus_1",
		},
	}
}

// CardsByAttribute filters cards by attribute.
func CardsByAttribute(attr string) []models.Card {
	var result []models.Card
	for _, c := range AllCards() {
		if c.Attribute == attr {
			result = append(result, c)
		}
	}
	return result
}

// CardsByArchetype filters cards by archetype.
func CardsByArchetype(arch string) []models.Card {
	var result []models.Card
	for _, c := range AllCards() {
		if c.Archetype == arch {
			result = append(result, c)
		}
	}
	return result
}

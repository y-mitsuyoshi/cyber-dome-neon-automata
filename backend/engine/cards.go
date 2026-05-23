package engine

import "backend/models"

// AllCards returns the full card pool of 80 unique cards (20 per Attribute).
func AllCards() []models.Card {
	return []models.Card{
		// === 🔴 Virus / Aggro (20 Cards) ===
		{
			ID: "virus_001", Name: "Glitch Worm", Attribute: "Virus", Archetype: "Aggro",
			Power: 4, Rarity: "Common",
			Effect: "On reveal: Enemy top card power -2", EffectType: "power_minus_2", Cost: 2,
		},
		{
			ID: "virus_002", Name: "Data Leech", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Rare",
			Effect: "On win: Delete 1 card from enemy source code", EffectType: "delete_enemy_card", Cost: 4,
		},
		{
			ID: "virus_003", Name: "Trojan Spike", Attribute: "Virus", Archetype: "Aggro",
			Power: 6, Rarity: "Epic",
			Effect: "On reveal: Enemy loses next card effect", EffectType: "nullify_next_effect", Cost: 7,
		},
		{
			ID: "virus_004", Name: "Worm Cluster", Attribute: "Virus", Archetype: "Aggro",
			Power: 5, Rarity: "Rare",
			Effect: "On reveal: Enemy top card power -2", EffectType: "power_minus_2", Cost: 4,
		},
		{
			ID: "virus_005", Name: "Byte Shredder", Attribute: "Virus", Archetype: "Aggro",
			Power: 7, Rarity: "Epic",
			Effect: "On win: Delete 1 card from enemy source code", EffectType: "delete_enemy_card", Cost: 7,
		},
		{
			ID: "virus_006", Name: "Plague Packet", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Common",
			Effect: "On reveal: Enemy loses next card effect", EffectType: "nullify_next_effect", Cost: 2,
		},
		{
			ID: "virus_007", Name: "Overclock Glitch", Attribute: "Virus", Archetype: "Aggro",
			Power: 2, Rarity: "Common",
			Effect: "On reveal: Delete 1 card from own deck to gain +5 power", EffectType: "self_delete_on_reveal", Cost: 2,
		},
		{
			ID: "virus_008", Name: "Memory Bleed", Attribute: "Virus", Archetype: "Aggro",
			Power: 4, Rarity: "Rare",
			Effect: "On reveal: Enemy top card power -3", EffectType: "power_minus_3", Cost: 4,
		},
		{
			ID: "virus_009", Name: "Ransomware Pro", Attribute: "Virus", Archetype: "Aggro",
			Power: 8, Rarity: "Epic",
			Effect: "On reveal: Enemy top card power -4", EffectType: "power_minus_4", Cost: 7,
		},
		{
			ID: "virus_010", Name: "Buffer Overflow", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Common",
			Effect: "Power +2 for each Virus in your memory slots", EffectType: "power_per_virus_in_memory", Cost: 2,
		},
		{
			ID: "virus_011", Name: "Fork Bomb", Attribute: "Virus", Archetype: "Aggro",
			Power: 5, Rarity: "Rare",
			Effect: "Power +2 for each Virus in your memory slots", EffectType: "power_per_virus_in_memory", Cost: 4,
		},
		{
			ID: "virus_012", Name: "Logic Bomb", Attribute: "Virus", Archetype: "Aggro",
			Power: 8, Rarity: "Epic",
			Effect: "Power +2 for each Virus in your memory slots", EffectType: "power_per_virus_in_memory", Cost: 7,
		},
		{
			ID: "virus_013", Name: "Zero Day Spike", Attribute: "Virus", Archetype: "Aggro",
			Power: 9, Rarity: "Epic",
			Effect: "On win: Delete 2 cards from enemy source code", EffectType: "delete_enemy_card_x2", Cost: 7,
		},
		{
			ID: "virus_014", Name: "Spam Torrent", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Common",
			Effect: "Power +3 if previous card was Virus attribute", EffectType: "power_if_prev_virus", Cost: 2,
		},
		{
			ID: "virus_015", Name: "Spyware Vector", Attribute: "Virus", Archetype: "Aggro",
			Power: 5, Rarity: "Rare",
			Effect: "Power +3 if previous card was Virus attribute", EffectType: "power_if_prev_virus", Cost: 4,
		},
		{
			ID: "virus_016", Name: "Rootkit Kernel", Attribute: "Virus", Archetype: "Aggro",
			Power: 4, Rarity: "Rare",
			Effect: "On reveal: Delete 1 card from own deck to gain +5 power", EffectType: "self_delete_on_reveal", Cost: 4,
		},
		{
			ID: "virus_017", Name: "Adware Pop", Attribute: "Virus", Archetype: "Aggro",
			Power: 4, Rarity: "Common",
			Effect: "Power +1 for each card slot occupied in your memory", EffectType: "power_per_card_in_memory", Cost: 2,
		},
		{
			ID: "virus_018", Name: "Phishing Bait", Attribute: "Virus", Archetype: "Aggro",
			Power: 3, Rarity: "Common",
			Effect: "On reveal: Peek at enemy next card", EffectType: "peek_enemy", Cost: 2,
		},
		{
			ID: "virus_019", Name: "Shellcode Injector", Attribute: "Virus", Archetype: "Aggro",
			Power: 6, Rarity: "Rare",
			Effect: "On reveal: Peek at enemy next card", EffectType: "peek_enemy", Cost: 4,
		},
		{
			ID: "virus_020", Name: "Malware Engine", Attribute: "Virus", Archetype: "Aggro",
			Power: 10, Rarity: "Epic",
			Effect: "Pure high-power offensive program", EffectType: "none", Cost: 7,
		},

		// === 🔵 AI / Combo (20 Cards) ===
		{
			ID: "ai_001", Name: "Neural Stack", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Common",
			Effect: "Power +2 for each AI in your memory slots", EffectType: "power_per_ai_in_memory", Cost: 2,
		},
		{
			ID: "ai_002", Name: "Deep Learning", Attribute: "AI", Archetype: "Combo",
			Power: 2, Rarity: "Rare",
			Effect: "Power doubles if same-name card in memory", EffectType: "double_if_same_name", Cost: 4,
		},
		{
			ID: "ai_003", Name: "Synapse Cluster", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Common",
			Effect: "Power +3 if previous card was AI attribute", EffectType: "power_if_prev_ai", Cost: 2,
		},
		{
			ID: "ai_004", Name: "Recursive Mind", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Rare",
			Effect: "Power doubles if same-name card in memory", EffectType: "double_if_same_name", Cost: 4,
		},
		{
			ID: "ai_005", Name: "Tensor Core", Attribute: "AI", Archetype: "Combo",
			Power: 5, Rarity: "Epic",
			Effect: "Power +2 for each AI in your memory slots", EffectType: "power_per_ai_in_memory", Cost: 7,
		},
		{
			ID: "ai_006", Name: "Logic Gate", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Common",
			Effect: "Power +3 if previous card was AI attribute", EffectType: "power_if_prev_ai", Cost: 2,
		},
		{
			ID: "ai_007", Name: "Heuristic Solver", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Common",
			Effect: "Power doubles if same-name card in memory", EffectType: "double_if_same_name", Cost: 2,
		},
		{
			ID: "ai_008", Name: "Quantum Neural", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Epic",
			Effect: "Power doubles if same-name card in memory", EffectType: "double_if_same_name", Cost: 7,
		},
		{
			ID: "ai_009", Name: "Sigmoid Node", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Common",
			Effect: "Power +3 if previous card was AI attribute", EffectType: "power_if_prev_ai", Cost: 2,
		},
		{
			ID: "ai_010", Name: "Gradient Descent", Attribute: "AI", Archetype: "Combo",
			Power: 5, Rarity: "Rare",
			Effect: "Power +3 if previous card was AI attribute", EffectType: "power_if_prev_ai", Cost: 4,
		},
		{
			ID: "ai_011", Name: "Backprop Agent", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Rare",
			Effect: "Power +2 for each AI in your memory slots", EffectType: "power_per_ai_in_memory", Cost: 4,
		},
		{
			ID: "ai_012", Name: "GPT Agent v1", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Common",
			Effect: "Power +1 for each card slot occupied in your memory", EffectType: "power_per_card_in_memory", Cost: 2,
		},
		{
			ID: "ai_013", Name: "GPT Agent v2", Attribute: "AI", Archetype: "Combo",
			Power: 5, Rarity: "Rare",
			Effect: "Power +1 for each card slot occupied in your memory", EffectType: "power_per_card_in_memory", Cost: 4,
		},
		{
			ID: "ai_014", Name: "AGI Mainframe", Attribute: "AI", Archetype: "Combo",
			Power: 7, Rarity: "Epic",
			Effect: "Power +2 for each card slot occupied in your memory", EffectType: "power_per_card_in_memory_x2", Cost: 7,
		},
		{
			ID: "ai_015", Name: "Pattern Recognizer", Attribute: "AI", Archetype: "Combo",
			Power: 3, Rarity: "Common",
			Effect: "Power +4 if enemy flag holder is AI", EffectType: "power_vs_ai", Cost: 2,
		},
		{
			ID: "ai_016", Name: "Botnet Controller", Attribute: "AI", Archetype: "Combo",
			Power: 6, Rarity: "Rare",
			Effect: "Power +4 if enemy flag holder is Virus", EffectType: "power_vs_virus", Cost: 4,
		},
		{
			ID: "ai_017", Name: "Machine Vision", Attribute: "AI", Archetype: "Combo",
			Power: 5, Rarity: "Rare",
			Effect: "Power +4 if enemy flag holder is Netrunner", EffectType: "power_vs_netrunner", Cost: 4,
		},
		{
			ID: "ai_018", Name: "Reinforcement Learner", Attribute: "AI", Archetype: "Combo",
			Power: 6, Rarity: "Epic",
			Effect: "Power +3 if your remaining deck is smaller than enemy's", EffectType: "power_if_deck_smaller", Cost: 7,
		},
		{
			ID: "ai_019", Name: "Supervised Net", Attribute: "AI", Archetype: "Combo",
			Power: 4, Rarity: "Common",
			Effect: "On reveal: Peek at enemy next card", EffectType: "peek_enemy", Cost: 2,
		},
		{
			ID: "ai_020", Name: "Singularity Core", Attribute: "AI", Archetype: "Combo",
			Power: 10, Rarity: "Epic",
			Effect: "Massive neural database", EffectType: "none", Cost: 7,
		},

		// === 🟡 Hardware / Control (20 Cards) ===
		{
			ID: "hw_001", Name: "Firewall Prime", Attribute: "Hardware", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "20% chance to not consume memory slot", EffectType: "ram_save_20pct", Cost: 4,
		},
		{
			ID: "hw_002", Name: "ICE Barrier", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "On defend: Lock enemy's highest power card for 1 turn", EffectType: "lock_enemy_highest", Cost: 2,
		},
		{
			ID: "hw_003", Name: "RAM Optimizer", Attribute: "Hardware", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "Reduce memory slot count by 1 when benched", EffectType: "reduce_memory_count", Cost: 2,
		},
		{
			ID: "hw_004", Name: "Quantum Core", Attribute: "Hardware", Archetype: "Control",
			Power: 6, Rarity: "Epic",
			Effect: "20% chance to not consume memory slot", EffectType: "ram_save_20pct", Cost: 7,
		},
		{
			ID: "hw_005", Name: "Silicon Shield", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Rare",
			Effect: "Reduce memory slot count by 1 when benched", EffectType: "reduce_memory_count", Cost: 4,
		},
		{
			ID: "hw_006", Name: "Flux Capacitor", Attribute: "Hardware", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "On defend: Lock enemy's highest power card for 1 turn", EffectType: "lock_enemy_highest", Cost: 4,
		},
		{
			ID: "hw_007", Name: "RAM Expander", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "50% chance to not consume memory slot", EffectType: "ram_save_50pct", Cost: 2,
		},
		{
			ID: "hw_008", Name: "Solid State Drive", Attribute: "Hardware", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "50% chance to not consume memory slot", EffectType: "ram_save_50pct", Cost: 4,
		},
		{
			ID: "hw_009", Name: "Virtual Memory", Attribute: "Hardware", Archetype: "Control",
			Power: 6, Rarity: "Epic",
			Effect: "Never consumes a new slot in memory", EffectType: "ram_save_100pct", Cost: 7,
		},
		{
			ID: "hw_010", Name: "Liquid Cooler", Attribute: "Hardware", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "Power +2 for each Hardware in your memory slots", EffectType: "power_per_hardware_in_memory", Cost: 2,
		},
		{
			ID: "hw_011", Name: "Copper Heatpipe", Attribute: "Hardware", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "Power +2 for each Hardware in your memory slots", EffectType: "power_per_hardware_in_memory", Cost: 4,
		},
		{
			ID: "hw_012", Name: "Graphene Heatsink", Attribute: "Hardware", Archetype: "Control",
			Power: 8, Rarity: "Epic",
			Effect: "Power +2 for each Hardware in your memory slots", EffectType: "power_per_hardware_in_memory", Cost: 7,
		},
		{
			ID: "hw_013", Name: "Grid Stabilizer", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "Power +3 if previous card was Hardware", EffectType: "power_if_prev_hw", Cost: 2,
		},
		{
			ID: "hw_014", Name: "Motherboard Node", Attribute: "Hardware", Archetype: "Control",
			Power: 6, Rarity: "Rare",
			Effect: "Power +3 if previous card was Hardware", EffectType: "power_if_prev_hw", Cost: 4,
		},
		{
			ID: "hw_015", Name: "Faraday Cage", Attribute: "Hardware", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "Power +4 if enemy flag holder is Hardware", EffectType: "power_vs_hw", Cost: 2,
		},
		{
			ID: "hw_016", Name: "Decoy Server", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Rare",
			Effect: "On defend: Lock enemy's lowest power card for 1 turn", EffectType: "lock_enemy_lowest", Cost: 4,
		},
		{
			ID: "hw_017", Name: "Honey Pot", Attribute: "Hardware", Archetype: "Control",
			Power: 6, Rarity: "Epic",
			Effect: "On defend: Lock enemy's highest power card for 2 turns", EffectType: "lock_enemy_highest_x2", Cost: 7,
		},
		{
			ID: "hw_018", Name: "Backup Generator", Attribute: "Hardware", Archetype: "Control",
			Power: 7, Rarity: "Epic",
			Effect: "Power +3 if your remaining deck is larger than enemy's", EffectType: "power_if_deck_larger", Cost: 7,
		},
		{
			ID: "hw_019", Name: "Static Guard", Attribute: "Hardware", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "Power +1 for each card slot occupied in your memory", EffectType: "power_per_card_in_memory", Cost: 2,
		},
		{
			ID: "hw_020", Name: "Mainframe Chassis", Attribute: "Hardware", Archetype: "Control",
			Power: 10, Rarity: "Epic",
			Effect: "Heavy duty physical defense shell", EffectType: "none", Cost: 7,
		},

		// === 🟢 Netrunner / Control (20 Cards) ===
		{
			ID: "nr_001", Name: "Ghost Runner", Attribute: "Netrunner", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "On reveal: Peek at enemy next card", EffectType: "peek_enemy", Cost: 2,
		},
		{
			ID: "nr_002", Name: "Cipher Agent", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "On defend: 30% chance to redirect attack", EffectType: "redirect_30pct", Cost: 4,
		},
		{
			ID: "nr_003", Name: "Proxy Shield", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "On bench: All your cards get +1 power", EffectType: "bench_power_plus_1", Cost: 2,
		},
		{
			ID: "nr_004", Name: "Neon Phantom", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Epic",
			Effect: "On reveal: Peek at enemy next card", EffectType: "peek_enemy", Cost: 7,
		},
		{
			ID: "nr_005", Name: "Shadow Broker", Attribute: "Netrunner", Archetype: "Control",
			Power: 4, Rarity: "Rare",
			Effect: "On defend: 30% chance to redirect attack", EffectType: "redirect_30pct", Cost: 4,
		},
		{
			ID: "nr_006", Name: "Data Veil", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "On bench: All your cards get +1 power", EffectType: "bench_power_plus_1", Cost: 2,
		},
		{
			ID: "nr_007", Name: "Redirect Gateway", Attribute: "Netrunner", Archetype: "Control",
			Power: 6, Rarity: "Epic",
			Effect: "On defend: 50% chance to redirect attack", EffectType: "redirect_50pct", Cost: 7,
		},
		{
			ID: "nr_008", Name: "Encrypted Node", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "Power +2 for each Netrunner in your memory slots", EffectType: "power_per_netrunner_in_memory", Cost: 2,
		},
		{
			ID: "nr_009", Name: "Dark Web Proxy", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "Power +2 for each Netrunner in your memory slots", EffectType: "power_per_netrunner_in_memory", Cost: 4,
		},
		{
			ID: "nr_010", Name: "Mainframe Jack", Attribute: "Netrunner", Archetype: "Control",
			Power: 8, Rarity: "Epic",
			Effect: "Power +2 for each Netrunner in your memory slots", EffectType: "power_per_netrunner_in_memory", Cost: 7,
		},
		{
			ID: "nr_011", Name: "Grid Walk", Attribute: "Netrunner", Archetype: "Control",
			Power: 4, Rarity: "Common",
			Effect: "Power +3 if previous card was Netrunner attribute", EffectType: "power_if_prev_nr", Cost: 2,
		},
		{
			ID: "nr_012", Name: "Subnet Hacker", Attribute: "Netrunner", Archetype: "Control",
			Power: 6, Rarity: "Rare",
			Effect: "Power +3 if previous card was Netrunner attribute", EffectType: "power_if_prev_nr", Cost: 4,
		},
		{
			ID: "nr_013", Name: "Signal Booster", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "On bench: All your cards get +1 power", EffectType: "bench_power_plus_1", Cost: 4,
		},
		{
			ID: "nr_014", Name: "Data Broker", Attribute: "Netrunner", Archetype: "Control",
			Power: 7, Rarity: "Epic",
			Effect: "On bench: All your cards get +2 power", EffectType: "bench_power_plus_2", Cost: 7,
		},
		{
			ID: "nr_015", Name: "Deck Recycler", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "When benched, appends a clone of itself to owner's deck", EffectType: "draw_extra_card", Cost: 2,
		},
		{
			ID: "nr_016", Name: "Memory Leaker", Attribute: "Netrunner", Archetype: "Control",
			Power: 4, Rarity: "Rare",
			Effect: "When benched, appends a clone of itself to owner's deck", EffectType: "draw_extra_card", Cost: 4,
		},
		{
			ID: "nr_017", Name: "Defragmenter", Attribute: "Netrunner", Archetype: "Control",
			Power: 6, Rarity: "Epic",
			Effect: "When benched, appends a clone of itself to owner's deck", EffectType: "draw_extra_card", Cost: 7,
		},
		{
			ID: "nr_018", Name: "Intruder Agent", Attribute: "Netrunner", Archetype: "Control",
			Power: 3, Rarity: "Common",
			Effect: "Power +4 if enemy flag holder is Netrunner", EffectType: "power_vs_nr", Cost: 2,
		},
		{
			ID: "nr_019", Name: "Trace Buster", Attribute: "Netrunner", Archetype: "Control",
			Power: 5, Rarity: "Rare",
			Effect: "Power +4 if enemy flag holder is Hardware", EffectType: "power_vs_hw", Cost: 4,
		},
		{
			ID: "nr_020", Name: "Elite Operative", Attribute: "Netrunner", Archetype: "Control",
			Power: 10, Rarity: "Epic",
			Effect: "Master hacker and net operator", EffectType: "none", Cost: 7,
		},
	}
}

// CardsByAttribute filters cards by attribute.
func CardsByAttribute(attr string) []models.Card {
	var result []models.Card
	for _, c := range AllCards() {
		if c.Attribute == attr {
			result = append(result, c.Clone())
		}
	}
	return result
}

// CardsByArchetype filters cards by archetype.
func CardsByArchetype(arch string) []models.Card {
	var result []models.Card
	for _, c := range AllCards() {
		if c.Archetype == arch {
			result = append(result, c.Clone())
		}
	}
	return result
}

// StarterDeck returns the symmetrical 10-card starting deck for all players.
func StarterDeck() []models.Card {
	return []models.Card{
		{ID: "starter_virus_1", Name: "Glitch Worm Jr.", Attribute: "Virus", Archetype: "Aggro", Power: 3, Rarity: "Common", Effect: "Simple offensive code", EffectType: "none", Cost: 2},
		{ID: "starter_virus_2", Name: "Buffer Overflow Jr.", Attribute: "Virus", Archetype: "Aggro", Power: 4, Rarity: "Common", Effect: "Simple offensive code", EffectType: "none", Cost: 2},
		{ID: "starter_ai_1", Name: "Linear Regressor", Attribute: "AI", Archetype: "Combo", Power: 3, Rarity: "Common", Effect: "Simple learning model", EffectType: "none", Cost: 2},
		{ID: "starter_ai_2", Name: "Heuristic Helper", Attribute: "AI", Archetype: "Combo", Power: 4, Rarity: "Common", Effect: "Simple learning model", EffectType: "none", Cost: 2},
		{ID: "starter_hw_1", Name: "Copper Busbar", Attribute: "Hardware", Archetype: "Control", Power: 3, Rarity: "Common", Effect: "Simple thermal conductor", EffectType: "none", Cost: 2},
		{ID: "starter_hw_2", Name: "Standard Shield", Attribute: "Hardware", Archetype: "Control", Power: 4, Rarity: "Common", Effect: "Simple physical shield", EffectType: "none", Cost: 2},
		{ID: "starter_nr_1", Name: "Grid Rookie", Attribute: "Netrunner", Archetype: "Control", Power: 3, Rarity: "Common", Effect: "Simple network trace", EffectType: "none", Cost: 2},
		{ID: "starter_nr_2", Name: "Proxy Node", Attribute: "Netrunner", Archetype: "Control", Power: 4, Rarity: "Common", Effect: "Simple routing hop", EffectType: "none", Cost: 2},
		{ID: "starter_net_1", Name: "Data Pipeline", Attribute: "Netrunner", Archetype: "Control", Power: 5, Rarity: "Common", Effect: "Simple transmission pipeline", EffectType: "none", Cost: 2},
		{ID: "starter_ai_3", Name: "Logic Node", Attribute: "AI", Archetype: "Combo", Power: 5, Rarity: "Common", Effect: "Simple decision tree", EffectType: "none", Cost: 2},
	}
}

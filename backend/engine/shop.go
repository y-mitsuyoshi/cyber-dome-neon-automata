package engine

// ProcessNPCTurn processes the NPC's turn in the shop.
// It returns the action and optional card index.
func ProcessNPCTurn(state NPCSessionState) (action string, cardIndex *int) {
	return GetNPCAction(state)
}

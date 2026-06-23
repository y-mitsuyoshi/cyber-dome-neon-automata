package engine

import "backend/brainclient"

// Game represents a battle game.
type Game struct {
	ID    string
	State interface{}
}

// brainClient is the global decision client for NPC decisions.
var brainClient brainclient.DecisionClient

// Initialize sets the global brain client.
func Initialize(client brainclient.DecisionClient) {
	brainClient = client
}

// GetBrainClient returns the current brain client.
func GetBrainClient() brainclient.DecisionClient {
	return brainClient
}

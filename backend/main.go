package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"backend/brainclient"
	"backend/engine"
	"backend/handlers"
)

func main() {
	// Initialize brain client if enabled
	brainEnabled, _ := strconv.ParseBool(getEnv("BRAIN_ENABLED", "true"))
	brainServerURL := getEnv("BRAIN_SERVER_URL", "")
	brainAPIKey := getEnv("BRAIN_API_KEY", "")
	timeoutStr := getEnv("BRAIN_TIMEOUT", "2s")
	timeout, err := time.ParseDuration(timeoutStr)
	if err != nil {
		timeout = 2 * time.Second
	}

	var decisionClient brainclient.DecisionClient
	if brainEnabled && brainServerURL != "" {
		decisionClient = brainclient.NewBrainClient(brainServerURL, brainAPIKey, timeout)
		log.Printf("Brain client initialized: endpoint=%s", brainServerURL)
	} else {
		log.Println("Brain client disabled or not configured; using template AI")
	}

	// Inject decision client into engine
	engine.SetDecisionClient(decisionClient)

	// Setup HTTP routes
	mux := http.NewServeMux()

	// WebSocket handler
	wsHandler := handlers.NewWSHandler()
	mux.HandleFunc("/ws", wsHandler.ServeWS)

	// API handlers
	gameHandler := handlers.NewGameHandler()
	mux.HandleFunc("/api/game", gameHandler.Handle)

	lobbyHandler := handlers.NewLobbyHandler()
	mux.HandleFunc("/api/lobby", lobbyHandler.Handle)

	shopHandler := handlers.NewShopHandler()
	mux.HandleFunc("/api/shop", shopHandler.Handle)

	// Battle handler
	battleHandler := handlers.NewBattleHandler()
	mux.HandleFunc("/api/battle", battleHandler.Handle)

	// Apply CORS middleware
	handler := handlers.CORSMiddleware(mux)

	port := getEnv("PORT", "8080")
	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}

	// Cleanup
	if decisionClient != nil {
		decisionClient.Close()
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

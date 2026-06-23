package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"backend/brainclient"
	"backend/engine"
	"backend/handlers"
	"backend/lobby"
)

func main() {
	// Brain Client initialization
	brainURL := os.Getenv("BRAIN_SERVER_URL")
	brainEnabled := os.Getenv("BRAIN_ENABLED") != "false"
	brainAPIKey := os.Getenv("BRAIN_API_KEY")
	brainTimeoutStr := os.Getenv("BRAIN_TIMEOUT")
	brainTimeout := 2 * time.Second
	if t, err := time.ParseDuration(brainTimeoutStr); err == nil {
		brainTimeout = t
	}

	var brainClient brainclient.DecisionClient
	if brainEnabled && brainURL != "" {
		brainClient = brainclient.NewBrainClient(brainURL, brainAPIKey, brainTimeout)
		log.Printf("Brain Client initialized: %s", brainURL)
	} else {
		log.Println("Brain Client is disabled")
	}
	engine.Initialize(brainClient)

	// Existing initialization
	lobby.Init()
	http.HandleFunc("/ws", handlers.WebSocketHandler)
	http.HandleFunc("/api/battle", handlers.BattleHandler)
	// ... other routes ...

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

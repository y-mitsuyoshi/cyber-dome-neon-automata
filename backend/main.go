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
	// Initialize Brain Client
	client := initBrainClient()
	if client != nil {
		engine.SetDecisionClient(client)
		log.Println("Brain client enabled")
		defer client.Close()
	}

	// Set up HTTP server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)

	// Configure routes (handlers.SetupRoutes is assumed to exist)
	handlers.SetupRoutes()

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func initBrainClient() brainclient.DecisionClient {
	enabledStr := os.Getenv("BRAIN_ENABLED")
	if enabledStr == "" {
		enabledStr = "true"
	}
	enabled, err := strconv.ParseBool(enabledStr)
	if err != nil || !enabled {
		log.Println("Brain client disabled")
		return nil
	}
	url := os.Getenv("BRAIN_SERVER_URL")
	if url == "" {
		log.Println("BRAIN_SERVER_URL not set, disabling brain client")
		return nil
	}
	apiKey := os.Getenv("BRAIN_API_KEY")
	timeoutStr := os.Getenv("BRAIN_TIMEOUT")
	timeout := 2 * time.Second
	if d, err := time.ParseDuration(timeoutStr); err == nil {
		timeout = d
	}
	return brainclient.NewBrainClient(url, apiKey, timeout)
}

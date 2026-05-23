package main

import (
	"backend/handlers"
	"backend/lobby"
	"backend/middleware"
	"fmt"
	"net/http"
)

func main() {
	// Initialize and run the WebSocket Hub
	go lobby.GlobalHub.Run()

	mux := http.NewServeMux()

	// Game endpoints
	mux.HandleFunc("/api/game/new", handlers.HandleNewGame)
	mux.HandleFunc("/api/game/state", handlers.HandleGameState)

	// Shop endpoints
	mux.HandleFunc("/api/shop", handlers.HandleGetShop)
	mux.HandleFunc("/api/shop/buy", handlers.HandleBuyCard)
	mux.HandleFunc("/api/shop/reroll", handlers.HandleRerollShop)
	mux.HandleFunc("/api/shop/delete", handlers.HandleDeleteCard)

	// Tournament endpoints
	mux.HandleFunc("/api/tournament/battle", handlers.HandleBattle)
	mux.HandleFunc("/api/tournament/next-round", handlers.HandleNextRound)

	// Lobby REST endpoints
	mux.HandleFunc("/api/lobby/create", handlers.HandleCreateLobby)
	mux.HandleFunc("/api/lobby/join", handlers.HandleJoinLobby)
	mux.HandleFunc("/api/lobby/add-npc", handlers.HandleAddNPC)
	mux.HandleFunc("/api/lobby/remove-npc", handlers.HandleRemoveNPC)
	mux.HandleFunc("/api/lobby/start", handlers.HandleStartGame)

	// WebSocket Endpoint
	mux.HandleFunc("/api/ws", handlers.HandleWS)

	// Wrap with CORS middleware
	handler := middleware.CORS(mux)

	port := ":8080"
	fmt.Printf("CYBER-DOME: Neon Automata backend starting on %s\n", port)
	fmt.Println("Endpoints:")
	fmt.Println("  POST /api/game/new")
	fmt.Println("  GET  /api/game/state")
	fmt.Println("  GET  /api/shop")
	fmt.Println("  POST /api/shop/buy")
	fmt.Println("  POST /api/shop/reroll")
	fmt.Println("  POST /api/shop/delete")
	fmt.Println("  POST /api/tournament/battle")
	fmt.Println("  POST /api/tournament/next-round")
	fmt.Println("  POST /api/lobby/create")
	fmt.Println("  POST /api/lobby/join")
	fmt.Println("  POST /api/lobby/add-npc")
	fmt.Println("  POST /api/lobby/remove-npc")
	fmt.Println("  POST /api/lobby/start")
	fmt.Println("  GET  /api/ws")

	if err := http.ListenAndServe(port, handler); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}

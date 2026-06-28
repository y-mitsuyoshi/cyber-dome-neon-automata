package main

import (
	"backend/handlers"
	"backend/lobby"
	"backend/middleware"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

func main() {
	// Seed random generator
	rand.Seed(time.Now().UnixNano())

	// Initialize and run the WebSocket Hub & Lobby GC sweeper
	go lobby.GlobalHub.Run()
	go lobby.StartLobbyGC(lobby.GlobalLobbyManager)

	mux := http.NewServeMux()

	// Game endpoints
	mux.HandleFunc("/api/game/new", handlers.HandleNewGame)
	mux.HandleFunc("/api/game/state", handlers.HandleGameState)
	mux.HandleFunc("/api/game/kick", handlers.HandleKickPlayer)

	// Shop endpoints
	mux.HandleFunc("/api/shop", handlers.HandleGetShop)
	mux.HandleFunc("/api/shop/buy", handlers.HandleBuyCard)
	mux.HandleFunc("/api/shop/reroll", handlers.HandleRerollShop)
	mux.HandleFunc("/api/shop/delete", handlers.HandleDeleteCard)

	// Tournament endpoints
	mux.HandleFunc("/api/tournament/battle", handlers.HandleBattle)
	mux.HandleFunc("/api/tournament/next-round", handlers.HandleNextRound)
	mux.HandleFunc("/api/battle/step", handlers.HandleBattleStep)
	mux.HandleFunc("/api/battle/action", handlers.HandleBattleAction)
	mux.HandleFunc("/api/battle/complete", handlers.HandleBattleComplete)

	// Lobby REST endpoints
	mux.HandleFunc("/api/lobby/create", handlers.HandleCreateLobby)
	mux.HandleFunc("/api/lobby/join", handlers.HandleJoinLobby)
	mux.HandleFunc("/api/lobby/add-npc", handlers.HandleAddNPC)
	mux.HandleFunc("/api/lobby/remove-npc", handlers.HandleRemoveNPC)
	mux.HandleFunc("/api/lobby/start", handlers.HandleStartGame)

	// WebSocket Endpoint
	mux.HandleFunc("/api/ws", handlers.HandleWS)
	mux.HandleFunc("/api/ws/spectate", handlers.HandleWSSpectator)

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
	fmt.Println("  POST /api/battle/action")
	fmt.Println("  POST /api/battle/complete")
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

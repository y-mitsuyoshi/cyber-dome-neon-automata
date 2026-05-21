package main

import (
	"backend/handlers"
	"backend/middleware"
	"fmt"
	"net/http"
)

func main() {
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

	// Wrap with CORS middleware
	handler := middleware.CORS(mux)

	port := ":8080"
	fmt.Printf("CYBER-DOME: Neon Automata backend starting on %s\n", port)
	fmt.Println("Endpoints:")
	fmt.Println("  POST /api/game/new")
	fmt.Println("  GET  /api/game/state?gameId=XXX")
	fmt.Println("  GET  /api/shop?gameId=XXX")
	fmt.Println("  POST /api/shop/buy")
	fmt.Println("  POST /api/shop/reroll")
	fmt.Println("  POST /api/shop/delete")
	fmt.Println("  POST /api/tournament/battle")
	fmt.Println("  POST /api/tournament/next-round")

	if err := http.ListenAndServe(port, handler); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}

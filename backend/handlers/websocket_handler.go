package handlers

import (
	"log"
	"net/http"
)

// WebSocketHandler handles WebSocket connections.
func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("WebSocket handler invoked")
	http.Error(w, "WebSocket not implemented", http.StatusNotImplemented)
}

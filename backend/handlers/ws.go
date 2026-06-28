package handlers

import (
	"backend/lobby"
	"net/http"
)

// HandleWS upgrades the connection and registers the client with the hub.
// GET /api/ws?code=XXX&name=YYY
func HandleWS(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	name := r.URL.Query().Get("name")

	if code == "" || name == "" {
		http.Error(w, "code and name query parameters are required", http.StatusBadRequest)
		return
	}

	lob := lobby.GlobalLobbyManager.GetLobby(code)
	if lob == nil {
		http.Error(w, "lobby not found", http.StatusNotFound)
		return
	}

	lobby.ServeWs(lobby.GlobalHub, w, r, code, name)
}

// HandleWSSpectator upgrades the connection and registers a spectator with the hub.
// GET /api/ws/spectate?code=XXX&name=YYY
func HandleWSSpectator(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	name := r.URL.Query().Get("name")

	if code == "" || name == "" {
		http.Error(w, "code and name query parameters are required", http.StatusBadRequest)
		return
	}

	lob := lobby.GlobalLobbyManager.GetLobby(code)
	if lob == nil {
		http.Error(w, "lobby not found", http.StatusNotFound)
		return
	}

	lobby.ServeWsSpectator(lobby.GlobalHub, w, r, code, name)
}

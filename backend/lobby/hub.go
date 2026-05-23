package lobby

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for CORS
	},
}

// Client represents a connected player.
type Client struct {
	Hub        *Hub
	Conn       *websocket.Conn
	Send       chan []byte
	LobbyCode  string
	PlayerName string
}

// Hub manages active WebSocket connections.
type Hub struct {
	sync.RWMutex
	Clients    map[*Client]bool
	LobbyCodeToClients map[string]map[string]*Client // lobbyCode -> playerName -> Client
	Register   chan *Client
	Unregister chan *Client
}

// GlobalHub is the singleton instance.
var GlobalHub = &Hub{
	Clients:            make(map[*Client]bool),
	LobbyCodeToClients: make(map[string]map[string]*Client),
	Register:           make(chan *Client),
	Unregister:         make(chan *Client),
}

// Run executes the hub main loop.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Lock()
			h.Clients[client] = true
			if h.LobbyCodeToClients[client.LobbyCode] == nil {
				h.LobbyCodeToClients[client.LobbyCode] = make(map[string]*Client)
			}
			h.LobbyCodeToClients[client.LobbyCode][client.PlayerName] = client

			// Register in the lobby clients map too
			if lobby := GlobalLobbyManager.GetLobby(client.LobbyCode); lobby != nil {
				lobby.Clients[client.PlayerName] = client
			}
			h.Unlock()

			// Broadcast updated lobby state
			h.BroadcastLobbyState(client.LobbyCode)

		case client := <-h.Unregister:
			h.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				if clients, ok2 := h.LobbyCodeToClients[client.LobbyCode]; ok2 {
					delete(clients, client.PlayerName)
					if len(clients) == 0 {
						delete(h.LobbyCodeToClients, client.LobbyCode)
					}
				}

				// Remove from lobby
				h.Unlock()
				lobby, _ := GlobalLobbyManager.LeaveLobby(client.LobbyCode, client.PlayerName)
				if lobby != nil {
					h.BroadcastLobbyState(client.LobbyCode)
				}
			} else {
				h.Unlock()
			}
		}
	}
}

// Broadcast sends a message to all clients in a specific lobby.
func (h *Hub) Broadcast(lobbyCode string, msg interface{}) {
	h.RLock()
	clients, ok := h.LobbyCodeToClients[lobbyCode]
	if !ok {
		h.RUnlock()
		return
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshalling broadcast message: %v", err)
		h.RUnlock()
		return
	}

	// Copy clients slice to safely release lock before writing
	clientList := make([]*Client, 0, len(clients))
	for _, c := range clients {
		clientList = append(clientList, c)
	}
	h.RUnlock()

	for _, client := range clientList {
		select {
		case client.Send <- payload:
		default:
			log.Printf("Send buffer full for %s, closing connection", client.PlayerName)
			h.Unregister <- client
		}
	}
}

// BroadcastLobbyState broadcasts the current lobby players and settings.
func (h *Hub) BroadcastLobbyState(lobbyCode string) {
	lobby := GlobalLobbyManager.GetLobby(lobbyCode)
	if lobby == nil {
		return
	}

	msg := map[string]interface{}{
		"type": "lobby_state",
		"data": map[string]interface{}{
			"code":    lobby.Code,
			"players": lobby.Players,
			"host":    lobby.Host,
			"status":  lobby.Status,
		},
	}
	h.Broadcast(lobbyCode, msg)
}

// readPump pumps messages from the WebSocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Simple chat message parsing
		var chatMsg struct {
			Type string `json:"type"`
			Text string `json:"text"`
		}
		if err := json.Unmarshal(msg, &chatMsg); err == nil && chatMsg.Type == "chat" {
			c.Hub.Broadcast(c.LobbyCode, map[string]interface{}{
				"type": "chat",
				"data": map[string]string{
					"from": c.PlayerName,
					"text": chatMsg.Text,
				},
			})
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request, code string, name string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS Upgrade error: %v", err)
		return
	}

	client := &Client{
		Hub:        hub,
		Conn:       conn,
		Send:       make(chan []byte, 256),
		LobbyCode:  code,
		PlayerName: name,
	}
	client.Hub.Register <- client

	// Start read and write pumps
	go client.writePump()
	go client.readPump()

	fmt.Printf("WebSocket client registered: name=%s, lobby=%s\n", name, code)
}

package httpapi

import (
    "encoding/json"
    "log"
    "net/http"

    "redonet/internal/store"
    "redonet/internal/p2p"
)

// Start starts an HTTP server in a new goroutine. It never returns.
// addr example ":3001".
func Start(cr *p2p.ChatRoom, st *store.Store, addr string) {
    mux := http.NewServeMux()

    mux.HandleFunc("/messages", func(w http.ResponseWriter, r *http.Request) {
        enableCORS(w)
        if r.Method == http.MethodOptions {
            return
        }
        if r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        msgs := st.All()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(msgs)
    })

    mux.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
        enableCORS(w)
        if r.Method == http.MethodOptions {
            return
        }
        if r.Method != http.MethodPost {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        var body struct {
            Message string `json:"message"`
        }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Message == "" {
            http.Error(w, "bad request", http.StatusBadRequest)
            return
        }
        if err := cr.Publish(body.Message); err != nil {
            http.Error(w, "publish failed", http.StatusInternalServerError)
            return
        }
        st.Add("HTTP: " + body.Message)
        w.WriteHeader(http.StatusOK)
    })

    go func() {
        log.Println("HTTP API listening on", addr)
        if err := http.ListenAndServe(addr, mux); err != nil {
            log.Println("HTTP server error:", err)
        }
    }()
}

func enableCORS(w http.ResponseWriter) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
} 
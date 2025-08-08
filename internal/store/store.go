package store

import "sync"

// Store keeps the last N strings in a fixed-size ring buffer (drop-oldest).
// It is safe for concurrent use.
type Store struct {
    mu   sync.RWMutex
    msgs []string
    cap  int
}

// New returns an empty Store that can hold at most capacity messages.
// If capacity <= 0 a default of 100 is used.
func New(capacity int) *Store {
    if capacity <= 0 {
        capacity = 100
    }
    return &Store{cap: capacity}
}

// Add appends a new message, evicting the oldest when the buffer is full.
func (s *Store) Add(m string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    if len(s.msgs) == s.cap {
        copy(s.msgs, s.msgs[1:])
        s.msgs[len(s.msgs)-1] = m
    } else {
        s.msgs = append(s.msgs, m)
    }
}

// All returns a copy of the stored messages in chronological order.
func (s *Store) All() []string {
    s.mu.RLock()
    defer s.mu.RUnlock()
    out := make([]string, len(s.msgs))
    copy(out, s.msgs)
    return out
} 
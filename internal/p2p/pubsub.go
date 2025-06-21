package p2p

import (
    "context"
    "encoding/json"
    "fmt"

    pubsub "github.com/libp2p/go-libp2p-pubsub"
    "github.com/libp2p/go-libp2p/core/peer"
)

// ChatMessage represents a single message flowing through the chat topic.
// JSON-encoded when published.
type ChatMessage struct {
    Message    string `json:"message"`
    SenderID   string `json:"sender_id"`
    SenderNick string `json:"sender_nick"`
}

// ChatRoom wraps a PubSub topic subscription.
type ChatRoom struct {
    ctx   context.Context
    topic *pubsub.Topic
    sub   *pubsub.Subscription

    self peer.ID
    nick string

    Messages chan *ChatMessage // inbound messages for the application
}

// JoinChatRoom creates/joins a GossipSub topic named "chat-room:<room>" and
// starts a reader goroutine that forwards decoded ChatMessages onto cr.Messages.
func JoinChatRoom(ctx context.Context, ps *pubsub.PubSub, self peer.ID, nick, room string) (*ChatRoom, error) {
    topicName := fmt.Sprintf("chat-room:%s", room)
    topic, err := ps.Join(topicName)
    if err != nil {
        return nil, fmt.Errorf("join topic: %w", err)
    }
    sub, err := topic.Subscribe()
    if err != nil {
        return nil, fmt.Errorf("subscribe topic: %w", err)
    }

    cr := &ChatRoom{
        ctx:      ctx,
        topic:    topic,
        sub:      sub,
        self:     self,
        nick:     nick,
        Messages: make(chan *ChatMessage, 128),
    }

    go cr.readLoop()
    return cr, nil
}

// Publish serialises the given text and broadcasts it to the topic.
func (cr *ChatRoom) Publish(text string) error {
    msg := ChatMessage{
        Message:    text,
        SenderID:   cr.self.String(),
        SenderNick: cr.nick,
    }
    b, err := json.Marshal(msg)
    if err != nil {
        return fmt.Errorf("marshal chat message: %w", err)
    }
    return cr.topic.Publish(cr.ctx, b)
}

func (cr *ChatRoom) readLoop() {
    for {
        m, err := cr.sub.Next(cr.ctx)
        if err != nil {
            close(cr.Messages)
            return
        }
        if m.ReceivedFrom == cr.self {
            continue // skip messages we published ourselves
        }
        var cm ChatMessage
        if err := json.Unmarshal(m.Data, &cm); err == nil {
            cr.Messages <- &cm
        }
    }
} 
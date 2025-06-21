package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	redop2p "redonet/internal/p2p"

	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/libp2p/go-libp2p/core/peer"
	ma "github.com/multiformats/go-multiaddr"
)

// Stage 3: we no longer use raw streams; chat is via GossipSub.

const (
	colorReset = "\033[0m"
	colorGreen = "\033[32m"
	colorCyan  = "\033[36m"
)

func main() {
	port := flag.String("port", "0", "tcp port to listen on (0 = random)")
	peerAddr := flag.String("peer", "", "optional multiaddr of peer to dial")
	rendezvous := flag.String("rendezvous", "redonet-chat", "rendezvous string for mDNS discovery")
	nickFlag := flag.String("nick", "anon", "nickname to display")
	roomFlag := flag.String("room", "main", "chat room name")
	flag.Parse()

	h, err := redop2p.CreateHost(*port)
	if err != nil {
		log.Fatalf("failed to create host: %v", err)
	}

	// Print connection info
	fmt.Println("Local peer ID:", h.ID())
	for _, addr := range h.Addrs() {
		fmt.Println("Listening on:", addr.Encapsulate(peerIDToAddr(h.ID())))
	}

	// Initialise GossipSub
	ps, err := pubsub.NewGossipSub(context.Background(), h)
	if err != nil {
		log.Fatalf("gossipsub init: %v", err)
	}

	cr, err := redop2p.JoinChatRoom(context.Background(), ps, h.ID(), *nickFlag, *roomFlag)
	if err != nil {
		log.Fatalf("join chat room: %v", err)
	}

	// Printer goroutine for incoming messages
	go func() {
		for m := range cr.Messages {
			fmt.Printf("%s[%s]%s %s\n", colorCyan, m.SenderNick, colorReset, m.Message)
		}
	}()

	// Step 2: mDNS discovery 
	peerChan := redop2p.InitMDNS(h, *rendezvous)
	go func() {
		ctx := context.Background()
		for pi := range peerChan {
			if pi.ID == h.ID() {
				continue // ignore self brodcasted messages
			}
			fmt.Println("mDNS discovered", pi.ID, pi.Addrs)
			// Dial ordering rule: only dial if our peer ID string is lexicographically smaller

			// since we are in a decentralized network without a single point of control, we need to ensure both peers do not dial connections with each other if they find the other peer at the same time
			// to avoid this simultaneous dial race condition we can use a tie breaker rule to always have the bigger peer to dial the smaller one which allows us to make a single dial call
			if h.ID() < pi.ID {
				if err := h.Connect(ctx, pi); err != nil {
					fmt.Println("connect error:", err)
				}
			}
		}
	}()

	// stage 2 note : still supporting the peer flag from stage 1
	// If peer provided, dial it 
	if *peerAddr != "" {
		ai, err := parseAddrInfo(*peerAddr)
		if err != nil {
			log.Fatalf("invalid peer address: %v", err)
		}
		// dial only to establish connectivity; pubsub works afterwards
		if err := h.Connect(context.Background(), *ai); err != nil {
			log.Fatalf("connection failed: %v", err)
		}
	}

	// STDIN publisher loop
	stdin := bufio.NewReader(os.Stdin)
	for {
		line, err := stdin.ReadString('\n')
		if err != nil {
			log.Println("stdin error:", err)
			break
		}
		text := strings.TrimSpace(line)
		if text == "" {
			continue
		}
		// echo own message locally in green
		fmt.Printf("%s[You]%s %s\n", colorGreen, colorReset, text)
		if err := cr.Publish(text); err != nil {
			log.Printf("publish error: %v", err)
		}
	}

	fmt.Println("Shutting down…")
	_ = h.Close()
}

func parseAddrInfo(addr string) (*peer.AddrInfo, error) {
	maddr, err := ma.NewMultiaddr(addr)
	if err != nil {
		return nil, err
	}
	ai, err := peer.AddrInfoFromP2pAddr(maddr)
	return ai, err
}

// peerIDToAddr helper turns peer ID into /p2p/<id> multiaddr
func peerIDToAddr(id peer.ID) ma.Multiaddr {
	ai := peer.AddrInfo{ID: id}
	addrs, _ := peer.AddrInfoToP2pAddrs(&ai)
	return addrs[0]
} 
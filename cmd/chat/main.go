package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	redop2p "redonet/internal/p2p"

	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	ma "github.com/multiformats/go-multiaddr"
)

const chatProtocolID = "/redonet/1.0.0"

func main() {
	port := flag.String("port", "0", "tcp port to listen on (0 = random)")
	peerAddr := flag.String("peer", "", "optional multiaddr of peer to dial")
	rendezvous := flag.String("rendezvous", "redonet-chat", "rendezvous string for mDNS discovery") // rendezvous string for mDNS discovery
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

	// Register handler for incoming chat streams
	h.SetStreamHandler(chatProtocolID, handleStream)

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
					continue
				}
				fmt.Println("✓ mDNS connected to", pi.ID)
				if s, err := h.NewStream(ctx, pi.ID, chatProtocolID); err == nil {
					go chat(s)
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
		if err := h.Connect(context.Background(), *ai); err != nil {
			log.Fatalf("connection failed: %v", err)
		}
		// open a stream and launch chat
		stream, err := h.NewStream(context.Background(), ai.ID, chatProtocolID)
		if err != nil {
			log.Fatalf("opening stream: %v", err)
		}
		go chat(stream)
	}

	// Wait for Ctrl-C
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	fmt.Println("Shutting down…")
	_ = h.Close()
}

func handleStream(s network.Stream) {
	go chat(s)
	// calls the caht function in a seperate go routine on the stream
}

// chat pumps stdin lines to the stream and echoes received lines to stdout.
func chat(s network.Stream) {
	rw := bufio.NewReadWriter(bufio.NewReader(s), bufio.NewWriter(s))

	// Outgoing goroutine
	go func() {
		stdin := bufio.NewReader(os.Stdin)
		for {
			line, err := stdin.ReadString('\n')
			if err != nil {
				log.Println("stdin error:", err)
				return
			}
			if _, err := rw.WriteString(line); err != nil {
				log.Println("write error:", err)
				return
			}
			_ = rw.Flush()
		}
	}()

	// Incoming loop
	for {
		line, err := rw.ReadString('\n')
		if err != nil {
			log.Println("read error:", err)
			return
		}
		fmt.Printf("%s", line)
	}
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
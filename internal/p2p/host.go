package p2p

import (
	"fmt"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
)

// CreateHost spins up a libp2p host bound to 127.0.0.1:<port> and returns it.
func CreateHost(port string) (host.Host, error) {
	addr := fmt.Sprintf("/ip4/127.0.0.1/tcp/%s", port)
	h, err := libp2p.New(
		libp2p.ListenAddrStrings(addr),
	)
	return h, err
} 
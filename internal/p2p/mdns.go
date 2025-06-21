package p2p

import (
    "github.com/libp2p/go-libp2p/core/host"
    "github.com/libp2p/go-libp2p/core/peer"
    "github.com/libp2p/go-libp2p/p2p/discovery/mdns"
)

// discoveryNotifee implements mdns.Notifee; it forwards discovered peers to a channel.
// The caller consumes the channel to establish connections.
type discoveryNotifee struct {
    PeerChan chan peer.AddrInfo
}

// HandlePeerFound is called by the mdns service when a new peer is discovered.
func (n *discoveryNotifee) HandlePeerFound(pi peer.AddrInfo) {
    n.PeerChan <- pi
}

// InitMDNS starts an mDNS discovery service bound to the given host and rendezvous
// string. It returns a channel that emits discovered peers.
// Every peer running the same rendezvous value can find one another on the same LAN.
func InitMDNS(h host.Host, rendezvous string) <-chan peer.AddrInfo {
    n := &discoveryNotifee{PeerChan: make(chan peer.AddrInfo)}
    svc := mdns.NewMdnsService(h, rendezvous, n)
    if err := svc.Start(); err != nil {
        panic(err) // for demo purposes; propagate in prod code
    }
    return n.PeerChan
} 
# LAN Chat - Offline LAN based chat
## Build

```bash
go mod tidy  # run inside the module root (../..)

# then in this terminal
cd cmd/chat && go run . -port 9000 && cd ../..  # start first node
```

In a second terminal:

```bash
cmd/chat && go run . -port 9001 --peer <addr> && cd ../..
```

Replace `<peerID>` with the value printed by the first terminal. 



test: Try to chat back and worth with both terminals and that should work

Stage 2: MDNS Peer Discovery over Local networks

- functionality: Can connect to and interact with a peer on the same network automatically without needing to find by addr which was not applicable in a real world scenario.

- use a rendezvouz (ive been trying to spell this right for 30 mins) flag to give an identity to broadcast to the network as well as subscribe to only accept mDNS messages advertising the same flag. this allows them to connect to a single decentralized 'room' on a local network.

Testing:

terminal 1:
```
cd cmd/chat && go run . -port 2000 --rendezvous myroom && cd ../..
```

terminal 2: 
```
cd cmd/chat && go run . -port 0 --rendezvous myroom && cd ../..
```

wait for `✓ mDNS connected to` logs on both ends and continue chatting

note: no need for the address, nodes autoconnect with multicast peer discovery


rough brain info log for showing decision making here: 



stage 1:


considering the following: libp2p, high performace oss networking library for network layer apps. can handle tcp p2p level communication on a local network with nodes.
1. configuring the nodes to start listening on a specific port.
2. make sure they are polling for a signal to wait on without exiting. SIGTERM and SIGINT before shutting down
3. once node is polling we need to communicate so now send something (ping). the nodes setup in libp2p is doing it automatically but we can set it up to do it manually
4. make sure we look for a random tcp port which is not hardcoded so we can instantiate multiple nodes on the same machine for testing
5. ping the connection message so others can identify you using an id. we can call this peerId (do we need to maintain uniqueness? Yes ok how? will figure out)
6. try connecting and logging the ping on some other node
7. this will establish the ping pong which we can then test.
8. This marks phase 1 will allow me to communicate with just two nodes on the same tcp port using pings and i will have to write a parsing engine (i’m already working on something similar at work so might be fun to do)



stage 2: now make them find each other without the peer address

Multicast DNS (mDNS) is a zero-configuration protocol (part of Apple’s Bonjour/Avahi stack) that:
Sends UDP packets to the multicast address 224.0.0.251:5353 (IPv4) or ff02::fb:5353 (IPv6).
Announces “service records” (_http._tcp, _workstation._tcp, …).
Lets machines discover each other without a central DNS server.

libp2p advertises your peer as a _p2p._udp style service containing its multi-addr, namespaced by a “rendezvous” string

since we are in a decentralized network without a single point of control, we need to ensure both peers do not dial connections with each other if they find the other peer at the same time

to avoid this simultaneous dial race condition we can use a tie breaker rule to always have the bigger peer to dial the smaller one which allows us to make a single dial call


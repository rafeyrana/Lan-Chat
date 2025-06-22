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


Stage 3: Gossip Pub Sub

Now that we can subscribe and listen to the messages on the stream for all topics we can optimise this with the Gossibsub algorithm. Gossip pub sub builds mesh overlay for just that topic. just like a message queue:

Pushing: Publish message to topic with a messageid and propogated as a gossip beacaon to all users to avoid duplication

Receiving: Subscribe to topic and only pick up frames with the defined topic

handles late joiners, rejoiners and random user dropping.

Testing:

Run as many users in parallel using the following command:
```
d cmd/chat && go run . -port <random_port> --rendezvous <tag> --nick <Identifier> --room <random_room_name> && cd ../..
```

Stage 4: frontend and server
- basic html and server

Testing (Stage 4 end-to-end)
----------------------------

1. **Start a chat node that exposes the REST API**

```bash
cd cmd/chat && go run . --port 9000 \
    --rendezvous myroom --nick Alice --room main --enable-http && cd ../..
```

2. **(Optional) start more peers** (they don't need `--enable-http`)

```bash
cd cmd/chat && go run . --port 0 --rendezvous myroom --nick Bob --room main && cd ../..
```

3. **Serve the static HTML UI**

```bash
cd frontend
# any static file server works; here's Python 3:
python3 -m http.server 8080
# now browse to http://localhost:8080
```

4. In the browser, send a message – it should appear:
   • immediately in the web UI (`[You] …`)
   • in every terminal peer's console
   • in `chat.log` and via `GET http://localhost:3001/messages`.

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
8. This marks phase 1 will allow me to communicate with just two nodes on the same tcp port using pings and i will have to write a parsing engine (i'm already working on something similar at work so might be fun to do)



stage 2: now make them find each other without the peer address

Multicast DNS (mDNS) is a zero-configuration protocol (part of Apple's Bonjour/Avahi stack) that:
Sends UDP packets to the multicast address 224.0.0.251:5353 (IPv4) or ff02::fb:5353 (IPv6).
Announces "service records" (_http._tcp, _workstation._tcp, ...).
Lets machines discover each other without a central DNS server.

libp2p advertises your peer as a _p2p._udp style service containing its multi-addr, namespaced by a "rendezvous" string

since we are in a decentralized network without a single point of control, we need to ensure both peers do not dial connections with each other if they find the other peer at the same time

to avoid this simultaneous dial race condition we can use a tie breaker rule to always have the bigger peer to dial the smaller one which allows us to make a single dial call

3. Stage 3
Now we need a chat room scenario for the 1-M scenario

After some research it seems that the Gossip (Epidemic) Protocal can be a good idea with a pub sub architecture. I remember gossip protocols from undergrad where they propogate messages fault tolreantly through network even with node churn due to the random neighbour selection. they keep data fresh as well.


now this gossip protocol with a pub sub architecture is different from a traditional pub sub with an established heirarchal brokers or central brokers to manage / route the messages.


In our case we can use a sort of decentralized overlay where each participant will be used to route messages. Upon research it seems that we need to 

1. construct mesh 
2. pushing messages (eager and lazy pushing) and pulling
3. message integrity and reliability
4. logical seperation into rooms at level 4
5. node health checks
6. message deduplication


Keeping the stage 1 peer address connection because it can be useful across subnets
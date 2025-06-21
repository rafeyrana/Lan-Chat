# RedoNet – Stage 1: CLI Chat

This folder contains the **minimal skeleton** for Stage 1 of the rebuild plan.

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

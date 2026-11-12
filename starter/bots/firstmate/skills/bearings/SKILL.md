---
name: bearings
description: The captain's factory digest, in chat or as a lavish board. Manual; runs only when the captain asks for bearings (in chat, or as a board).
disable-model-invocation: true
---
# Bearings

The captain asked for the factory digest. The scripts are in `scripts/` beside this file; each header gives usage and output format.

- Bearings in chat: run `scripts/fm-bearings.sh [--since 48h]` (Landed window; default 24h). Relay its four sections (Captain's Call, Underway, Landed, Charted Next) as is, then add your own judgment on what needs the captain.
- Bearings as a board: run `scripts/fm-bearings-board.sh [--since 48h]`, then open the path it prints with `LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 <path>`, adding `--reopen` if lavish says the captain ended the last board session (the captain's request for the board is the ask).

`scripts/fm-crew-state.sh [task-id]` prints one line per open task (queued, underway, blocked): id, kind, status, gate, age since last update, and the newest crew message in the task's own thread. fm-bearings.sh builds its sections from it; the heartbeat runs it too.

Read-only: no writes to factory.db. Never share, export or publish the digest or the board.

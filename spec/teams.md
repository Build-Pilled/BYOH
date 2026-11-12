# Team membership and messaging reach

Classification: Core. Prerequisites: configured bots and home.

## Purpose

Separate organizational grouping from permission to message. Teams determine
rosters, implicit reach and incident destinations; explicit bridges are owned
by [messaging](messaging.md). The [team-map](team-map.md) section owns graphical editing.

## Required behaviour

- **R1 — File contract.** `teams/<id>.toml` accepts `name` (display string,
  defaults to file id), optional `lead` (nonempty existing bot id), `members`
  (string array, default empty). Omit lead for a leadless team; empty lead is
  invalid, not shorthand for none. The lead is not listed in members. Each
  referenced bot must exist; a bot belongs to at most one team, whether as lead
  or member. Unknown fields/types and conflicting memberships are diagnostics.
- **R2 — Led team.** Lead sees its members' roster with ids and short
  descriptions (at most 200 description characters). Lead and every member
  can reach every other bot in that team. Members can reach the lead but do
  not receive the lead's managerial roster as a separate prompt grant.
  Failure incidents go to that member's lead as in [failure alerts](failure-alerts.md).
- **R3 — Leadless and unteamed.** A leadless team groups bots in the app only:
  no implicit reach, managerial roster or lead incident destination. Members
  reach only explicit bridge peers. A bot in no team has that same bridge-only
  reach and no incident lead. All three arrangements are core, not optional
  interview features.
- **R4 — Live view.** Owner `GET /bots` exposes teams and per-bot `roster` and
  `leads` as lists of bot ids ([bots](bots.md) R4): a lead's roster is its
  members and each member's leads is its lead; a leadless team gives neither;
  bot-session `GET /reachable` exposes the sorted unique union of led teammates
  and bridge peers, excluding self. Membership edits are reloaded without a
  daemon restart; reach checks use current membership, not an old prompt's
  claim. Removing a team connection does not remove an existing explicit bridge.
- **R5 — Person targeting.** CLI `say <team> ...` resolves the team's lead;
  a bot with the same id takes precedence. A leadless team is not a broadcast
  target. No implicit fan-out to every member is permitted.

## Controls

Not applicable; file editing, team-map and shell team navigation controls belong to [config-editors](config-editors.md), [team-map](team-map.md) and [ui-shell](ui-shell.md).

## Edge cases

- **E1 — Conflicts.** Validate reports missing bots, duplicate cross-team claims,
  invalid lead and lead-in-members. Diagnostics do not establish a security
  boundary against arbitrary disk edits by the bot OS user; the host isolation
  floor is a different contract. Invalid teams have no last-good guarantee.
- **E2 — Bridge survival.** Disconnecting a bridge between led teammates does
  not revoke team reach; leaving a led team does not revoke an explicit bridge.
  Teammates who have exchanged a message already have one, because the first
  message created it ([messaging](messaging.md) R4), so they stay in reach
  after one of them leaves the team until the person disconnects them in Bot
  threads.
  Explain the actual remaining path rather than reporting an absolute block.
- **E3 — No destination.** A leadless team targeted by say fails unless the
  same id identifies a real bot. No arbitrary member is chosen.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Leadless is not a broadcast group** | A leadless team and an unteamed bot, with or without explicit bridges | Read roster/reach/incidents; address the leadless team with CLI say | No implicit roster, team reach or incident lead; only bridge peers. Team say has no arbitrary member/broadcast destination unless its id names a real bot (R3, R5, E3). |
| **T2 — Conflicting membership** | A bot is named in several teams, including leadless teams | Validate the team files | Report the conflict; at most one membership is permitted. Invalid teams have no last-good guarantee; diagnostics are not an OS-user security boundary (R1, E1). |

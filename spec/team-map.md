# Team map and roster editing

Classification: Core. Prerequisites: [teams](teams.md), [bots](bots.md), [config editors](config-editors.md).

## Purpose

See team membership and change it deliberately. The map owns roster editing and
local presentation ordering; [teams](teams.md) owns actual messaging reach and
lead/leadless semantics. A visual arrangement alone grants no permission.

## Required behaviour

- **R1 — Map.** Tools → Team map shows one column per team plus Bots for the
  unteamed. Lead cards are distinguished and fixed before members. Cards show
  identity mark/name/description and open that bot's chat. Clicking a team header
  opens its team-file editor; clicking it again or Close closes the editor.
  Existing starter identities are read from the [starter-bots table](starter-bots.md),
  never repeated as literals in map requirements or scenarios.
- **R2 — Create.** New team asks Id and Name and creates `teams/<id>.toml` with
  name (Id fallback), empty members and no lead, then selects its editor. Existing
  target is refused with visible path error and exactly unchanged bytes;
  independent same-id dialogs cannot replace the winner. This data-safety
  rule applies to the dialog, not a new wire API.
  Cancel/empty Id writes nothing. Shared file policy still applies to paths.
- **R3 — Membership.** Drag a non-lead member between team columns to remove it
  from the old file and add it once to the destination members; drop on Bots to
  remove membership. A lead cannot be dragged as a member: choose a new lead
  in its team editor first. Sidebar bot action Move to team opens the same
  membership choice: at most one team checked; clear all for Bots. Move writes
  only when changed and shows failures. Moving between files is sequential,
  not an atomic transaction: failure after source removal can leave the bot
  unteamed. Refresh actual world/file state and repair/retry explicitly; never
  claim rollback or successful target membership from the drag alone.
- **R4 — Team editor.** Form and Text edit the same `teams/<id>.toml` draft with
  shared FileBar Save/conflict/validation. Form offers Name, Lead including
  No lead, member checkboxes and read-only lead roster. Bots already used by
  another team are excluded from form choices. Selecting a lead removes that
  bot from members; it is not a duplicate member. Show roster in id order,
  excluding the lead. No-lead explains display grouping without team message
  reach/incidents; [teams](teams.md) remains authoritative. Invalid text must
  be repaired/validated, not treated as a successful new roster. Saving team
  changes records attributed history; merely changing the draft does not.
- **R5 — Presentation order.** Drag member cards within a column to reorder;
  drag column headers to reorder columns. Sidebar bot/member order and team/
  Bots section order follow the map. Sidebar additionally includes Bot threads
  and can reorder sections there. Store these orders locally per app profile
  and daemon origin, reconcile newly discovered/deleted ids, and preserve
  existing order for unchanged ids. Reordering within a column changes no team
  TOML, prompt roster, reach or history. A membership move also places the bot
  at the drop position in that local order; lead remains first.

## Controls

Use stable ids in names and show friendly names as content. Shared editor
File region/actions are specified in config-editors. Drag targets are named
visible groups, not test-only tags; pointer dragging uses their actual bounds.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| region | Team map | Main board. |
| group | Team <id> / Bots | Column membership/drop target. |
| button | Edit team <id> | Team header; expanded when editor open, also draggable for column order. |
| group | Reorder Bots | Draggable Bots heading; no file mutation. |
| button | Open bot <id> | Card within its column; non-lead cards draggable for membership/order. |
| button | New team | Opens dialog New team. |
| dialog | New team | Id, Name, OK and Cancel. |
| textbox | Id / Name | Individually named New team fields. |
| button | OK / Cancel | Creation dialog; create-only or dismiss. |
| complementary | Team editor <id> | Shared File region for selected team. |
| button | Close | Team editor heading. |
| button | Form / Text | Team editor; pressed mode state, no write on switch. |
| textbox | Name | Form draft display name. |
| combobox | Lead | Form, including No lead. |
| checkbox | Member <bot-id> | Form, checked if member in draft. |
| region | Lead's roster | Read-only id list or no-lead explanation. |
| dialog | Move <bot-id> to a team | Sidebar-origin membership chooser. |
| checkbox | Team <id> | Move dialog; zero or one checked. |
| button | Move | Move dialog, disabled when unchanged/busy. |
| button | Cancel / Close | Move dialog; Close for lead explanation, Cancel otherwise. |
| group | Reorder <section-id> | Sidebar section drag handle; local section order. |

## Edge cases

- **E1 — Lead and exclusion.** A lead's Move dialog explains why movement is
  unavailable until replacement; no hidden membership write. Form excludes
  bots in another team rather than silently evicting them. Raw invalid teams
  report validation problems, not a guaranteed last-good-team snapshot.
- **E2 — Partial move.** Source removal can succeed before target write fails;
  independent reads decide membership. Error recovery must not duplicate a bot
  by blindly retrying stale source/target state. File history can show two edits.
- **E3 — Empty and concurrent creation.** Empty team/Bots columns remain usable
  drop targets. Duplicate New team refuses unchanged bytes even if another
  dialog created it since opening. Local reorder can survive app reopen without
  changing any configuration file; it is not a shared team ordering setting.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Local order, shared presentation** | Led/leadless team columns, Bots and sidebar-only Bot threads with persisted local order | Pointer-drag headers/sections or reorder members within a column; reopen the app | Map and sidebar follow the same local presentation order, with Bot threads only in sidebar and leads first. Store per profile/daemon origin and survive ordinary reopen. Reordering alone changes no team TOML, prompt roster, reach or history (R1, R5, E3). |
| **T2 — Identity survives a display rename** | Saved local order, current/new/deleted team ids and a friendly-name edit | Reconcile current groups and rename without changing file id | Render current teams/Bots and preserve existing order for unchanged ids. A changed display name is not a new identity; a new file id is reconciled as new. Leadless grouping still grants no team reach (R1, R5; [teams](teams.md) R1, R3). |
| **T3 — Member movement is not column movement** | Non-lead member, leadless target and Bots drop target | Drag a member between groups or drop on Bots rather than dragging a header | Apply membership R3 once, keep lead first, and place the member at its drop position in local order. This is a sequential file move, not atomic: after source removal/target failure read actual state and repair. Do not claim rollback or duplicate a membership on retry. Header order alone remains presentation-only (R3, R5, E2). |

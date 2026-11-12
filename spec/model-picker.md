# Model selection

Classification: Core. Prerequisites: [bot configuration](bots.md), selected [engine adapters](engine-contract.md), [config editors](config-editors.md).

## Purpose

Choose a bot's model without conflating a saved request with an engine's effective
launch. There is one model setting per bot, not a hidden per-thread preference.

## Required behaviour

- **R1 — Entry and catalogue.** The conversation header Model and thinking opens
  the bot panel's Model section. The Model button there opens a searchable
  list from owner `GET /models`; show model names and full ids grouped by
  provider. Only selected adapters contribute models. Claude Code and
  Anthropic API routes are visibly distinguished, not recommended as a billing
  choice. List loading is not a successful empty catalogue.
- **R2 — Matching and custom ids.** Split query on whitespace, ignore case and
  require every word within combined model name/id/provider/group label.
  Order Claude Code group first, Anthropic API next, then other provider groups
  alphabetically, preserving catalogue order within a group. A query containing
  `/` that is not an exact listed id offers Use "<id>" for the trimmed full id.
  A no-match query without slash explains the full-id route. For a harness with
  Pi selected, Pi default removes the explicit model key; do not offer an
  unselected Pi adapter as fallback on a Claude-only harness.
- **R3 — Immediate save.** Selection closes the list and immediately saves only
  the model edit to `bots/<id>/bot.toml`, without saving unrelated unsaved
  edits. Preserve those edits in the panel draft. Compare disk with the last
  loaded version first; if it changed show conflict and keep draft/request
  rather than overwrite it. Writes for this editor are serialised. This is
  best-effort conflict detection, not an atomic cross-client compare-and-swap.
  A failed save is visible and not proof of a saved setting. Outside/Close
  dismissal without selection makes no write.
  Once a model save completes, neither an older read nor that save's own change
  echo reverts the saved model or shows a false conflict. The
  implementation mechanism is not prescribed.

- **R4 — Thinking.** Thinking choices are adapter-owned: Pi offers off, minimal,
  low, medium, high, xhigh, max; Claude offers low, medium, high, xhigh, max.
  Effective default is the bot schema's default. Thinking uses ordinary Save,
  not immediate model autosave. Selecting a model incompatible with the draft
  thinking level changes that draft to low, still requiring Save for thinking.
  Preserve absence of unchosen-adapter keys and choices.
  The shared model/thinking draft also honors R3's completed-model-save rule
  for older reads and that save's own change echo; thinking still
  uses ordinary Save.

- **R5 — Next turn and retained history.** New sessions use the saved bot model;
  same-engine changes apply on the next turn under adapter launch checks, not
  halfway through a reply. Incompatible engine continuation follows
  [sessions](sessions.md). A saved request can be refused at launch with the
  previous effective model/thinking retained; show the adapter's notice and
  never rewrite bot.toml to hide that refusal. Older sessions remain readable.

## Controls

Scope: `Model` region inside `Bot panel <id>` except the header entry. Stable
model ids disambiguate names, while friendly names remain visible.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Model and thinking | Conversation header; opens Model section. |
| region | Model | Bot panel; contains model and thinking settings. |
| button | Model | Opens list; expanded state; current name/id displayed nearby. |
| combobox | Search models | List query; expanded, controls Models list. |
| listbox | Models | Grouped options. |
| group | <provider-label> | Provider name, Claude Code or Anthropic API distinction visible. |
| option | <model-id> | Model full id, selected for current value; friendly name visible. |
| option | Use "<id>" | Trimmed custom full id, not a successful availability check. |
| option | Pi default | Pi-selected harness only; removes explicit model. |
| button | Close models | Dismisses picker without save. |
| button | off / minimal / low / medium / high / xhigh / max | Thinking chips individually named, pressed state; only applicable levels shown. |

## Edge cases

- **E1 — Unavailable model.** Missing login/model/context capacity is handled
  by the selected adapter, not by silently selecting another account. Choosing
  a custom id or clicking a model proves persistence only, not launch success.
- **E2 — Dirty file and external change.** Check saved bytes contain only model
  edit while draft retains other changes. If external bytes changed, resolve
  through shared Reload/Keep mine; selection itself is not overwrite consent.
- **E3 — Catalogue failure.** Do not call a failed registry read successful
  discovery. A custom id can still be entered; reopen/reload can retry discovery.
  No choice feature or shortcut is required to select a model.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Words span catalogue fields** | Models whose name, full id, provider id and group label contain different query words | Search with mixed case, tabs/newlines, reordered words, partial words, blanks or an absent word | Require every case-insensitive whitespace word within the combined R2 fields; words can be substrings, order is immaterial and blank matches the catalogue. Search results/custom ids prove neither login nor launch availability; adapter selection still limits the catalogue (R1, R2, E1). |
| **T2 — Same-engine next turn, not mid-reply** | Pi session idle-live, mid-reply with queued input, or no longer live; compatible available model/thinking | Save the bot request and send further input to that session | Apply same-engine changes on the next turn under native registry/login/capacity checks, without interrupting the current reply or losing queued input. Continue the same native session; a launch refusal retains previous effective model/thinking and visible notice without rewriting bot config. Thinking still uses ordinary Save (R4, R5; [engine Pi](engine-pi.md) R3; [sessions](sessions.md) R3, R6). |
| **T3 — Model-only save beside a dirty draft** | Loaded bot file with comments and unrelated draft edits, including typing during model autosave | Select a model/Pi default or issue rapid model selections | Save only the model edit against the loaded disk baseline; preserve unrelated draft edits without autosaving them. Preserve unrelated keys/comments where possible. Model-only persistence leaves no unsaved model edit, while remaining draft edits still require Save. Serialise this editor's writes; this is not cross-client CAS. Pi default removes the key only with Pi selected (R2–R4, E2; [config editors](config-editors.md) R2–R4). |
| **T4 — Failed write versus external conflict** | Dirty draft/request, a failed model write or a real external disk change | Select/retry, Reload or Keep mine | Failed Save stays visible and retains draft rather than claiming persistence. Compare disk first: an external change retains draft/request and conflict, not an overwrite. Reload takes observed bytes; Keep mine only acknowledges them and leaves draft dirty. A later model-only write changes only model on the acknowledged baseline, not unrelated external fields; ordinary Save still has replacement semantics (R3, E2; [config editors](config-editors.md) R4, E1). |
| **T5 — Stale read and own echo are not external edits** | Completed model save, with an older read pending or its own change echo and optional unrelated dirty draft | Release that older read or deliver the completed save's own change notification/load | Neither reverts the saved model nor creates a false conflict. Preserve unrelated draft edits/comments where possible. Genuine external edits still follow T4/conflict controls, not suppressed as own echoes (R3, R4, E2; [config editors](config-editors.md) R2, R4). |

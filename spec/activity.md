# Recent activity

Classification: Core. Prerequisites: [messaging](messaging.md), [shell](ui-shell.md), bridge log reads.

## Purpose

See the hand-offs between bots across conversations. This is a view of bridge
messages, not a general log of every tool execution, file edit or completed task.

## Required behaviour

- **R1 — Feed.** Recent activity opens a modal list populated by owner
  `GET /bridge-messages`, returning items, next cursor and total. Include bridge
  message entries, with id, ts, from/to bot/session,
  kind, raw text, delivered timestamp or null, and optional error. Order newest
  timestamp first by instant, then descending id for ties. Page 100; before
  cursor identifies timestamp/id and malformed cursor returns 400. Merge live
  messages and loaded pages by id without duplicate rows. Delivery is transport
  acknowledgement, never proof of model pickup or completed work.
- **R2 — List.** Group days in the viewer's local timezone, showing sender,
  recipient, local time and first nonempty preview line after hiding the incoming
  frame header. Show a task-looking id when present, but do not mutate a task
  record. Display failure indication with error detail. Scroll loads older
  pages and preserves selected row/scroll position through peek/back and newly
  arriving messages. Loading, empty and failed reads are distinct; Retry repeats
  the failed page request without discarding loaded rows.
- **R3 — Peek and jump.** Selecting a row peeks its full raw text, with safe
  explicit web links and no HTML execution. Back returns to the list position.
  Open in conversation checks the recipient session and jumps to a linked
  incoming message or failed/unknown incoming notice when targetable; otherwise
  opens the pair's Bot thread. Missing recipient session uses that bridge
  fallback; other API errors remain visible in the modal, not hidden as success.
- **R4 — New activity.** Store a seen timestamp locally per app profile/daemon
  origin. First successful feed initializes the checkpoint without declaring
  old items new. Opening snapshots the previous checkpoint for visible new
  markers, then acknowledges the newest observed item; closing acknowledges
  again. New badge is shown outside the open modal for items strictly newer
  than the checkpoint, not equal timestamps. This acknowledgement does not
  mark person sessions read or change bridge logs. Dismiss by Close/backdrop.

- **R5 — Offline CLI.** `myharness activity` reads local bridge logs without
  needing a daemon. `--since` defaults to `24h`, accepts nonnegative integer
  durations suffixed m/h/d or a real ISO date/date-time (optional seconds,
  fraction and offset); invalid calendar/time input is usage exit 2. `--bot`
  filters either endpoint by exact id; `--grep` is case-insensitive substring
  across message text, endpoint session ids and session titles. `--limit` is a
  positive integer, default 50: show most recent matches in chronological log
  order, grouped by local day with local time and endpoint id prefixes. Count
  all matching messages even when only some are shown. Default preview flattens
  whitespace and truncates after 100 characters, giving omitted count; `--full`
  prints whole message bodies without transport frame headers. Identify
  queued and not-delivered errors; a session footer counts all
  matches, using `(no session record)` for missing metadata. No matches prints
  count zero and can suggest a wider time window; success exits 0. This CLI's
  chronological bounded view is not the UI's descending cursor feed.

  If a suggested command is printed, copying it into a shell preserves each
  argument literally, including shell metacharacters and flag-like values. Hints stay optional; no quoting algorithm, exact suggestion text
  or wider time window is prescribed.

## Controls

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Recent activity | Sidebar; opens dialog of same name; New activity indication nearby. |
| dialog | Recent activity | Modal feed/peek. |
| button | Activity <message-id> | Feed row; sender, recipient, time, preview and New/failure visible. |
| region | Message text | Peeked raw message. |
| button | Back to activity list | Peek; restores list position. |
| button | Open in conversation | Peek; target or bridge fallback under R3. |
| button | Retry | Failed feed page; retries last request. |
| button | Close | Recent activity dialog; dismiss/acknowledge. |

## Edge cases

- **E1 — Equal timestamps and pagination.** Id tie-break prevents duplicate or
  lost rows at a page boundary. Repeated live notification for one id is one
  row. New badge remains timestamp-based; it is not a durable per-id inbox.
- **E2 — Missing target.** A bridge log survives session deletion; fallback must
  not create a recipient session or resend the message. A non-404 jump failure
  stays visible for retry rather than silently changing destination.
- **E3 — Fresh or failed feed.** Failed first load does not acknowledge unseen
  activity. No messages is valid only after a successful read. A new profile
  can initialize independently; this is not a daemon-wide read receipt.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Cursor boundaries and receipts** | Bridge message entries with timestamp ties, delivery updates and concurrent arrivals | Read 100-item owner pages and merge live notifications | Order by instant then descending id; use the timestamp/id cursor, reject malformed cursors with 400, and merge by id without duplicate/lost boundary rows. Delivery updates are not extra messages or proof of model pickup/completion (R1, E1). |
| **T2 — Raw peek, stable list and honest jump** | Loaded activity rows, a selected/scrolled row and a recipient that may be missing or untargetable | Peek/back, receive new activity, page/Retry or Open in conversation | Use viewer-local day/time and the first nonempty frame-hidden preview line with task-looking id/failure detail. Peek keeps full raw text with safe explicit web links. Preserve list position/selected identity through back/new arrivals; Retry retains loaded rows. Jump only to the targetable recipient message/notice, otherwise the pair bridge; 404 can fall back, other failures stay visible. Never create a recipient session, resend a message or mutate a task as fallback (R2, R3, E2; [ui shell](ui-shell.md) R3, R6). |
| **T3 — Seen time is not an inbox receipt** | Fresh/existing app profile and daemon origin, clock skew, equal-timestamp/live items and a failed first read | Open/close/return through pointer controls and receive activity | Initialize only after successful feed, without calling old items new. Snapshot the previous checkpoint for markers; opening/closing acknowledge newest observed time. Outside-modal New is timestamp-based: equal timestamps are not new and it is not a per-id inbox. Keep profiles/origins independent. Do not mark person sessions read or change bridge logs (R4, E1, E3). |
| **T4 — Offline filters and complete counts** | Local bridge logs across pairs, several sessions/titles per bot and more matches than the limit | Run `myharness activity` offline with filters, limit/full or help/invalid flags | R5 defaults of 24h/limit 50, exact endpoint bot and case-insensitive text/session-id/title grep, valid duration/ISO calendar input, chronological local-day view of newest matches. Count/footer cover all matches beyond shown limit; queued/error status is not model success. Preview flattens/truncates after 100 with omitted count; full hides transport headers. Zero is explicit, success 0/usage 2; help/parsing follow CLI without daemon startup (R5; [CLI](cli.md) R1, R2, R4, R5). |
| **T5 — Suggested arguments stay literal** | Optional suggested activity command with shell metacharacters, whitespace, quotes or flag-like argument values | Copy the printed suggestion into an isolated shell | If printed, preserve every argument literally, including grep text beginning with --; do not turn data into shell evaluation or a CLI flag. Hints remain optional and neither quoting algorithm, text nor window is pinned (R5; [CLI](cli.md) R2). |

# Search and find in thread

Classification: Core. Prerequisites: [shell](ui-shell.md), [sessions](sessions.md), selected transcript readers.

## Purpose

Find a past conversation across bots or locate literal text in the open thread.
Search is read-only; opening a result can mark that thread read under
[status](status.md), but does not send text or unarchive it.

## Required behaviour

- **R1 — Global search.** Search bots and threads replaces the normal sidebar
  with separate bot and thread results for a trimmed nonempty query. Bot name/id
  matching is case-insensitive substring. Thread search uses owner
  `GET /threads/search?q=<query>&offset=<n>`; at most 500 query characters,
  nonnegative safe-integer offset, else 400. Blank query yields empty threads,
  total/offset/unreadable zero. Clearing search restores normal navigation.
- **R2 — Thread matching.** Deduplicate lowercase whitespace-separated terms;
  every term must match the title or some searchable message in that thread,
  not necessarily the same message. Include soft-archived sessions; permanently
  tidied sessions outside the active store require restore first. Search the
  active native conversation branch, visible person text and attachment
  filenames, assistant replies, tool notes/results (and sent message text),
  visible incoming frames, errors and dividers. Do not index hidden transport
  framing as though the person typed it. Content is read through the session's
  original adapter, not whichever bot model is now chosen.
- **R3 — Results.** Rank all-title matches first, then descending title-term
  count, then newest last_turn-or-created by instant, then bot/id lexical ties.
  Page 100 results; return threads, total, offset and unreadable count. Include
  title, owner, timestamp and a whitespace-normalized content snippet near the
  first relevant hit (up to 160 characters, ellipses for truncation). A title-only
  hit can lack a snippet. An unreadable transcript still permits title matches
  and increments unreadable; report that count, not a complete-success claim.
  Changed/deleted files refresh search, not a stale perpetual cache.
- **R4 — UI loading.** Debounce typing and discard stale-query responses;
  loading/error/no-match/result count are distinct. Show more threads appends
  the next page without concurrent duplicate loads. Selecting a result opens
  its exact bot/session; do not substitute the newest session or send the query.
  A failure can be retried by changing/re-entering the query.
- **R5 — In-thread find.** Find in this thread opens the current conversation's
  search bar through a pointer control. Match a case-insensitive literal query,
  never regex syntax, over visible transcript text including Markdown text/code
  but not markup attributes or code-toolbar controls. Preserve formatted text;
  multi-node matches count once. Previous/Next wraps, highlights and scrolls
  the active match; show `n of total`, zero when none. Empty query clears marks,
  Close find restores ordinary conversation without editing it. Switching
  session clears the thread-local find state; dynamic replies refresh matches.
  Key bindings are neither required nor forbidden before the shortcuts choice ships.

## Controls

Search results use full bot/id names to disambiguate duplicate titles. The global
search tree replaces Bots and threads only while a query is nonempty.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| searchbox | Search bots and threads | Sidebar; maximum 500 characters. |
| tree | Search results | Global results, with selected row. |
| region | Bots search results / Threads search results | Individually named result groups. |
| treeitem | Bot <id> | Bot hit; select chat. |
| treeitem | Thread <bot>/<sid> | Thread hit; title/owner/time/snippet visible. |
| treeitem | Show more threads | More pages; disabled while loading. |
| button | Find in this thread | Conversation header; opens find bar. |
| search | Find in this thread | Open thread find bar. |
| searchbox | Find in this thread | Literal query within that bar. |
| button | Previous match / Next match | Find bar; disabled with zero matches. |
| button | Close find | Find bar; closes and clears highlights. |

## Edge cases

- **E1 — Literal and invisible data.** A query containing regex punctuation
  finds that literal text; Markdown tags/URL attributes do not create visible
  in-thread matches. Search does not execute content or fetch images.
- **E2 — Archived and broken.** A soft archive remains searchable without
  unarchiving on open. A broken native transcript is disclosed, with title
  matches retained. Empty metadata/transcript results need successful reads.
- **E3 — Races.** A deleted result yields a visible missing-session error;
  newer query responses cannot be replaced by late old results. A later new
  message can change ranking/count; pagination is not a frozen snapshot.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Literal terms, bounded query** | Titles/messages on multiple threads and a blank, duplicate-term, punctuation or invalid query | Search through the owner API and sidebar | Trim/deduplicate lowercase whitespace-separated terms and AND them across title/messages; punctuation stays literal. Blank query gives zero results/counts, not all threads. Overlong query or invalid offset is 400; sidebar clearing restores normal navigation (R1, R2). |
| **T2 — Visible projection, not storage syntax** | Incoming frames, skill invocations/arguments, attachments, errors and displayed sent-message text | Search their displayed text and hidden transport portions | Index the R2 visible fields/active native branch through the recorded adapter, including visible skill/person text, attachment filenames, errors and sent message text. Do not make hidden transport framing a person-text hit. A matching word in an actual visible body remains searchable (R2; [ui shell](ui-shell.md) R3, R8; [Library](library.md) R4). |
| **T3 — Rank and snippet use the actual text** | All-title, partial-title and content-only hits with tied instants and Unicode before a hit | Rank results and produce a snippet | All-title matches lead, then descending title-term count, parsed recency and bot/id lexical ties. A content snippet stays near the first relevant original-text hit, whitespace-normalized with R3 bound/ellipses; case normalization must not shift it away from the hit. Title-only hits can have no snippet (R3). |
| **T4 — Current, read-only pages and unreadable history** | Cross-bot/soft-archived sessions, changed/deleted files, a broken transcript and an unstarted native fork | Read pages, refresh after changes and open an exact result | Page 100 and report total/offset/unreadable; unreadable history keeps title matches without claiming complete success. Refresh changed/deleted data and use the original adapter/active history, including available unstarted fork history. Search is read-only; opening uses exact bot/UUID, does not send/unarchive, and a deleted result reports missing. Discard stale-query responses; pagination is not a frozen snapshot (Purpose, R1–R4, E2, E3; [branching](conversation-branching.md) E3). |
| **T5 — Find spans formatting and long content** | Current thread with formatted multi-node/code text, literal punctuation and distant matches | Use pointer Find/Previous/Next, then change reply/session or close find | Match visible literal text case-insensitively, never markup attributes or toolbar controls. Preserve formatting; one multi-node match counts once. Wrap active matches, show zero/disable movement for none, clear empty/closed/session-switched find state and refresh dynamic replies without editing conversation content (R5, E1, Controls). |

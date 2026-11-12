# Quoted annotations

Classification: Core. Prerequisites: [conversation shell](ui-shell.md), [turns](turns.md).

## Purpose

Point the bot at exact text and optionally explain the point. An annotation is
part of an outgoing person input, not an edit to the assistant reply, a new
system instruction or a persistent comment service.

## Required behaviour

- **R1 — Selection.** Annotate selection is available without a shortcut. Enable
  it for one nonempty eligible text range within one assistant reply (or an
  already-present post text surface), trimming surrounding whitespace. Reject
  ranges spanning multiple sources, toolbars/buttons or non-content text. Use
  rendered plain text, not Markdown source offsets; exclude scripts/styles and
  code toolbar text. Selecting the identical source/range reopens its existing
  annotation rather than duplicating it. Open an optional comment editor and
  show a numbered highlight/badge anchored to the selected text.
- **R2 — Draft lifecycle.** Annotations are scoped to bot/session in the current
  renderer, survive navigating away/back there, and are not guaranteed across
  renderer reload or app exit. Number in creation order from one; after removal
  renumber remaining items. A draft tray shows selected quotes/comments and
  edit/delete/clear actions. Save stores the optional comment in this draft;
  Cancel/outside dismissal closes the comment box without saving changed
  comment text, retaining the annotation (including an uncommented new one).
  Deleting/clearing annotations does not change transcript or send text.
- **R3 — Anchor.** Retain source entry id, selected text/range and the reply's
  time if present, as [reply details](reply-details.md) R2 shows it when the
  selection is made (time alone for today, otherwise with its date and, when R2
  adds it, the year), plus first four opening words (ellipsis when longer). If
  selected text repeats, retain its one-based occurrence and total count,
  plus up to 40 surrounding characters either side with the selection bracketed.
  Highlights follow layout/scroll but appear only while the source's text at
  those offsets still matches; do not move them onto unrelated text after a
  re-render. Post sources, when already present, retain post id/handle/URL/text
  instead of inventing a reply entry.
- **R4 — Outgoing representation.** For a new Send/Steer or follow-up, append a
  blank line and an `<annotations>` block after the person's right-trimmed text;
  annotation-only input is permitted. With no annotations leave text unchanged.
  The block has an explanatory preamble and numbered items: source reply time
  and opening (or post author/URL and quoted post text), then `Selected:` and
  the quoted whitespace-normalized selection. Repeated selections include
  occurrence/index/count and context; nonempty comments add `Comment:` and
  literal comment text. Close with `</annotations>`. Preserve source attribution
  and quote/comment distinction; do not reinterpret selected quotes as tool
  instructions or quietly change the message into a system prompt.
- **R5 — Acceptance and failure.** Serialize annotations into the durable
  outgoing input under [turns](turns.md), then remove only the submitted draft
  annotations when that input has entered its retained local/durable delivery
  lifecycle. A failed/unknown delivery remains recoverable in that input's
  notice/queue, not an automatic resubmission of annotations. Follow-up rejection
  before acceptance keeps the draft annotations. Editing an existing queue card
  does not append the separate current annotations. `/compact` with annotations
  is refused with draft kept under [compaction](compaction.md). Rendering the
  serialized person input is escaped text with visual quote/comment distinction.
  Key bindings are neither required nor forbidden before the shortcuts choice ships.

## Controls

Scope: current Conversation, tray `Annotations`, and dialog `Annotation <n>`.
Source selection uses real pointer text selection followed by the named button,
not a test-only selection API. Numbers are draft order, not stored message ids.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Annotate selection | Conversation; enabled only for eligible nonempty selection. |
| button | Annotation <n> | Highlight badge; opens matching comment. |
| dialog | Annotation <n> | Comment editor for that draft item. |
| textbox | Comment on annotation <n> | Multiline optional comment. |
| button | Save / Cancel / Delete annotation | Comment dialog; save draft comment, dismiss, or remove item. |
| region | Annotations | Draft tray with count/quotes/comments. |
| button | Edit annotation <n> / Delete annotation <n> | Tray row actions. |
| button | Clear all annotations | Tray; clears draft only, no transcript mutation. |

Send/Steer/queue controls remain owned by turns; no second annotation send button.

## Edge cases

- **E1 — No comment or message.** A quote without a comment still points at that
  text; annotations alone are valid person input. Empty/whitespace selection
  cannot create one. Cancel comment is not deletion.
- **E2 — Repeated and changed text.** Occurrence/context disambiguates identical
  phrases. An unrendered source may have a tray item without a badge; never
  re-anchor it by guessing another occurrence. Reload may lose unsent annotations.
- **E3 — Separate sessions.** Navigating to another bot/session does not send
  or carry the first thread's annotations there. Failure recovery follows the
  retained input, not a second new send with duplicated quotes.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Range identity, not toolbar text** | One eligible rendered reply/post text range or a cross-source/non-content selection | Pointer-select and press Annotate selection; repeat or re-render that source | Trim surrounding whitespace, exclude scripts/styles/toolbars and reject empty/cross-source ranges. Identical source/range reopens rather than duplicates. Keep the numbered badge on matching source offsets through layout changes; hide it rather than guess another occurrence when text no longer matches (R1, R3, E1, E2). |
| **T2 — A quote keeps its source** | Unique/repeated selected text, whitespace, dated/undated reply or already-present post | Create an annotation and inspect its anchor/outgoing attribution | Retain source id/range/text. Repeats retain one-based occurrence/total and up to 40 surrounding characters either side with selection bracketed. Reply naming uses first four words/ellipsis and time/date/year as reply-details R2 showed at selection; omit absent time. Existing posts retain id/handle/URL/text, not invented reply identity (R3; [reply details](reply-details.md) R2). |
| **T3 — Literal annotation input** | Typed text or annotation-only input, optional multiline comments | Send/Steer or create a follow-up, then render the serialized person input | After right-trimmed typed text and a blank line, use the R4 explanatory numbered <annotations> block with source, Selected: normalized quote, repeated occurrence/context and nonempty Comment: literal text. Annotation-only is valid; no annotations leaves text unchanged. Keep quote/comment distinction; display escaped text, not HTML/tool instructions or a system prompt (R4, R5, E1; [UI shell](ui-shell.md) R3). |
| **T4 — Renderer-scoped drafts and numbering** | Several draft annotations on one bot/session and another thread | Save/cancel/edit/remove/clear, navigate away/back, or submit input | Scope drafts to bot/session in this renderer, not guaranteed after reload/exit. Removal renumbers remaining items; saving only changes the draft comment. Cancel/outside close retains annotation without saving changed comment. Delete/clear do not send or edit transcript, and another thread gets none of this draft (R2, E1–E3). |
| **T5 — Clear only the submitted retained input** | Current annotations plus new input, queue edit, rejected follow-up or /compact | Submit, edit queued input, reject before acceptance or fail after retention | Serialize submitted annotations into retained outgoing input before clearing only that submitted draft set. Unknown/failed delivery recovers through its notice/queue, never auto-resends quotes. Rejection before acceptance and refused /compact retain drafts; editing a queue card does not append separate current annotations (R5; [turns](turns.md) R8; [compaction](compaction.md) R3). |

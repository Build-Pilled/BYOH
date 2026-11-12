# Callout boxes

Classification: Core. Prerequisites: [shell](ui-shell.md) safe text rules, [appearance mode](appearance-mode.md).

## Purpose

Let a model set a note, tip, warning and similar aside apart from the running
text of its answer, using the five alert markers that GitHub-style Markdown
already uses. This section owns recognizing and drawing a callout. It adds no
execution or loading ability: the [shell](ui-shell.md)'s safe-text rules (R3 to
R6) apply inside a callout without exception.

## Required behaviour

- **R1 — Recognition.** A Markdown block quote is a callout when its very first
  line is only `[!TYPE]`, where TYPE is `NOTE`, `TIP`, `IMPORTANT`, `WARNING` or
  `CAUTION` in any letter case, optionally followed by spaces or tabs. This
  applies to assistant replies and to incoming bot messages, which render as
  Markdown. Person messages are literal text and never form a callout.
- **R2 — What is not a callout.** These stay ordinary text or an ordinary
  quote, with their marker characters visible: an unknown type (`[!UNKNOWN]`),
  other text after the marker on its line (`[!NOTE] more`), a marker that is not
  the quote's first line, an escaped marker (`\[!NOTE]`), a marker outside a
  quote, and a marker inside a code block or inline code.
- **R3 — Drawing.** A callout shows its label in capitals (`NOTE`, `TIP`,
  `IMPORTANT`, `WARNING`, `CAUTION`), taken from the fixed list and never from the
  message, then its body. The marker line itself is not shown. The body is
  normal Markdown: paragraphs, emphasis, lists, links (including reference-style
  links defined elsewhere in the message), code and tables. A marker with
  nothing after it is a callout holding only its label. A callout may contain
  several paragraphs and another callout, and drawing never alters the stored text.
- **R4 — Distinguishable and legible.** The five types differ in accent colour
  and always say their type in words, so colour is never the only signal. In
  both dark and light mode the label text SHOULD meet a 4.5:1 contrast ratio
  against its own box background. Exact colours follow the chosen look
  ([appearance mode](appearance-mode.md) R5); a user's palette choice may not
  remove the label or the boundary of the box.
- **R5 — Safety unchanged.** Raw HTML in a callout is shown as text, never run.
  Links open only on an explicit click through the shell's link rules;
  non-local images stay inert with no fetch ([shell](ui-shell.md) R5); local
  images follow its denial list. Nothing in a message can add an attribute,
  class, script or handler to the box or choose its label. This is the shell's
  safe-rendering posture, restated so no callout feature weakens it.
- **R6 — Copy, find, export.** Copy on the message gives the original Markdown
  including the marker line. In-thread find matches the rendered text,
  including the label, without matching markup ([search](search.md)); global
  search matches the stored text. The [conversation export](conversation-export.md) choice,
  when selected, uses this section's recognition and keeps the source text.
- **R7 — Streaming.** While a reply streams, the visible block is the rendering
  of the text received so far, so a callout appears once its first line is
  complete and grows as text arrives. The finished message renders exactly as the
  same text delivered whole. Repeated rendering of the same text is stable.

## Controls

Callouts have no action or setting. They are scoped to the `Message
<entry-id>` region ([shell](ui-shell.md)).

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| note | NOTE / TIP / IMPORTANT / WARNING / CAUTION | One per callout, named by its label; contains the body. An ordinary quote is a `blockquote` with no label. |

## Edge cases

- **E1 — Case and spacing.** `[!tip]`, `[!Tip]` and `[!TIP]  ` all draw `TIP`.
  The marker must be the whole first line of the quote (R1).
- **E2 — Nesting.** A callout inside a callout draws as a box inside a box
  with its own label; neither alters the other's text.
- **E3 — Hostile body.** A body holding `<script>`, event-handler attributes,
  `javascript:` links, or an image address draws as inert text or an inert
  link and starts nothing; the label stays one of the five fixed words.
- **E4 — Unknown or half-typed marker while streaming.** Until the first line is
  complete (`> [!NO`) the quote is ordinary text; when it completes as a known
  marker it becomes a callout without duplicating the text.
- **E5 — Person text.** A person who types `> [!NOTE]` sees it literally in their
  own message; a model that quotes it back makes a callout only under R1.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Whole first-line marker** | Assistant/incoming bot Markdown with each known type, mixed case or near-miss markers; literal person text | Render the message | Recognize only the complete first quote line marker with optional trailing spaces/tabs. Use the fixed uppercase label and retain body Markdown/reference links. Unknown/escaped/outside-quote/code/late/extra-text markers stay ordinary with marker visible; person text stays literal (R1–R3, E1, E5). |
| **T2 — Nested, empty, streamed and hostile** | Empty/multiparagraph/nested callouts, partial streaming marker and hostile body | Append/render text repeatedly or deliver whole | Empty boxes retain label; nesting keeps independent labels and body boundaries. Streaming renders text received so far and finishes identically to whole delivery without duplicate/mutated text. HTML/handlers/unsafe links/remote images stay inert under shell policy, and content cannot choose a box attribute/class/label (R3–R5, R7, E2–E4). |
| **T3 — Source survives copy and chosen export** | A message containing callout markers, rendered labels and Markdown body | Copy/find, or export when conversation-export was selected | Copy keeps original Markdown markers; in-thread find searches rendered label/text, global search stored text. Selected export uses the same recognition and retains source under its own offline safety rules. Drawing never mutates stored text (R3, R6; [conversation export](conversation-export.md) R10). |

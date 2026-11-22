# Fixture

The sample data the frames show. Stage the same data in your build so each of
your pages lines up with its frame and the checks can compare them. Where a
frame shows more than is listed here, the frame wins. Timestamps and ages are
the only values that change from run to run; the checks mask them.

## Harness

- Display name shown in the frames: the sample harness's own name. Use the
  person's real display name in the built app; the frames only need the same
  text length class (one short word) in the title places.
- The window is 1280 x 795 CSS px at scale 2. The sample day is Nov 19; the
  sample week in the calendar is Nov 16 to Nov 22.

## Bots and crew

| Bot | Role | Description (shown in the team map and panel) | Lamp in the frames |
| --- | --- | --- | --- |
| Firstmate | Lead (LEAD badge) | Talks to the person and delegates. | Working while a reply streams, otherwise none |
| Bot Maker | Crew | Creates and tunes bots. | Unread |
| Code Reviewer | Crew | Reviews changes for correctness and clarity. | Waiting on a teammate |
| Plain | Not in a team (BOTS) | A simple bot for everyday questions. | Working |

Sidebar order: CREW (Firstmate, Bot Maker, Code Reviewer), BOTS (Plain). The
team map shows two columns, Crew (3) and Bots (1).

## Threads

- Firstmate has a folder `Reviews` (count 1) holding the routine session
  `Reading review` (tag ROUTINE, age 2M), and the sessions `Reading list plan`
  (selected, age 3M) and others; eight sessions in all, so the link reads
  `Show all 8 sessions`.
- Previews: Firstmate "The plan is ready."; Bot Maker "The bot is ready.";
  Code Reviewer "Ready for the outline."; Plain "Drafting the outline."
- Model label: `Opus 5.5`, the `API` tag, and `high` thinking. The header's
  All sessions label shows a count of 9.

## Conversation in `Reading list plan`

- Person (8:23 PM): "Help me plan a small reading list app."
- Assistant: heading "A clear path to a first version"; three paragraphs
  ("Start with a focused reading list: add a book, keep a short note, and mark
  it finished." "Keep the first version local and simple. We can add sharing
  after the core flow feels right." "Bot Maker can shape the implementation bot;
  Code Reviewer will check the changes before you ship."); one Important
  callout ("You choose the scope. I will bring decisions back to you before work
  expands.") and one Note callout ("A useful first milestone is one complete
  flow, not a long feature list."). Row under it: 8:23 PM, OPUS 5.5, 6.2k.
- The formatting guide session (frame F29): person "Show the message formatting
  guide."; assistant "The plan is ready. Message formatting", then a bare URL, an
  authored link, inline code (`readingList.add(book)`), a `text` code block of
  three lines, a table (Book, Progress; two rows), a task list (Add one book,
  Write a short note) and a Note callout "Keep notes brief."
- Tool pair (F33, F34): one step, the tool `bash` with a one-line command and
  its short result, "Worked for 0s, 1 step".
- Composer pair (F35, F36): placeholder "Message Firstmate"; the grown state
  holds 28 lines of text.
- Queue (F38): one queued message, "1." with its text.
- Annotation (F02): three annotations on the assistant text; the composer
  chip reads "3 annotations".

## Sent annotations (F56)

- Firstmate session `First version decisions`, selected; two sessions in all.
  Sidebar preview: "I will keep the next step focused." Other bots stay folded.
- Assistant reply, three numbered choices: "Storage: books stay on this device
  and no account is needed."; "Adding a book: you type the title. There's no
  cover search."; "Finished books: they move to a separate \"Done\" list."
- Person typed text: "Please keep these two choices." Append the R4 annotations
  block with its exact preamble. Both items cite that assistant reply's time
  and opening "Storage: books stay on…". Item 1 selects the whole Storage
  choice and comments "Keep this local-first approach." Item 2 selects the
  whole Adding a book choice and has no comment. No repeated-text suffix.
- Assistant reply after the sent input: "I will keep the next step focused."
- Scroll to keep the entire sent annotation bubble visible, with its top at
  y = 179 and closing tag visible. The three-choice reply is partly above the
  viewport; the follow-up reply and empty composer remain below the bubble.
  The bubble is at x = 578, width 672, height 434.375 CSS px. Source and send
  times are dynamic values masked by the checks.

## Tasks

| ID | Title | Kind | Status | Project | Gate |
| --- | --- | --- | --- | --- | --- |
| NOTES-1 | Keep project notes short | scout | done | notes | |
| READING-1 | Build the reading list | ship | underway | books | |
| READING-2 | Sketch the first screen | scout | queued | books | |
| READING-D1 | Pick a milestone | decision | blocked | books | captain |

Footer "4 of 4 tasks"; header "4 tasks, 3 open, 2 projects". Dates are the
sample day.

## Other pages

- Routines (F46): one weekly routine on the Firstmate bot, `Reading review`,
  at 02:30; a completed run and one upcoming run are visible in the week.
- Recent activity (F44): one message from Code Reviewer to Plain, "Please draft
  the outline.", at 20:23, with the day heading "TODAY - NOV 19" and the
  divider "NEW SINCE YOU LAST LOOKED".
- Changes (F49): a short history of instruction edits, newest first, with kinds
  `external` and `user`, one carrying the `prompt` pill; the selected change
  shows a diff of a few lines.
- Sidebar search (F10): the query `code` over the sample bots and threads. Bots
  lists Code Reviewer. Threads lists "Project outline" (Plain, a two-line
  snippet starting with the Code Reviewer message) and the active "Reading list
  plan" (Firstmate, a three-line snippet cut with `…`). Status line "2 of 2
  matching threads".
- Skills & MCP (F06): one shared skill and one MCP server file.
- Settings (F23): Appearance selected, with three theme cards.

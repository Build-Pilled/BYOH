# Conversation export

Classification: Choice (conversation export). Prerequisites: the Electron desktop app ([shell](ui-shell.md)), [callouts](callouts.md), [appearance mode](appearance-mode.md) and the chosen [look](look-and-palette.md).

## Purpose

Let the person keep a conversation as one file they can open in any browser
without the harness: a self-contained, inert HTML archive. The person can trim
the archive in the browser and save the part they want as Markdown or as a
smaller archive. This section owns the Save button, the file's contents and the
archive page. Rendering of Markdown, links and images follows the
[shell](ui-shell.md), except host-path links (R8); the file adds no ability to
run, load or fetch anything.

## Required behaviour

- **R1 — The choice.** By default the Save button is
  present. "Go with the default" is offered. The interview asks one
  question: "Add a Save button that exports a conversation as a file you can open
  in any browser?", default yes. The answer is recorded in the interview record
  that [onboarding](onboarding.md) owns. When the choice is not made there is no Save
  button and no export of any kind.
- **R2 — Entry.** In the conversation header, immediately left of All sessions,
  the Save button exports the open conversation's stored transcript. It is
  disabled while no conversation is open and while an export is running. The
  export is a snapshot of persisted messages; a reply still streaming is not in it.
  There is no daemon route, CLI command or keyboard shortcut for export in release one.
- **R3 — What the file holds.** The messages the person would call the chat: their
  own messages, the bot's final replies and messages that arrive from other bots,
  routines or incident notices, in conversation order, with each message's role,
  stored time and attached images. It holds no tool calls, tool results, Worked
  groups, compaction records or error rows. The original text of each kept
  message, its time and the recorded model of each reply travel in the file as a
  data block that is not a script, so a trimmed copy needs nothing else.
- **R4 — Writing.** The app writes the file to the Mac's Downloads folder with no
  dialog. The name is `<bot>-<title>-<date>.html`, where each part is the bot's
  display name, the session title and the export date (the UTC calendar date), after
  NFKC normalisation, each run of characters other than letters, digits, `_` and
  `-` replaced by one `-`, leading and trailing `-` removed, cut to at most 60
  characters and 70 UTF-8 bytes, and `conversation` if nothing is left. The name
  never contains a path separator.
- **R5 — Create only.** A save never replaces, appends to or follows anything that
  already exists. If the name is taken by a file, a directory or a symbolic link
  (a dangling one too), the writer tries the same name with `-1`, `-2` and so on
  before `.html`; the existing entry keeps every byte and its target. Saves that
  run at the same moment get different names. The writer accepts a request only
  from the app's trusted main frame at the paired daemon's origin
  ([shell](ui-shell.md) R7), only a name of 1 to 200 letters, digits, `_` and `-`,
  and only content that begins with `<!doctype html>`; anything else is refused and
  creates nothing. A failed save leaves no file under the final name.
- **R6 — The person is told.** While saving, Save shows busy. Success shows a
  status "Saved to Downloads" and, when some images could not be included, " (n
  images not included)". Failure shows "Save failed: " and the reason. The status
  goes away by itself after about five seconds.
- **R7 — Self-contained.** Opening the file needs no network and no harness. The
  styles, fonts and images are inside it as data. It refers to nothing external to
  load: no external script, stylesheet, font, image, frame, form target or base address.
  Its own content policy allows data images and fonts, inline styles, the archive's
  own fixed program (R8, R10) and nothing else: no connections, no frames and no
  base address.
- **R8 — Inert.** Nothing in the conversation can run, load or navigate when the file
  is opened. Raw HTML in a message is shown as text. Links with unsafe schemes are
  inert text, `file:` included, since a host path means nothing on the machine
  that opens the file; paths the app links on display
  ([ui-shell](ui-shell.md) R9) stay plain text; web links open only on a click.
  An image is only ever an image element with a data address, an SVG included:
  never inline SVG, an object or a frame. The
  data block cannot be closed early by its own content. The one script on the page
  is the archive's own fixed program (R10); the content policy allows that program
  and no other script, so injected scripts and event handlers do not run. Nothing
  the app uses to authenticate (the owner token, request headers) is in the file.
- **R9 — Saving fetches nothing.** Creating the file makes no request to any origin
  but the paired daemon, which the app asks only for the transcript, the image
  routes, the models list and its own stylesheet and fonts. An image in a message is embedded only when it is
  already local: an attached image, a data address, or an absolute path or `file:`
  address that [shell](ui-shell.md) R4 allows under the harness home. A remote
  image (`http` or `https`) is not fetched; a refused, missing, unreadable or
  unsupported image is not embedded either. Each such image appears as
  `[image not included]` in the page and the Markdown, and the original Markdown
  with its original reference stays in the data block: fetching a remote
  image while saving would let a message shaped by injected content send data out
  through the image address, just as [shell](ui-shell.md) R5 rules out at display
  time.
- **R10 — The archive page.** The page always uses the light variant of the chosen
  look and the app's fonts and Markdown rendering, including callouts and code
  blocks whose Copy code works offline. A thin bar stays at the top with the
  title (one line, ellipsis when long, full title as its tooltip) and, in small
  type beneath it, the bot and the export date. Four buttons sit on its right and
  wrap under the title on a narrow window without sideways scrolling. Every message
  starts selected with its own checkbox; unselected messages dim. Select all and
  Select none set every checkbox. Save as Markdown downloads the selected messages'
  original Markdown, not converted HTML, as `<file name>.md`: a title line, the bot
  and date, then for each message a heading as in R11 and its source. Save as HTML
  downloads a copy holding only the selected messages, with the same page, controls,
  light variant and headings, which can be trimmed again. The downloads are made by
  the browser, which chooses their place and avoids replacing files.
- **R11 — Headings and times.** A message heading reads `<Name> • <Model> • <time>`.
  For a bot's reply, Name is its display name and Model is the recorded model's name,
  on every reply that records one, even when the previous reply used the same model
  (unlike the live [reply details](reply-details.md), so a trimmed archive keeps it);
  a reply with no recorded model omits that part, never guessing from the bot's
  current setting. A message from another bot or a routine shows the sender label the
  app shows, with no model. The person's own heading reads `You • <time>`. The
  time, and the export date in the bar, read like `24th Oct 2026, 9:01 PM`: an
  ordinal day (1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 23rd), a three-letter
  month, the year, a 12-hour clock with an unpadded hour and `AM` or `PM`, in the
  Mac's local time at save. These texts are fixed at save: reopening or trimming
  in another time zone does not change them. The original stored times stay in the
  data block.
- **R12 — The person's own messages.** A person's message shows as literal text, with
  any annotations it carried drawn as the app draws them, the surrounding wording
  faint and the quoted text and comments at full contrast ([annotations](annotations.md)).
  Attached files show by name only. This changes how the message looks, not what it says.

## Controls

The first two rows belong to the app; the rest are in the exported page, where
the same role and exact-name rule applies. The Copy code button's role and name are
the shell's.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Save | Conversation header, left of All sessions; exports the open conversation; busy while saving; disabled with no conversation. |
| status | Saved to Downloads / Save failed: `<reason>` | Beside Save in the header; the R6 text, with the image count when it applies. |
| button | Select all / Select none | Archive bar; set or clear every message checkbox. |
| button | Save as Markdown / Save as HTML | Archive bar; downloads the selected messages (R10). |
| checkbox | `<heading>` | Archive; one per message, named by its R11 heading, checked at the start. |
| button | Copy code | Within a code block of the archive; copies its literal code. |

## Edge cases

- **E1 — Empty conversation.** A conversation with no chat messages still saves an
  archive with the bar and no messages, and its Save as Markdown gives the title
  block alone.
- **E2 — Name taken.** Saving twice on one day gives `...-<date>.html` and
  `...-<date>-1.html`. A symbolic link or a directory with the first name is left as
  it was and the file is written under the next name.
- **E3 — Downloads problem.** A missing, unwritable or full Downloads folder shows
  Save failed with its reason, creates nothing under the final name and leaves the
  conversation as it was. A missing Downloads folder that can be created is created.
- **E4 — Images.** A remote image, a path outside the harness home, a path under a
  denied location (`.git`, `secrets/`), a missing file and an unsupported type all
  give `[image not included]` and are counted in the status; the other images are
  embedded and the save succeeds.
- **E5 — Hostile conversation.** A conversation holding script tags, event-handler
  attributes, `javascript:` and `data:` links, an SVG with a script, a message that
  contains the end of the data block, and a remote image address opens in a browser
  with no script of its own running, no navigation and no request, and the address
  never receives a request at save time either.
- **E6 — Trimming twice.** Trimming to Save as HTML and then trimming that file again
  keeps the same page, the same headings and only the chosen messages.
- **E7 — Another zone or browser.** Opening the file after a time-zone change shows the
  saved texts. The page works from `file:` in current Chrome, Firefox and Safari;
  the Linux test host can run the first two and a WebKit stand-in, and cannot
  stand in for Safari.
- **E8 — Declined.** Without this choice, the header has no Save and nothing named
  here exists; the other header buttons keep their names.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Persisted chat, original source** | Export chosen; conversation contains person/final replies, incoming bot/routine/incident messages, tools and a streaming reply | Save the open conversation, then inspect the inert data and kept message order | Keep persisted chat roles/original text/stored times/recorded reply models/images in conversation order; omit tool calls/results/Worked/compaction/errors and unfinished streaming reply. Person/annotation text remains literal and source survives trimming; missing model is not inferred from current config (R2, R3, R8, R11, R12). |
| **T2 — Trusted create-only Downloads writer** | Existing file/directory/symlink including dangling link at candidate name, concurrent exports and untrusted sender | Save with long/Unicode/path-like names or invoke the writer from another frame/window/origin | Use R4 NFKC/safe-part/60-character/70-byte/UTC-date naming and R5 accepted name/doctype bounds. Trusted main frame only; no overwrite/append/follow even in a race, use numbered suffixes and preserve existing entries/targets. Bad request or failed save creates no final file; report R6 success/failure (R4–R6, E2, E3; [ui shell](ui-shell.md) R7). |
| **T3 — Local images only, inert resources** | Supported local/data/allowed home-path images plus remote, missing, denied or unsupported images; optional SVG data | Save and inspect embeds, original source and network sink | Fetch only R9 permitted paired-daemon resources, never remote images. Valid local images may be embedded as data image elements, SVG never inline/object/frame or active code. Each refused image yields image-not-included placeholder/count while original Markdown reference remains in inert data; other valid images still save (R7–R9, E4, E5; [ui shell](ui-shell.md) R4, R5). |
| **T4 — Hostile Markdown and data cannot activate** | Raw HTML, nested link-child HTML, unsafe/file/data links, host paths and data-block closing text in messages/title/meta | Build/open offline archive and follow only explicit allowed web links | Preserve allowed Markdown formatting/callouts/code and literal source, escaping hostile HTML/link children. Unsafe/file links and host paths are inert; content cannot break out of its data block. Only fixed archive program executes under content policy, no injected handler/script/navigation/network, no owner token/headers (R7–R10, E5; [callouts](callouts.md) R7). |
| **T5 — Thin light archive, selected source downloads** | Chosen look/fonts, long title, annotated person text, code and several messages | Open at wide/narrow widths, select/clear and save selected Markdown/HTML twice | Use light chosen look/app fonts/Markdown, a thin sticky title/meta bar and four right-side controls wrapping without sideways scroll; title ellipsizes with full tooltip. All messages start selected, unselected dim. Markdown retains chosen original sources/headings; HTML retains same page/controls and can trim again. Person scaffold faint/quote-comment full contrast, attachments by name; Copy code offline (R10–R12, E1, E6). |
| **T6 — Headings frozen at export time** | Replies with repeated/different/missing recorded models, incoming sender and person messages, ordinal-day/noon/midnight boundaries | Save, reopen in another zone and trim | Each recorded reply model appears on every such heading, never guessed for missing model or attached to person/incoming sender. Freeze R11 local ordinal/three-letter-month/12-hour AM-PM texts for headings/bar at save; original stored times remain in inert data. UTC filename date still follows R4 (R3, R4, R11, E7). |

# Conversation shell and safe content

Classification: Core. Prerequisites: owner-authenticated daemon, [home](home.md) and Electron app.

## Purpose

Provide the person's conversation window on the Mac, connected to the isolated
Linux host. The interview-selected display name is not a command or path name.
This section owns navigation and content safety; [turns](turns.md),
[settings](settings.md), [tools](tools.md), [search](search.md) and
[config-editors](config-editors.md) own their specialised controls.

## Required behaviour

- **R1 — Shell.** Show a persistent bot/thread sidebar, conversation header and
  transcript/composer area. Group bots by team with the lead first, and put
  unteamed bots in Bots. The Bot threads sidebar section represents bridges, not person sessions;
  each row opens its pair directly. Its header + opens Connect two bots, also
  available in the top New (+) menu.
  Selecting a bot opens its chat; selecting a session opens that exact UUID.
  On an unselected home route prefer the first team's lead, else the first bot.
  With no bots show a welcome/empty state and New bot, not a fake conversation.
  Show configuration problems with paths/reasons and distinguish loading from
  unreachable or rejected authentication. The app never starts the live daemon.
- **R2 — Navigation.** Expand/collapse bot sessions and sidebar sections with
  observable expanded states. Keep the active bot/session identifiable. New
  offers bot, team and bridge creation plus a session for the current bot.
  New bot asks Id, Name and Description and uses [bots](bots.md)'s creation
  rules, including id validation and create-only duplicate refusal. Preserve
  every byte of an existing bot directory; two independent same-id dialogs
  cannot replace it. This data-safety rule
  governs the dialog without freezing a new API; blank/cancelled Id does not
  write. New session creates a person session
  and opens it; folder creation and session row menus belong to
  [session organization](session-organization.md). Bot actions offer config,
  routines, skills/notes, team move and identity/path copy. Do not duplicate
  team membership or bridge permission rules here.
- **R3 — Text.** Render assistant Markdown with paragraphs, emphasis, headings,
  lists, tables, blockquotes, links and fenced code. Raw HTML is displayed as
  text, never executed; code is escaped and Copy code copies code text only.
  Person input remains literal text, with annotation structure styled without
  interpreting it as HTML. The same safety policy covers stored, streaming,
  bridge and preview content; syntax highlighting/find cannot reactivate markup.
  [Callouts](callouts.md) owns callout-specific semantics, not a safety exception.
- **R4 — Images.** Authenticated inline local raster images accept absolute host
  paths or local `file:` URLs, mapped through `GET /images/local?path=<encoded>`.
  Resolve real paths within the selected harness home and allow only regular
  PNG, JPEG (.jpg/.jpeg), GIF and WebP files. Deny the narrow image path set:
  `.git` and the credential directory `secrets/` with their descendants, plus
  bin/ and companion/ if present. Match these names case-insensitively on
  compatibility-normalized lexical and canonical paths, so symlink and other
  alias paths to them are denied. The wider [file policy](config-editors.md)
  for daemon-owned paths (bot sessions, bridge log, log/) does not apply here:
  an image a bot saves in its session work directory renders. Refuse
  out-of-home, denied-path, symlink escapes, missing files and other types with
  404 and no image bytes.
  Responses identify the raster MIME, use nosniff and no-store. Stored native
  image attachments use their authenticated session image route. Images may
  open a dismissible enlarged view, not an executable file handler.
- **R5 — No display-time egress.** Non-local/network image sources are inert:
  show alt text and the URL as plain text, without a fetch or load-image action.
  This is a data-safety rule: an
  auto-fetched image URL is a channel out of the harness; a bot misled by
  injected content could encode data in its query string and leak it merely
  by being displayed. Local images under the denied credential and repository
  paths are refused for the same safety boundary. Do not turn relative image
  URLs into automatic API requests.
  More generally, displaying content makes no content-directed outbound request:
  no automatic cards, post enrichment, previews, embeds or remote favicons.
  Post URLs remain visible text with explicit links; no load-post action is
  added. This rule does not block the
  authenticated reads from the paired daemon needed to show conversations or safe images.
- **R6 — Links and files.** HTTP(S) links open the system browser only on an
  explicit click, never navigate the app window to another origin. Other
  external schemes do not invoke a program. A local file link refers to the
  host, not the Mac: open through the connected VS Code Remote-SSH window;
  if needed open that host's VS Code connection and wait up to 60 seconds.
  Confine requested host paths lexically to harness home; accept only empty or
  localhost file authorities, reject traversal, encoded separators/NUL,
  controls, backslashes and paths over 4096 characters. Copy path copies the
  absolute host path without opening it. Pending/success/failure is visible;
  no Mac-local open or shell execution fallback. A missing editor is not proof
  a path opened.
- **R7 — App boundary.** Renderer has no Node integration, is sandboxed and
  context-isolated. Native operations accept only the trusted top-level app
  sender at the paired daemon origin; reject other frames/origins. Owner
  authorization is added only for that origin, never external links/images.
  [App pairing](app-pairing.md) owns pairing/reconnect, not a renderer bypass.
  Closing a window does not delete sessions or stop the host daemon; the
  [window behaviour](window-behaviour.md) choice, when made, decides whether
  closing hides the app or quits it. Key
  bindings are neither required nor forbidden before the shortcuts choice ships.

- **R8 — Attachments and suggestions.** Attach files opens the native file
  chooser; pointer drop and paste may add the same explicit person-selected
  files. Recognize PNG/JPEG/GIF/WebP as images, maximum 10 MiB each; other
  files maximum 25 MiB each. Show names/previews and Remove actions in the
  draft; reject oversize/read failures visibly and wait for reads before send.
  Image inputs go through the engine image mechanism; other files are uploaded
  to this session's attachments directory with a basename, using a numeric
  suffix instead of replacing an existing filename, and their host paths enter
  the person input. Merely previewing/removing is not a send. Typing a leading
  `/skill:` offers discovered skills (including manual ones); selecting a
  suggestion inserts its command into the composer, not an immediate run.
  [Skills & MCP](skills-mcp.md) owns expansion. Transcript Copy copies literal message
  text. Worked groups and individual tool results can expand to show notes,
  arguments/results and failures without executing them; find may expose them.
- **R9 — Host paths become links.** In assistant Markdown (R3), stored or
  streaming, a host path in prose or inline code becomes a file link when it
  starts with the harness home written absolutely, or with `~/`, is not
  preceded by a letter, digit, `_`, `/` or `~`, and R6 would open it; any other
  path stays text. Person input, tool arguments and results, previews and raw
  HTML shown as text stay literal (R3). Detection runs on the rendered text: a
  path runs to white space, `<`, `>`, `"`, `'` or a backtick; then its last
  character is removed, repeatedly, while it is `.`, `,`, `;`, `:`, `!` or `?`,
  or one of `)`, `]`, `}` with fewer matching openers than closers in the path.
  The link text is the path as written. The destination is `file://` and the
  absolute path, `~/` expanded to the bot user's home; `/` separates segments,
  and in each segment every character except A to Z, a to z, 0 to 9 and `-`,
  `_`, `.`, `!`, `~`, `*`, `'`, `(`, `)` is percent-encoded as UTF-8. A click
  opens it as R6 says. A path inside an authored link or a fenced or indented
  code block stays unchanged. Linking happens only on display: copied text
  keeps the path, and an export carries no `file:` link
  ([conversation export](conversation-export.md) R8).

## Controls

Names with ids disambiguate equal display names. Shared menus/dialogs have the
listed dismissal controls; pointer use never depends on a shortcut. Repeated
bot controls are scoped to `Bot <id>`, conversations to `Conversation <bot>/<sid>`.
The time, Model and Context details of a message belong to [reply details](reply-details.md),
its Fork button to [conversation branching](conversation-branching.md), a callout
in its text to [callouts](callouts.md) and, when that choice is made, the header
Save button to [conversation export](conversation-export.md).

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| tree | Bots and threads | Normal sidebar hierarchy, active/expanded rows. |
| region | Bot <id> | Bot row and its actions. |
| treeitem | Bot <id> | Select bot; selected/expanded state; display name remains visible. |
| button | Show sessions / Hide sessions | Bot row; toggles session expansion. |
| button | <section-name> | Sidebar section heading; expanded state, including Bots and team names; Bot threads is messaging-owned. |
| button | Connect two bots | + on the Bot threads section heading; opens the messaging-owned dialog. |
| button | New | Top +; opens menu New. |
| menu | New | Creation destinations; dismiss by outside click. |
| menuitem | New bot | Opens dialog New bot. |
| menuitem | New team | Opens Team map; team-map owns creation. |
| menuitem | Connect two bots | Messaging-owned connection dialog. |
| menuitem | New session with <id> | Current bot only. |
| button | New bot | Bots section; same dialog. |
| dialog | New bot | Id, Name, Description, OK, Cancel. |
| textbox | Id / Name / Description | Individually named fields within New bot. |
| button | OK / Cancel | New bot dialog; create or dismiss. |
| button | New session | Bot row; creates and opens a person session. |
| button | Actions for <id> | Bot row; opens menu of same name. |
| menu | Actions for <id> | Dismiss by outside click; Mark as read owned by status. |
| menuitem | New session / Edit configuration / Routines / Skills & notes | Bot actions; open corresponding surface. |
| menuitem | Move to team | Bot actions; team-map owns its dialog. |
| menuitem | Open in VS Code / Copy path / Copy bot id | Bot actions; host directory or stable id. |
| button | Configuration | Header; expanded when bot panel open. Mark is decorative, not a second unlabeled entry. |
| button | Prompt | Header; opens exact assembled prompt dialog. |
| dialog | Prompt | Read-only assembled prompt; Close dismisses. |
| button | Close | Prompt dialog only. |
| region | Conversation <bot>/<sid> | Actual selected transcript and composer, not an arbitrary newest session. |
| region | Message <entry-id> | Stable transcript message scope; source identity, not display text. |
| button | Copy | Message scope; copies literal message text and reports Copied. |
| button | Worked <n> | Conversation step group; expanded state, visible timing/count/failure. |
| button | Tool result <n> | Within Worked group; expanded state, tool name/arguments/result visible. |
| button | Attach files | Composer; native file chooser. |
| button | Remove <filename> | Draft attachment scope Attachment <n>; removes only that draft file. |
| listbox | Skills | Composer leading `/skill:` suggestions. |
| option | /skill:<name> | Skills list; selected suggestion; manual state/description visible. |
| button | Copy code | Within region Code block <n> of a message; copies literal code, reports Copied. |
| region | Code block <n> | Numbered within a message, with language/line count. |
| link | <link-text> | Visible link text, including host paths linked under R9; R6 constrains destination handling. |
| button | View image <n> | Within a message or draft attachment scope; opens dialog Image. |
| dialog | Image | Enlarged image; button Close image or backdrop dismisses. |
| button | Close image | Image dialog; no file opening. |
| menu | Image actions | Enlarged-image context menu; outside dismissal. |
| menuitem | Copy | Image actions; copies loaded raster, reports Copied or error, never executes a file. |

## Edge cases

- **E1 — Empty and offline.** An empty successful bot list is distinct from a
  failed read; no send target is invented. Existing stored conversations remain
  after reconnect. Surface errors instead of asserting a successful save/send.
- **E2 — Malicious content.** HTML event handlers, scripts, code-fence markup,
  dangerous link schemes and SVG cannot execute in renderer or native shell.
  Remote images and post-card URLs make no content-directed outbound requests,
  even in streaming content; HTML embeds and remote favicon URLs stay inert.
  A `.png` fixture under `.git` or `secrets/`, in different letter case, and a
  symlink alias to it return no bytes; a `.png` in a session work directory
  renders.
- **E3 — Host path failure.** No connected editor, invalid file URL or timeout
  gives a visible error. Later queued opens also fail after a connection timeout
  rather than repeatedly opening Mac windows. UI evidence on Linux does not
  prove real Mac browser/VS Code integration.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — A link is not display-time authority** | Stored or streaming content contains web links, scripts, dangerous schemes or script-created opens | Display it; separately click an HTTP(S) link | Displaying content causes no content-directed egress or execution. Only an explicit HTTP(S) click opens the system browser, never a foreign page inside the app; other external schemes invoke no program (R3, R5, R6, E2). |
| **T2 — Host open is not a Mac handler** | Valid home-contained host paths/file URLs and malformed, traversal or outside-home targets | Open a target; separately Copy path for a valid host path | Open only through connected host VS Code, with R6 lexical containment/authority/encoding/length guards. Missing editor or timeout is visible failure, not successful opening or a Mac/shell fallback; later queued opens fail after connection timeout. Copy path copies the absolute host path without opening it (R6, E3; [app pairing](app-pairing.md) R9). |
| **T3 — Trusted frame, exact paired origin** | Trusted app top-level frame, same-origin second window/subframe, foreign or gone frame | Request a supported native operation or navigate/redirect to another origin | Only the trusted top-level app sender at the paired origin gets native operations. Keep sandbox/context isolation and no Node integration; refuse foreign navigation, keep the token out of the renderer and do not add owner authorization to other origins. Recovery copies use the owner daemon route, not a new Mac file IPC (R7; [app pairing](app-pairing.md) R4, R8; [turns](turns.md) R8). |
| **T4 — Connection failures do not start another harness** | Host connection/forward is up; target daemon/token is missing, invalid, refused or valid; a decoy local harness is reachable | Launch/retry the app and replace its own pairing token through the person-run line | Distinguish app-pairing R5 states; never start the live daemon, discover a Mac harness home or borrow a decoy token/address. A failed pairing copy preserves the working token and removes its temporary copy; unacceptable token permissions are reported, not auto-repaired. Only the paired origin receives authorization (R1, E1; [app pairing](app-pairing.md) R1–R5). |
| **T5 — Auto-links are display-only host paths** | Assistant prose/inline code includes home paths and punctuation; other roles, authored links and code blocks contain the same text | Render stored/streaming content, click a generated link, copy or export when selected | Only R9-eligible paths that R6 would open become links. Keep balanced brackets inside, repeated trailing punctuation/unmatched closers outside, and segment-encode the destination while preserving link text. Leave authored links/code blocks and excluded contexts unchanged; copied text keeps the path and exports add no file link (R3, R6, R9; [conversation export](conversation-export.md) R8). |

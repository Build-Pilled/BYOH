# Look and palette

Classification: Choice (look and palette). Prerequisites: [appearance mode](appearance-mode.md), the Electron app ([shell](ui-shell.md)).

## Purpose

Let the person decide how their harness looks: the colours of its two variants
(dark and light). This is the one place the
interview asks about aesthetics, using mockups before the person sees their
finished app. [Appearance mode](appearance-mode.md) owns the System,
Dark and Light selector, which every harness has whether or not this choice is
made; this section owns what those modes look like. [Status](status.md),
[callouts](callouts.md) and [conversation export](conversation-export.md) own
their own meaning and only borrow the colours defined here.

## Required behaviour

- **R1 — The choice.** The default-look option is named Instrument; R3
  defines its colours and the fixed mockup shows what that name means. "Go with the
  default" is always offered and is the all-defaults path. The interview
  opens on page two of Lavish with a few starting palette options, the default
  option named Instrument first, each shown as a mockup of the same fixed app
  shell. Never assume the person knows that name: whenever the agent offers
  it, name it as an option and show its mockup visual alongside it. The person reacts and adds
  ideas; the agent shows more mockups along what they like, repeating until
  they accept a palette. The accepted palette is the answer, then the setup
  agent builds it. These are never screenshots of the person's app: that app
  is not shown until onboarding `first-use`.

  BYOH ships the fixed [shell mockup page](assets/look-mockup.html), with the
  R3 colour roles as CSS variables for dark and light variants. Look proposals
  change only those colours, not layout, text or controls, so the mockups match
  the shell the agent builds. The fixed page changes with the app layout; use
  its same shell for each proposal rather than inventing different layouts
  for different palettes. It is a colour preview, not a working harness.
  Keep the other page-two choices as plain questions on the same Lavish page.
  If Lavish cannot be served, questions fall back to chat, but the person must
  explicitly accept the default-look option named Instrument alongside its
  fixed mockup visual or wait for Lavish before choosing a custom look. If no
  visual can be presented in chat, wait for Lavish; never substitute screenshots
  of their app. The answer is recorded in
  the interview record that [onboarding](onboarding.md) owns and is applied to the person's app. It adds no
  field to `myharness.toml` and no daemon route: `theme` stays an unknown field
  to `myharness validate`; like the mode, a look is not a field in the harness
  configuration ([appearance mode](appearance-mode.md) E3).
- **R2 — What a look may change.** A look is a **palette**: one colour for each
  role in the R3 table, in two variants (dark and light). It changes colour only. It may not rename, remove, reorder or
  restate any control, state or text, hide a status or callout label, or change
  what a control does. The accessibility tree of the app is the same under every
  palette.
- **R3 — The default look.** The option named Instrument is the default,
  pictured in the [fixed mockup](assets/look-mockup.html):
  an opaque display, a darker or lighter chassis, orange backlit primary
  controls, square status lights and monospace labels. Its role colours are:

  | Role | Dark | Light |
  | --- | --- | --- |
  | Display (page background) | `#000000` | `#f4f4f2` |
  | Chassis (sidebar and header surfaces) | `#1a1a1a` | `#cfd0d2` |
  | Text | `#f2f2f2` | `#111111` |
  | Muted text (captions, timestamps) | `#9a9a9a` | `#4c4c4c` |
  | Accent (primary control) | `#ff5a1f` | `#ff5a1f` |
  | Accent text (links, badges) | `#ff7a45` | `#c2410c` |
  | Status: working | `#f9e2af` | `#df8e1d` |
  | Status: waiting on a teammate | `#6aa8ff` | `#2563eb` |
  | Status: unread | `#4ade80` | `#16a34a` |
  | Status: needs attention | `#ff2d2d` | `#dc2626` |
  | Callout: note, tip, important, warning, caution | `#4a9bc2`, `#6cc3a0`, `#f2a96b`, `#f1bd59`, `#e46f8a` | the same five hues; only the label text is deepened (callouts R4) |

  The default typefaces are Literata for text and Recursive Mono Linear for code,
  both bundled with their SIL Open Font Licence texts, with a system
  monospace stack for labels. This section claims no font file exists until the
  asset task lands it. Status lights do not pulse.
- **R4 — Modes stay core.** A palette supplies the two variants and nothing
  else decides which one shows: System, Dark and Light pick the variant exactly
  as [appearance mode](appearance-mode.md) R2 to R4 say. The three buttons, their
  names and their pressed states are unchanged under every palette. Release one
  adds no palette picker; a palette is part of the app, and changing it later
  is a change to the app that the person's agent makes and installs with the
  app-build flow ([app build](app-build.md)). Installing a new palette neither
  clears the person's saved mode nor touches conversations or bot configuration.
- **R5 — Legible.** In each variant, text and muted text meet a 4.5:1 contrast
  ratio against both the display and the chassis. Accent text SHOULD meet 4.5:1
  against the display. The default meets the first requirement in both variants.
- **R6 — Still readable as states.** In each variant the four status colours
  are pairwise different; the
  five callout accents are pairwise different. Neither replaces the words that
  [status](status.md) R1 and [callouts](callouts.md) R4 require, and a palette
  may not remove a callout's boundary.
- **R7 — Whole app, light archive.** The palette applies to everything the app
  draws: sidebar, conversation, dialogs, menus, Settings, code, callouts and
  status lights. The [conversation export](conversation-export.md) archive always
  uses the light variant.
- **R8 — Nothing fetched, nothing read.** A look is bundled with the app. Drawing
  it makes no request to any origin but the paired daemon's: no remote
  stylesheet, font, image, icon or script. The app does not read a look asset
  from a path chosen at run time. An absent bundled font falls back to the
  system stack and shows no error.
- **R9 — Identity unchanged.** A palette does not alter a bot's mark: its shapes
  and colour order depend only on the mark seed ([bots](bots.md) R5).

## Controls

Not applicable; this section owns no control. The System, Dark and Light buttons
belong to [appearance mode](appearance-mode.md) and the Settings frame to
[settings](settings.md). Under a palette those controls keep their exact names.

## Edge cases

- **E1 — All defaults.** A harness built with "go with the default" shows the R3
  colours in both emulated schemes and nothing else; no look field, file or
  prompt appears anywhere.
- **E2 — Palette rejected.** A proposed palette that fails R5, or whose status
  colours are not pairwise different, is not applied; the agent revises it and
  the person sees the result before accepting. Rejection changes nothing already
  installed.
- **E3 — Declined.** A harness without this choice has the default look and all
  three mode buttons; declining removes no core control ([appearance
  mode](appearance-mode.md) E4).
- **E4 — Changing later.** Installing a changed palette keeps the saved mode of
  the app profile (appearance mode R4) and reopens on the same conversation.
  Nothing is written to the daemon or to conversations.
- **E5 — Missing font.** If a bundled font fails to load, text is drawn in the
  system stack, layout stays usable, and no request goes out to find another.
- **E6 — Mockups and the Mac display.** Lavish mockups select colours, not proof
  that the person's app renders them correctly. App screenshots on the Linux
  test host remain the agent's own proof until onboarding `first-use`; neither
  they nor mockups prove how the Mac's display profile or real appearance
  setting shows the built app. Present that check at `first-use`; it stays
  `mac-pending` until answered.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Default callout accents keep their role in both variants** | Default Instrument look, all five callouts, dark and light modes | Render each role and inspect actual colour/label/boundary | The five R3 hues map to note/tip/important/warning/caution in both default variants; light deepens label text as callouts R4, not the accent identity. Preserve distinct roles, words and boundaries; a chosen alternative palette still follows R2/R5/R6, not private brand-variable names (R3, R6, R7). |
| **T2 — Theme is not harness configuration** | Otherwise valid disposable home, regardless of chosen/default look | Add theme = "dark" to myharness.toml and run myharness validate | Report unknown field theme at that file, exit1, no new look config/daemon route. Removing it restores valid config; the core System/Dark/Light selector and interview palette answer remain their own contracts (R1, R4; [home](home.md) R4). |

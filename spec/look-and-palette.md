# Look and palette

Classification: Choice (look and palette). Prerequisites: [appearance mode](appearance-mode.md), the Electron app ([shell](ui-shell.md)).

## Purpose

Let the person decide how their harness looks: the colours, typefaces,
motion, corner radius, rule/shadow strength and bot-mark drawing of its two variants (dark and light). This is the
one place the interview asks about aesthetics, using screenshots and mockups
before the person sees their finished app. [Appearance mode](appearance-mode.md) owns the System,
Dark and Light selector, which every harness has whether or not this choice is
made; this section owns what those modes look like. [Status](status.md),
[callouts](callouts.md) and [conversation export](conversation-export.md) own
their own meaning and only borrow the colours defined here.

## Required behaviour

- **R1 — The choice.** The default-look option is named Instrument; R3
  defines its colours. The [screenshot gallery](../screenshots/README.md)
  shows the default look with the four starter bots in real app views,
  including [dark](../screenshots/hero.png) and
  [light](../screenshots/main-chat-light.png) conversations. "Go with the
  default" is always offered and is the all-defaults path. The interview
  opens on page two of Lavish with four look options in fixed order:
  **Instrument, Lab, Dusk, Paper**. Use the [choice-page template](../ui-specifications/choice/index.html):
  every look has a full live UI sample in the same shell (switch it in place)
  and a row with both palettes, type specimens and the four starter marks.
  Instrument starts selected and also shows its gallery screenshots, including
  dark and light, at full content width with their aspect ratios kept and named
  full-size links. The live sample also has a named full-size link.
  Match system / Dark / Light and Still / Motion let the person compare both
  variants and any motion; reduced motion disables Motion. Viewing a look does
  not choose it. Choose or the row's radio accepts it; Ask for changes invites
  revision. “Something else?” offers describe-your-own only: no Mix and no
  per-row Preview button. The three published look descriptions and decided
  token sets are in [Lab](../ui-specifications/look/lab/README.md),
  [Dusk](../ui-specifications/look/dusk/README.md) and
  [Paper](../ui-specifications/look/paper/README.md). Their brief is that nothing
  should annoy someone using the harness every day for 90 days.
  Before sharing any page or revision, follow [onboarding](onboarding.md) R3's
  script and real-browser click checks, including image loading and full-size
  opening. Never assume the person knows Instrument: always name the option
  and show its gallery pictures alongside it. The person reacts and adds
  ideas; the agent shows more mockups along what they like, repeating until
  they accept a look. The accepted look is the answer, then the setup
  agent builds it. The gallery and mockups never show the person's app: that app
  is not shown until onboarding `first-use`.

  BYOH ships the fixed [shell mockup page](assets/look-mockup.html), with the
  complete look tokens (including R3 roles) from the [UI pack](../ui-specifications/README.md),
  with the same layout values and token files used by the live stage and built
  app. Look proposals may change colours, typefaces, motion, corner radius,
  rule/shadow strength and how bot marks are drawn, not layout, text or controls, so the mockups match the shell
  the agent builds. When a look includes motion, a short recording or animated
  preview may accompany its still mockups. The fixed page changes with the app
  layout; use its same shell for each proposal rather than inventing different layouts
  for different looks. It is a look preview, not a working harness.
  Keep the other page-two choices as plain questions on the same Lavish page.
  If Lavish cannot be served, questions fall back to chat, but the person must
  explicitly accept the default-look option named Instrument alongside its
  gallery screenshots or wait for Lavish before choosing a custom look. If no
  visual can be presented in chat, wait for Lavish; never substitute screenshots
  of their app. The answer is recorded in
  the interview record that [onboarding](onboarding.md) owns and is applied to the person's app. It adds no
  field to `myharness.toml` and no daemon route: `theme` stays an unknown field
  to `myharness validate`; like the mode, a look is not a field in the harness
  configuration ([appearance mode](appearance-mode.md) E3).
- **R2 — What a look may change.** A look is a **palette** (one colour for each
  role in the R3 table, in two variants, dark and light) plus optional typefaces,
  motion, corner radius, rule/shadow strength and bot-mark drawing. Radius and
  rule/shadow strength are paint only: they must move no box. All element
  rectangles, padding, spacing, font sizes, line heights and border widths stay
  fixed as the [layout contract](../ui-specifications/layout/shell.md) specifies.
  Rules may vary as inset shadows, never by changing border widths. A look is a
  complete named token set in the pack schema, not only the R3 role table.
  It may not rename, remove, reorder or
  restate any control, state or text, hide a status or callout label, or change
  what a control does. The accessibility tree of the app is the same under every
  look.
- **R3 — The default look.** The option named Instrument is the default,
  pictured in the [screenshot gallery](../screenshots/README.md):
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

  For Instrument only, the typefaces are Literata for text and Recursive Mono
  Linear for code, both bundled with their SIL Open Font Licence texts, with a system
  monospace stack for labels. The [bundled files and licence texts](../ui-specifications/choice/fonts/README.md)
  are shared with the mockup and choice page. Instrument status lights do not pulse.
- **R4 — Modes stay core.** A palette supplies the two variants and nothing
  else decides which one shows: System, Dark and Light pick the variant exactly
  as [appearance mode](appearance-mode.md) R2 to R4 say. The three buttons, their
  names and their pressed states are unchanged under every palette. Release one
  adds no look picker; a look is part of the app, and changing it later
  is a change to the app that the person's agent makes and installs with the
  app-build flow ([app build](app-build.md)). Installing a new look neither
  clears the person's saved mode nor touches conversations or bot configuration.
- **R5 — Legible.** In both variants, faint text reaches 3:1 and every other
  text, including muted, link, badge and callout inks, reaches 4.5:1 on its
  effective background at every size and weight. New looks, including user-
  invented looks, have no exceptions. Instrument remains exact: only the named
  Instrument-only faint pairs in [C4](../ui-specifications/checks/c4-contrast.md)
  are exceptions; they do not carry over to another look or another pair.
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
  system stack and shows no error. Any look's fonts are bundled under an open
  licence, with their licence texts.
- **R9 — Identity unchanged.** The mark seed still determines which mark a bot
  gets ([bots](bots.md) R5). A look may change how marks are drawn and animated,
  including drawing them as animated characters, provided each bot stays
  recognisable and distinct.
- **R10 — Reduced motion.** Any motion respects the operating system's
  reduced-motion setting.

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
- **E4 — Changing later.** Installing a changed look keeps the saved mode of
  the app profile (appearance mode R4) and reopens on the same conversation.
  Nothing is written to the daemon or to conversations.
- **E5 — Missing font.** If a bundled font fails to load, text is drawn in the
  system stack, layout stays usable, and no request goes out to find another.
- **E6 — Mockups and the Mac display.** Lavish mockups select a look
  (colour, type, radius, rule/shadow strength, motion and marks), not proof that the person's app renders it
  correctly. App screenshots on the Linux test host remain the agent's own proof until onboarding `first-use`; neither
  they nor mockups prove how the Mac's display profile or real appearance
  setting shows the built app. Present that check at `first-use`; it stays
  `mac-pending` until answered.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Default callout accents keep their role in both variants** | Default Instrument look, all five callouts, dark and light modes | Render each role and inspect actual colour/label/boundary | The five R3 hues map to note/tip/important/warning/caution in both default variants; light deepens label text as callouts R4, not the accent identity. Preserve distinct roles, words and boundaries; a chosen alternative palette still follows R2/R5/R6, not private brand-variable names (R3, R6, R7). |
| **T2 — Theme is not harness configuration** | Otherwise valid disposable home, regardless of chosen/default look | Add theme = "dark" to myharness.toml and run myharness validate | Report unknown field theme at that file, exit1, no new look config/daemon route. Removing it restores valid config; the core System/Dark/Light selector and interview look answer remain their own contracts (R1, R4; [home](home.md) R4). |

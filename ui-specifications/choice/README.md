# Look choice template

This is a static page for the page-two look question, not a harness and not a
look picker installed in the app. Serve the repository root over local HTTP,
then open `ui-specifications/choice/index.html` (for example, with an agent's
local static server forwarded through the interview port). File URLs do not
support the module's JSON fetches. No CDN or outside request is used at runtime.

- Fixed order: Instrument, Lab, Dusk, Paper. Instrument starts selected.
- The four tabs (or keys 1–4 outside text fields) change the full live sample,
  not the selected answer. Choose or a row's radio selects the answer.
- Every row shows both palettes, real type specimens and all four starter marks.
  Instrument also has the two full-width gallery pictures, with full-size links.
- Match system / Dark / Light resolves only the preview's mode. Still / Motion
  controls motion; reduced motion disables Motion. Dusk animates only the working
  sample mark and working-state row specimens; idle sample marks rest.
- The full-size link opens the same scene alone at its current look and mode.
- Something else? is describe-your-own only. There is no Mix or per-row Preview.
- Ask for changes opens a local note. No request is sent. Controls stay mounted across comparison/selection: radio
  keyboard focus and even collapsed revision drafts remain intact. A serving agent may
  use the page's values or bind the `look-choice` and `look-request` document
  events (detail `{look}` and `{look, text}`), or use its interview tool's native
  annotation. It records the accepted answer in the existing interview record.
  Neither choosing nor viewing writes a config, storage or daemon setting.
- Replace the template progress header with onboarding R10's current progress
  line, add the other page-two questions and the interview's save/continue flow.
  They remain the agent's interview, not a new endpoint in this page.

## One paint source

`load.js` reads each `../look/<name>/tokens.json`. It exposes every colour as a
CSS custom property with the same name, plus font, radius, inset-rule and motion
parameters, plus the seven presentation settings. Shared renderers in
`stage.css` interpret them; icon glyphs come from the bundled official sets.
All sessions opens a floating-surface sample inside the same fixed shell. The app must use these same token files, not sample pixel colours
or a second hand-copied palette. Instrument's colour tokens are unchanged;
its documented font, radius and mark defaults are adapted by the loader.

`app.js` builds one fixed scene. `load.js` also reads `../layout/layout.json`;
sidebar/header geometry, reply/callout width, lead-row position, composer dock
and send position are taken from pack variants. The condensed five-callout
conversation is a specimen, not a reproduction of a particular long transcript
frame. Text sizes and line heights are fixed across looks; typefaces and paint
vary. `stage.css` holds the shared parts and specimen arrangement, not palettes.

[`spec/assets/look-mockup.html`](../../spec/assets/look-mockup.html) is the second
entry point to exactly these modules and styles, not another mockup engine.
Query parameters: `look=instrument|lab|dusk|paper`, `mode=system|dark|light`,
`motion=still|motion`; `stage=1` shows the live scene alone. The app, stage and
mockup all consume the same named paint; these preview controls add no app UI.

[Fonts and licences](fonts/README.md). [Icons and licences](icons/README.md). [Visual completion checks](../checks/README.md).

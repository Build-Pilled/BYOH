# Checks

Five runnable checks tell the setup agent whether its build matches this folder.
Run them through the [verification kit](../../verify/README.md) against the real
isolated app, for the person's chosen look, including a newly invented look.
The suite remains the authority for behaviour; these checks gate appearance
and layout. No new conformance cases are needed to run them.

| Check | Question |
| --- | --- |
| [C1](c1-layer-purity.md) | Does the look stylesheet touch only paint? |
| [C2](c2-look-swap.md) | Does a token swap preserve layout and the accessibility tree? |
| [C3](c3-reference-match.md) | Does the build match the frames, layout and chosen paint? |
| [C4](c4-contrast.md) | Is text legible, with distinguishable states? |
| [C5](c5-marks-only.md) | Distinct marks with unchanged seeded geometry? |

## Run

Start the kit and app as described in its command reference. Write an external
`ui-plan.mjs` and mapping JSON for this build, then run:

```sh
node verify/kit.mjs ui-check /absolute/ui-plan.mjs --run /absolute/kit-run --evidence /absolute/new-ui-evidence
```

The evidence directory must not exist. The command returns 0 only when all
checks pass; otherwise 1. It leaves the isolated app up for inspection and
repair. After the drive, use `kit down` normally. Never point this at a live app.

A plan is an ES module exporting a default object. Paths in it are absolute (or
relative to the invoking working directory), not relative to the module. It is
trusted staging code, like a suite scenario, and must not read live user data.
The kit supplies the window `w`, and `kit` in the staging context. Use real
role/name driver actions, or the isolated instance's CLI/API, to reach states.
`w.eval` is for read-only capture, never for changing a page. Swap tokens using
this build's token-loading mechanism; no permanent look picker is required.
A state must be settled, with finite animations at their end state, before its
callback returns. Reduced motion remains a spec requirement, not a C5 step.

This is a **partial example**, not a completion plan:

```js
import { readFileSync } from 'node:fs';
const map = JSON.parse(readFileSync('/absolute/ui-map.json', 'utf8'));
export default {
  tokens: '/absolute/chosen-look/tokens.json',
  stylesheets: ['/absolute/built/chosen-look.css'],
  pages: [{
    id: 'conversation-idle',
    frame: 'F35-composer-before.png',
    nodes: map.conversation,
    async stage(w, { look, mode, kit }) {
      // Use this build's token loader to select look, preserving the same build.
      // Stage layout/fixture.md, then drive this state with w.click/fill/key.
      await w.waitFor('textbox', 'Message');
    },
    masks: [], // CSS-pixel rectangles {x,y,width,height}, clock text only
  }],
  async mark(w, { look, mode, seed, kit }) {
    // Stage this look and seed (0..199) at 88x88, using this build's controls.
    return { role: 'image', name: 'Bot mark', cells: '[data-check-cell]' };
  },
};
```

`stylesheets` lists the actual compiled **look layer**, including its font rules,
not the shared layout stylesheet. C1 lints every listed file; screenshots and
computed paint must come from that same build/layer. Font files must be loaded
from the app's bundled assets. The seven presentation settings are prescribed, not aesthetically checked.

### Mapping

The mapping links pack semantic roles to the build's own accessibility roles
and exact names. One target must match. An entry looks like:

```json
{
  "conversation": [
    {"layout":"display", "role":"main", "name":"Conversation"},
    {"layout":"composer", "role":"textbox", "name":"Message"},
    {"layout":"timestamp", "selector":"[data-check-selected-age]", "exception":"Selected-row age"}
  ]
}
```

Names above are illustrative: use the names required by the spec. `in` can
narrow an accessible target, e.g. `"in":{"role":"dialog","name":"Settings"}`.
For a region with no accessible role/name, supply an explicit mapping to one
ID or data attribute (`#message-region` or `[data-check-region="composer"]`).
These are the build's own identifiers, never source DOM classes. No fixed
`data-role` instrumentation is required. `layout` names a key in
`layout/layout.json`; the role's tolerance class and Instrument paint mapping
come from the pack, not from values the agent measures from its own build.
Repeat entries for repeated instances: every fixed rectangle recorded for
that frame must have a matching measured instance. Map text-bearing subparts
separately where their paint or family differs from their container.

Optional `font` selects a family block (`body`, `label`, `code`, `ui`, `person`
or `data`) in a non-default look. Otherwise the Instrument family's semantic
class selects body, label or code. System-family defaults use the platform's
system family; bundled families are checked against Chromium's rendered-font
read, not just a CSS declaration. An explicit `exception` names exactly one
C4 faint exception on that mapped surface. It is not a wildcard: mode, effective
foreground and background must also match exactly. Review these assignments
against the named surfaces in C4; do not label arbitrary text as an exception.

The mark callback returns an accessible tile target and a `cells` data-attribute
selector. It maps 36 cell containers inside the tile, in row-major order. Their
measured boxes must make an equal 6x6 grid with no overflow; drawing may change
inside a cell. The screenshot's occupied-cell pattern is compared across looks.
The wrappers need not appear in the accessibility tree.

## Completion rule

Setup is not done until every page passes. Include every frame's fixture state
and every text-only variation in the sheets: hovered and focused controls,
selected rows, open menus/dialogs, disabled states and other documented paint
states. Each variation is another page entry, with a distinct `id` and the
corresponding `frame`. List them in the plan's `variations` array as
`{"page":"<id>","kind":"hover|focus|selected|open"}`; a full run requires at least
one page of each kind, and the report records the coverage. The checker automatically runs each entry in dark and
light and with Instrument and chosen tokens. Keep the same content and DOM
between token swaps; do not edit an accessibility snapshot to make it equal.

The agent checks the plan's state coverage against the sheets; automatic coverage
checks require all 29 frame filenames and the mapped frame rectangles, but
cannot infer that a callback really opened the intended menu. Inspect the
screenshots and state names as well as the numbers. Never claim coverage of
an unstaged state.

The command sets a 1280 x 795 CSS-pixel viewport at device scale 2. It compares
Instrument screenshots with the pack, masks only clock-produced text, requires
fixed layout within 2 px, and checks colours and rendered fonts for the chosen
look. C2 adds the permitted font-width/flow tolerance classes, not arbitrary
layout drift. Fix failures and run into a **new** evidence directory.

Show the person `report.md`, including each page's pass/fail and screenshots.
A failing page blocks setup; never report setup done on a failed or sample run.
`result.json` has `pass` and `complete` separately. `--sample` runs a subset for
kit development only and always writes `complete:false`; it is not a way to
finish setup. In sample mode only, `plan.reference` may supply miniature
`layout` and `roles` records and a page's `frame` may name a fixture PNG path.
A normal run always uses this pack's frames and values.

## Evidence and proof fixture

Each run holds `report.md`, `result.json` (check, page/state, mode, measurement,
threshold and pass), PNG screenshots, measured rectangles/computed paint,
rendered-font reads, accessibility snapshots and hashes, contrast pairs and 200 mark tiles per mode/look with grid measurements. For text over images, gradients or frosted layers, C4 captures effective
background PNGs by masking only that element's text ink with a transient
inspector stylesheet, then restoring it in finally. It measures the minimum
contrast across the text rectangles. Geometry, backgrounds and text behind
frosting stay intact. Filter/blend effects remain unsupported and fail
explicitly rather than silently passing unmeasured text.

The kit includes a deliberately correct and incorrect miniature app to prove
assertion-level acceptance/rejection without a generated harness:

```sh
node verify/test/ui-checks.mjs --evidence /absolute/new-proof --electron /absolute/pinned/electron
```

Run under the pinned Node version with a disposable HOME. It starts and stops
only its own Electron/Xvfb processes. This is a kit proof fixture, not a permanent
behavioural conformance case and not a test of a person's generated harness.

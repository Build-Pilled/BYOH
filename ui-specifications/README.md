# UI specifications

This folder is for your agent, not for reading end to end. It holds everything
needed to build the harness's app screens so they come out the same size and
shape as the polished default, in any look.

## The contract

- **Layout is fixed.** Every element's size, position, spacing, border width,
  text size and line height, text case, parts, states and behaviour are the same
  in every look. They are in `layout/`.
- **Look is swappable.** Colours, typefaces, motion, corner radius, rule and
  shadow strength, and how bot marks are drawn are paint. They are in a look
  folder. `look/instrument/` is the default look, written in the same token
  schema every look uses; `look-template/` is the empty skeleton for another.
- **A look never moves a box.** A look may change anything that moves no
  element's rectangle. If a change would alter any rectangle, it is layout and
  is not allowed in a look. [layout/shell.md](layout/shell.md) lists the split.
- **Colours and type in the frames belong to one look only.** The pictures in
  `frames/` show the Instrument look. Use them for geometry. Take colours and
  type for a non-default look from that look's tokens, never from a picture.

## What is where

| Path | What it holds | Open it when |
| --- | --- | --- |
| `layout/shell.md` | Regions, sizes, spacing, top-strip rule, z-order, scrolling | You start any screen |
| `layout/components.md` | Parts, sizes, padding, gaps and states of every component | You build a component |
| `layout/behaviours.md` | Trigger, change, numbers and before/after pairs | A control moves or resizes something |
| `layout/type-scale.md` | Size, line height, weight class, text case per role | You set any text |
| `layout/layout.json` | The same numbers per role, machine-readable, with tolerance class | You measure or check |
| `layout/fixture.md` | The sample conversation, bots and tasks the frames show | You stage states to compare |
| `look/instrument/tokens.md`, `tokens.json`, `tokens.css` | Every colour by token name, both modes, fonts, motion | You paint |
| `look/instrument/roles.json` | Paint per role, every colour as a token name | You paint a role |
| `look/instrument/marks.md` | How marks are built, and how Instrument draws them | You build bot marks |
| `look/lab/`, `look/dusk/`, `look/paper/` | Published ideas, decided tokens, mark styles, both modes | You paint an alternative |
| `choice/` | Live choice-page template, shared stage and bundled fonts/licences | You present the look question |
| `look-template/` | Empty token skeleton, ranges and derivation rules | You make another look |
| `frames/` | 29 dark screenshots with a one-line index | You need to see a layout |
| `checks/` | Five checks with exact procedures and thresholds | You verify a build |

## How to use it

1. Read `layout/shell.md`, then open only the component and frame you need.
2. Build the layout from the numbers. Paint it from the chosen look's tokens.
3. Screenshot every page of your own build at 1280 by 795 CSS px, scale 2, and
   run the checks. The completion rule is in [checks/README.md](checks/README.md).

Frame index: [frames/index.md](frames/index.md). Values are CSS pixels at a
1280 by 795 window unless a line says otherwise.

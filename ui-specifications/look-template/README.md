# Look template

The empty token skeleton for a new look. A look is a complete token set: copy
`tokens.json`, fill every required token for both modes, and add the fonts, motion
and mark-style values, plus seven presentation settings driven by one coherent
design philosophy. The shipped Lab, Dusk and Paper sets are complete examples. A look supplies tokens only; it never restyles a
component and never touches a size, spacing, display, position or text case.

Files:

- `tokens.json`: every token name of `look/instrument/tokens.json`, with the
  group, the allowed range, and empty values, plus optional derived strip and card-shadow tokens.
- `derivation.md`: how to derive the surface ladder, text steps, rules, status,
  callout and mark colours from a ground, an accent and a hue family.
- `ranges.md`: the allowed range of each group.

Steps:

1. Choose a ground colour for each mode and an accent with its ink.
2. Derive a per-look ladder using the starting points in `derivation.md`.
3. Choose a status hue family and a callout hue family; derive bar, edge,
   background and ink for each kind.
4. Choose fonts (open licence, bundled with their licence text), motion
   (none, functional or alive), the mark-style block and the seven presentation settings below.
5. Render the look, then run the checks in `checks/`.

The optional `faint-wrapper` override is used only for the sent annotation
wrapper. Omit it to use the look's existing `text-faint` value; Lab, Dusk and
Paper do so. If supplied, fill both modes. It must meet 3:1 against the person
bubble in either case. Instrument alone keeps its measured exact-pair C4
exception; never copy that exception or its low-contrast values to another look.

## Parameter blocks

The filled Lab, Dusk and Paper files define every block in the skeleton:

- `fonts`: body, label and code stacks; optional ui, person and data stacks;
  metric overrides, weights within the fixed role classes, tracking and
  OpenType features. Sizes, line heights and text case are layout, not fonts.
- `radius`: `control`, `card`, `callout`, in CSS px, 0–16.
- `ruleStrength`: inset widths `region`, `control`, `card`; `calloutEdge` alpha;
  `glow` and `personShadow` strength; `composerAccent` inset width and
  `primaryTexture` (0–1). These never set a border width or change a rectangle.
- `motion`: preset, duration scale, hover/arrival durations in ms, easing and
  press scale. None has zero durations; alive adds working-state mark motion.
- `markStyle`: shape, drawing gap and cell radius at 32 px, tile radius, nine
  palette token names, multi/single ink (the single ink is a token name), idle
  and working presets and duration in ms. All drawing scales inside the box.

A look's `description` supplies optional choice-page captions; it is not app
wording or a substitute for complete tokens. Instrument's existing file is
colour-only; its documented font/mark defaults are adapted by the shared page
loader without changing any default colour value.

## Seven presentation settings

A look supplies `presentation` values; shared component renderers interpret
those values. The look layer still contains root parameters only, not component
selectors. Every value is paint inside the existing boxes. No aesthetic check
verifies these seven choices; functional/layout checks and C4 contrast remain.

| Setting | Allowed values | Instrument default (unchanged) |
| --- | --- | --- |
| `icons` | `family`, `style`, `artboard`, `fallback`; named open-licence family/style, only used glyphs from an official release bundled with licence text | Pack line glyphs, 24 grid, 1.6 stroke, round caps/joins |
| `statusShape` | `square`, `circle`, `ring`, `diamond` | Square, 1.5 px radius, 8 px glow in status colour |
| `callout` | `barTint`, `headerStrip`, `fullTint`, `sideBar`, `outline` | `barTint`: 4 px bar, kind tint, 1 px edge at .45 |
| `surface` | `inFlow`: `bezel`, `flatTone`, `raisedSoft`, `page`; `floating`: `glassBezel`, `flatEdge`, `frosted`, `sheet`; `floatingBlur` in px | `bezel`: plate, 1.5 px inset rule, top highlight; `glassBezel`: glass .62 and rule, no blur |
| `button` | `key`, `outlined`, `filledSoft`, `underlined` | `key`: filled keycap, accent glow, top light and bottom shade; secondary rule and underside |
| `selection` | `selected`: `fillOutline`, `sideBar`, `fill`, `underline`; `hover`: `fill`, `toneStep`, `underline` | Selected raised fill/rule/underside, translucent hover fill |
| `tag` | `outlined`, `plate`, `pill`, `text` | Outlined accent-ink chip |

The Instrument token file and frames stay byte-identical. Its new defaults are
adapted by `choice/presentation.js`, like its existing font/mark defaults.
The existing shared sample remains the visual authority, not a new rendering
of this descriptive table.

### Build without moving a box

- Icons use currentColor inside the fixed icon box. Scale artwork via viewBox,
  never the surrounding box. Bundle glyphs, not a whole unused icon family.
- Status lamps remain 8 x 8 and tags retain their existing 18 px box. Draw a
  diamond with clip-path, never rotate its box. Draw a ring with inset shadow.
- Bars, rings and underlines use box-shadow, outline or text-decoration, never
  border widths. Existing borders and the 4 px callout bar retain their widths;
  paint them transparent when unused. A callout keeps a visible boundary:
  bar, tint edge or outline. Callout labels stay visible; status words stay in accessible names,
  never as visible captions beside the lamps.
- A header strip is a background gradient with a 28 px stop, not an extra
  laid-out element. A uniform frame can use outline with offset -1 px.
- Frosted glass blurs a ::before layer behind the content, never the container
  holding fixed popovers. It must not re-anchor a fixed descendant.
- Shadows are paint. Accept clipping at scroll edges; do not add padding.
- Reduced motion still disables motion; it is prescribed, not checked by C5.

# C4 Contrast and floors

**Question.** Is every text legible, and are states told apart?

**Procedure.**

1. Pair check from tokens, in each mode: `text`, `text-muted` and `text-faint`
   against `display` and `chassis`; `link` against `display`; `on-accent`
   against `accent`; every callout ink against its background; `annotation-ink`
   against each annotation slot.
2. Rendered check: in every fixture state and both modes, for every text node
   find its effective foreground (including alpha over what is behind it) and
   its effective background (the nearest painted surface, including the ladder
   step), and compute the contrast ratio.
3. Distinctness: compute pairwise colour difference (CIE76 delta E) between the
   four status colours, the five callout bars, and the nine mark colours.

**Thresholds.**

| Measure | Pass when |
| --- | --- |
| `text` and `text-muted` on `display` and `chassis` | at least 4.5:1 |
| `link` on `display` | at least 4.5:1 (should) |
| Every rendered text node whose colour is `text`, `text-muted`, `link` or a callout ink, at any size and weight | at least 4.5:1 |
| Every rendered text node whose colour is `text-faint` (placeholders, timestamps, empty-state and footer lines) | at least 3:1 |
| Status colours | every pair at least 20 delta E apart in both modes |
| Callout bars | every pair at least 20 delta E apart |
| Callouts and status | the label and the words are present (a colour is never the only signal) |

`text-faint` is the one step held to 3:1, because it carries only text that
repeats what is already shown nearby; it never carries the only copy of an
instruction or a state.

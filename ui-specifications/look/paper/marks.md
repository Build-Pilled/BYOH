# Paper marks

`tokens.json` owns the mark-style block and both modes' colours. The mark seed
and its 6 x 6 cell assignment stay unchanged across looks. Drawing takes place
inside the same 32, 28, 20 or 88 px box; these values are given at 32 px and
scale with the box. The 6 x 6 grid fills the whole tile without padding:
32/6 px per cell at 32 px, 88/6 px at 88 px. A gap shrinks painted cells,
never their grid pitch or the box.

| Parameter | Value |
| --- | --- |
| Cell shape | square |
| Drawing gap | 0.25 px on a 32/6 px pitch |
| Cell radius | 0 px |
| Tile radius | 3 px |
| Ink | single |
| Palette slots | mark-1 through mark-9, unchanged assignment |
| Idle | none |
| Working | none |
| Cycle | 0 ms |

Single-ink rendering uses `text` for every occupied cell. The nine identity
slots remain available but do not recolour cells; silhouette distinguishes bots.
Idle and working are both still.

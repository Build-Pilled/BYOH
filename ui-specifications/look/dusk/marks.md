# Dusk marks

`tokens.json` owns the mark-style block and both modes' colours. The mark seed
and its 6 x 6 cell assignment stay unchanged across looks. Drawing takes place
inside the same 32, 28, 20 or 88 px box; these values are given at 32 px and
scale with the box. A gap shrinks a painted cell, never its grid pitch or box.

| Parameter | Value |
| --- | --- |
| Cell shape | rounded |
| Drawing gap | 0.5 px on a 4 px pitch |
| Cell radius | 1.3 px |
| Tile radius | 10 px |
| Ink | multi |
| Palette slots | mark-1 through mark-9, unchanged assignment |
| Idle | none |
| Working | breath |
| Cycle | 5000 ms |

Every occupied cell uses its assigned palette slot.
Working opacity moves between 1 and .6 on a five-second ease-in-out cycle.
Idle is entirely still. Reduced motion turns the cycle off. No faces.

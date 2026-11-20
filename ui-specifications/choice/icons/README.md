# Bundled icons

Only the 15 glyph roles used by the live sample are bundled for each family.
They use currentColor in the existing icon boxes; no runtime network or font
fetch is needed. Instrument keeps its own line glyphs in `../app.js` unchanged.

| Look | Family/style | Source | Licence |
| --- | --- | --- | --- |
| Lab | Material Symbols Sharp, outlined, weight 300, opsz 20, FILL 0, GRAD 0 | Official Google font at the commit pinned in manifest.json, exported as static paths | [Apache-2.0](material/LICENSE.txt) |
| Dusk | Phosphor Duotone, 20% secondary layer; Regular for plus (and check/x/minus if added) | Official core v2.0.8 | [MIT](phosphor/LICENSE.txt) |
| Paper | IBM Carbon UI icons, 20 px where available, otherwise 32 px | Official Carbon v11.121.0 | [Apache-2.0](carbon/LICENSE.txt) |

`manifest.json` records every upstream URL and SHA-256, the Google commit,
font-file SHA-256, export settings/tool version and all licence sources. Each
family directory contains the sanitised SVGs and full licence text. Geometry
and opacity are retained; Carbon's transparent artboard and metadata are
removed. Carbon's lead metaphor is a star (the family has no crown).

To reproduce the Google paths: download the manifest's official font URL,
verify its fontSha256, instantiate it with fontTools 4.68.0
`instantiateVariableFont(TTFont(path), settings)`, obtain `font.getGlyphSet()`
and draw each manifest glyph through `SVGPathPen` and a `TransformPen` using
`(1, 0, 0, -1, 0, font['head'].unitsPerEm)`. Use that unitsPerEm square viewBox
and currentColor fill. No variable icon font is shipped.

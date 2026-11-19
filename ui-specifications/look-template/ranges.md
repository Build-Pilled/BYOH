# Ranges

Allowed range of each token group. The contrast and distinctness floors are checked by C4 and C5.

| Group | Range |
| --- | --- |
| ladder | ground plus a lightness offset per step, taken from the default's offsets (`look/instrument/tokens.md`); steps keep the default's order of lightness, and no two steps that the default distinguishes are equal |
| rule | visible against its surface but weaker than text-faint; alpha 0.05 to 0.6 for edges |
| text | text, text-muted and text-faint each meet the contrast floors on every ladder step they sit on |
| island | either equal to the ground tokens or a fixed dark panel; person-bubble contrasts with display |
| accent | one hue; on-accent meets contrast on accent; link meets contrast on display and surface-card |
| status | four colours pairwise distinct in both modes, not distinguished by hue alone (words stay in the name) |
| callout | five kinds pairwise distinct; bar visible on its background; ink meets contrast on its background |
| annotation | slots distinct from each other; ink meets contrast on every slot |
| mark | nine colours pairwise distinct; each visible on mark-ground |
| shadow | colour and alpha only |

| Other | Range |
| --- | --- |
| Fonts | Open licence (OFL, Apache or similar), bundled from the official release with its licence text; unclear licence is refused |
| Tracking | within 0.04 em of the type-scale value |
| Weight | any weight inside the role's class |
| Radius | 0 to 16 px, paint only |
| Rule strength | width and alpha of inset rules and shadows; never a border width |
| Motion | transform and opacity only; any duration, with a looping animation allowed only for a working or streaming state; one duration scale that reduced motion sets to 0 |

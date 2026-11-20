# Ranges

Allowed range of each token group. The contrast and distinctness floors are checked by C4 and C5.
Every new look meets the floors without exceptions; the exact Instrument-only
faint pairs listed in [C4](../checks/c4-contrast.md) are not inherited by a look
that starts from this template.

| Group | Range |
| --- | --- |
| ladder | use the default's offsets as a starting point, not a required order or formula; choose a coherent per-look hierarchy in both modes. Ground, selection, hover and islands remain visibly distinguishable where their state needs it. A page-like look may share card and page ground; hierarchy may use existing space and type instead of an added frame |
| rule | zero strength on places is allowed; otherwise weaker than text-faint; edge alpha 0 to 0.6 |
| text | text, text-muted and text-faint each meet the contrast floors on every ladder step they sit on |
| island | either equal to the ground tokens or a fixed dark panel; person-bubble contrasts with display |
| accent | one hue; on-accent meets contrast on accent; link meets contrast on display and surface-card |
| status | four colours pairwise distinct in both modes, not distinguished by hue alone (words stay in the name) |
| callout | five kinds pairwise distinct; a visible boundary: bar, tint edge or outline; ink meets contrast on its effective background |
| annotation | slots distinct from each other; ink meets contrast on every slot |
| mark | nine identity slots with distinct colours, each visible on mark-ground when used; a single-ink renderer may paint occupied cells with one ink while preserving the seeded silhouette |
| shadow | colour and alpha only |

| Other | Range |
| --- | --- |
| Fonts | Open licence (OFL, Apache or similar), bundled from the official release with its licence text; unclear licence is refused |
| Tracking | within 0.04 em of the type-scale value |
| Weight | any weight inside the role's class |
| Radius | 0 to 16 px, paint only |
| Rule strength | width and alpha of inset rules and shadows; never a border width |
| Motion | transform and opacity only; any duration; one duration scale that reduced motion sets to 0 |

The seven `presentation` settings and their enumerated ranges are in
[the template](README.md#seven-presentation-settings). They never resize or
move a box. Icons require a named open-licence family/style and bundled licence;
only square, circle, ring and diamond status shapes are allowed. Surface blur
is paint on a ::before layer. Their aesthetics have no checks.

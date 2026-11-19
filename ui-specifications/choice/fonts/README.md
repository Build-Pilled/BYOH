# Bundled fonts

All font binaries here are unmodified upstream-distributed files, not locally
subsetted, renamed, recompressed or edited. [manifest.json](manifest.json) lists
each distribution URL, coverage, exact SHA-256, bytes and internal version
(the OpenType 16.16 fixed-point `fontRevision`). `../fonts.css` loads local files
only. The URLs in the manifest are provenance, not runtime dependencies.

**Total font binaries: 2,382,048 bytes (about 2.27 MiB), 17 files, nine families.**
Licence texts, this manifest and documentation are additional small text files.

| Family | Internal version | Font bytes | Coverage and selection |
| --- | --- | --- | --- |
| Literata | 3.103 | 199748 | Unmodified Latin + Latin Extended WOFF2, normal variable |
| Recursive | 1.085 | 615012 | Unmodified Latin + Latin Extended WOFF2, normal variable |
| Inter | 4.001 | 206256 | Unmodified Latin + Latin Extended WOFF2, normal variable |
| JetBrains Mono | 2.211 | 55600 | Unmodified Latin + Latin Extended WOFF2, normal variable |
| Nunito | 3.602 | 74716 | Unmodified Latin + Latin Extended WOFF2, normal variable |
| Spline Sans Mono | 1.004 | 57292 | Unmodified Latin + Latin Extended WOFF2, normal variable |
| IBM Plex Sans | 3.201 | 537244 | Full unmodified files; only used styles/weights |
| IBM Plex Serif | 2.006 | 500600 | Full unmodified files; only used styles/weights |
| IBM Plex Mono | 2.003 | 135580 | Full unmodified files; only used styles/weights |

## Coverage and size

The first six families use Google's official Fonts WOFF2 distributions for
Latin and Latin Extended, keeping the distributed unicode ranges and variable
axes. All files for a script are present for the normal variable faces the
looks use. This is deliberately not an all-script, all-style collection: the
full TTF set would exceed 5 MB even before unused weights/styles. Extended
Latin is included alongside Latin. Other scripts fall back to the system stack;
nothing fetches a missing font. A build that needs more coverage should bundle
that upstream coverage, with its licence, rather than fetching it while drawing.

Plex Sans has the full upstream variable width/weight file (normal width used).
Plex Serif has full Regular, SemiBold and Italic files; Plex Mono has full
Regular. These are the styles and weights used for the reading, strong-reading,
emphasis and writing/code roles. No locally generated subsets are distributed.
The per-file manifest pins the exact bytes even if an upstream branch later
moves. Google Fonts distributes these families with their authors' permission;
the original families are Literata, Recursive, Inter, JetBrains Mono,
Nunito, Spline Sans Mono and IBM Plex.

## Licences and Reserved Font Names

Each family has its complete, byte-identical upstream `*-OFL.txt`
([licence hashes and URLs](licences.json)). Fonts remain under SIL
OFL 1.1, not the repository's software licence. Preserve their copyright and
licence texts when copying the assets into a generated app. The legal notices
are retained verbatim, including any names legally required by the licence.

IBM's licence reserves **Plex**. OFL condition 3 bars a modified version from
using a Reserved Font Name without permission; it does not bar redistribution
of the original software with the original names and licence. Subsetting is a
modification for this purpose. Therefore the Plex files here are full official
distribution files, not renamed or locally subsetted derivatives. No assumption
that a third-party subset automatically inherits permission is needed. OFL also
permits bundling/embedding but not selling the fonts by themselves; derivative
fonts must remain under OFL. The other families' complete licence notices are
alongside them, not replaced by a generic OFL notice. Their original line endings
and whitespace are retained. The repository whitespace check exempts only
these upstream licence files; no notice or wording is changed.

## Metrics

The pack fixes font sizes, line heights and boxes across looks. The token sets
record identity metric overrides (`100%` and `normal`): check the real-font swap
with those settings before adding compensating overrides. The check is geometry
and unclipped text, not a claim that different faces have identical glyph
widths. Instrument uses Literata for prose, Recursive with MONO=1/CASL=0 for
code and bare URLs, and a system monospace label stack (not bundled).

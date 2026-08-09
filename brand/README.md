# Brand source art

The full-resolution originals. Everything the app actually ships is derived
from these — see `public/brand/`, `src/app/icon.png`, `src/app/apple-icon.png`
and `src/app/favicon.ico`.

| File | What it is |
| --- | --- |
| `qup-lockup-source.png` | The mark plus the `Up.gg` wordmark, on transparency |
| `qup-mark-source.png` | The mark on its own |
| `social-image-source.png` | The link-preview card, 1731×909 |

`social-image-source.png` becomes `src/app/opengraph-image.jpg` and its
`twitter-image.jpg` twin at 1200×630 — the size every scraper crops to — and
at ~105 KB, because WhatsApp quietly skips preview images much above 300 KB
and the 2.2 MB original is well past that.

Both arrive with a wide transparent margin, which is most of their weight. The
shipped assets are trimmed to the ink, resized, and palette-encoded; that cuts
the header lockup from 73 KB to 15 KB with no visible loss on the glow.

Kept in the repo so the exports can be redone at a different size later without
hunting for the originals — that is the only reason they are here, and nothing
imports from this directory.

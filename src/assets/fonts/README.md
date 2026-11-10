# Fonts

| File | Family | Use | Licence | Source |
|---|---|---|---|---|
| `staubach.woff2` | Staubach | Wordmark, package names, big numbers: Latin only (no Č Ć Ž Đ; Š renders as S) | Freeware ("Use me as you please", in the font's name table) | KB `brand/assets/fontovi/Staubach.ttf`, subset to Basic Latin + typographic punctuation |
| `big-shoulders-*.woff2` | Big Shoulders (variable, 100–900) | Headlines that may carry Croatian letters | SIL OFL 1.1 | `@fontsource-variable/big-shoulders` 5.3.0 |
| `instrument-sans-*.woff2` | Instrument Sans (variable, 400–700) | Body text | SIL OFL 1.1 | `@fontsource-variable/instrument-sans` 5.3.0 |
| `jura-*.woff2` | Jura (variable, 300–700) | Small uppercase labels | SIL OFL 1.1 | `@fontsource-variable/jura` 5.3.0 |

Each variable family is split into `latin` and `latin-ext` files with `unicode-range` (see `astro.config.mjs`), so English pages load one file and Croatian pages load the Latin Extended one only when a Č, Ć, Ž, Đ or Š appears.

Big Shoulders was chosen in ticket A as the diacritics-safe display face: a condensed, athletic sans with the same cap height and width as Staubach's varsity slab, so a Croatian headline next to a Staubach number reads as one system.

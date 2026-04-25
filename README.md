# Digital Iran Freedom Congress — Website

Static, multi-locale site for the Digital Iran Freedom Congress (DIFC).
Hosted on GitHub Pages at [difcongress.com](https://difcongress.com).

## Languages

`en` · `fa` (Persian) · `ku` (Kurdish/Sorani) · `ar` (Arabic) · `bal` (Balochi) · `az` (Azeri)

## How content is structured

This repo has **two sources of truth** with strict roles:

| File | Owns | Edit it when… |
|---|---|---|
| `i18n/strings.csv` | All translatable text (6 columns: `en`, `fa`, `ku`, `ar`, `bal`, `az`) | …you want to change wording in any language |
| `en/index.html` | Page structure / markup. Translatable elements are tagged with `data-i18n="key"` | …you want to change layout, add a section, etc. |

Everything in `fa/`, `ku/`, `ar/`, `bal/`, `az/` is **generated** from those two
files. Don't edit them by hand — changes get overwritten on the next build.

## Workflow

### Fix or change a translation

```bash
# 1. Edit the relevant row in i18n/strings.csv
# 2. Rebuild all locales:
python3 scripts/build_locales.py
# 3. Commit CSV + regenerated locale files together
```

### Add a new translatable string

1. Add `data-i18n="my_new_key"` to the relevant element in `en/index.html`
   (or `data-i18n-attr="content:my_new_key"` for `<meta>` tags).
2. Append a row `my_new_key,<en>,<fa>,<ku>,<ar>,<bal>,<az>` to `i18n/strings.csv`.
3. `python3 scripts/build_locales.py`.

### Change page structure (layout, new section, reorder)

1. Edit `en/index.html` only.
2. `python3 scripts/build_locales.py` to propagate to all locales.

### Add a new locale

1. Add a column to `i18n/strings.csv` with translations.
2. Add the locale to `LOCALES` and `OG_LOCALE` in `scripts/build_locales.py`.
3. Add a switcher link in `en/index.html` (`.lang-switch` and the
   "Languages" footer column).
4. Run the build.

## Tagging rules for `en/index.html`

- Element with **only text** → `data-i18n="key"` directly on the element.
- Element with **mixed content** (text + child elements) → wrap the text in
  `<span data-i18n="key">…</span>` so the build only replaces that span.
- `<meta>` / attribute translations → `data-i18n-attr="attr:key"`
  (semicolon-separated for multiple, e.g. `placeholder:p_key;aria-label:l_key`).
- Brand names / handles (`GitHub`, `X / Twitter`, `Atlas Iran`, etc.) stay
  literal — no tag.

## Build script

`scripts/build_locales.py` (Python 3 + BeautifulSoup4):

- Reads `en/index.html` as canonical template.
- Reads `i18n/strings.csv` keyed by `key`.
- For each locale, writes `<loc>/index.html`:
  - Sets `<html lang dir>` (RTL for fa/ku/ar/bal/az; `lang="ckb"` for ku).
  - Replaces the longest direct text node on every `[data-i18n]`
    (preserves icon `<i>` siblings, `<br>`, etc.).
  - Replaces attributes listed in `[data-i18n-attr]`.
  - Updates `og:url`, `og:locale`, `og:image`, `twitter:image`.
  - Marks the active link in `.lang-switch`.
- Missing CSV values fall back to EN, so untranslated keys still render.

```bash
pip install beautifulsoup4
python3 scripts/build_locales.py
```

## Optional: runtime loader (`js/i18n.js`)

Fetches the CSV at runtime and re-applies translations in the browser
without rebuilding. Handy for live preview while translating; the static
build is what gets shipped.

## Local preview

```bash
python3 -m http.server 8765
# open http://localhost:8765/en/  (and /fa/, /ku/, …)
```

## Repo layout

```
en/, fa/, ku/, ar/, bal/, az/   per-locale index.html (en is canonical, rest generated)
i18n/strings.csv                all translatable text
scripts/build_locales.py        generates the 5 non-EN locales from EN + CSV
scripts/migrate_to_csv.py       one-shot tool used to bootstrap CSV from existing locales
js/                             main.js (nav), signup.js (Cloudflare Worker), i18n.js (runtime loader)
css/style.css                   site styles
worker/                         Cloudflare Worker for signup form (D1 + Turnstile)
index.html                      root redirect to /en/
CNAME                           difcongress.com
```

## Don'ts

- Don't edit `fa/`, `ku/`, `ar/`, `bal/`, `az/` `index.html` directly.
- Don't add hardcoded user-facing text to `en/index.html` without a CSV row + key.
- Don't rename a key without grepping `data-i18n="key"` across `en/index.html` first.
- Don't reorder CSV columns; the build reads by header name but humans scan
  by position.

## License

See [LICENSE](LICENSE).

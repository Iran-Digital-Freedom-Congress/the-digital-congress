# Copilot instructions — Digital Iran Freedom Congress site

## Architecture: single source of truth

This is a static, multi-locale site. There are **two sources of truth**, with strict roles:

1. **`i18n/strings.csv`** — the source of truth for all **translatable text**.
   Columns: `key,en,fa,ku,ar,bal,az`. Every user-visible string lives here.
2. **`en/index.html`** — the source of truth for **structure / markup**.
   Every translatable element is tagged with `data-i18n="key"` or
   `data-i18n-attr="attr:key[;attr2:key2]"`. Brand names and untranslatable
   technical strings stay literal (no tag).

Locale folders (`fa/`, `ku/`, `ar/`, `bal/`, `az/`) contain **generated files**.
Do NOT edit them by hand — changes will be overwritten on the next build.

## Workflow

### Change or fix a translation
1. Edit the relevant row in `i18n/strings.csv`.
2. Run `python3 scripts/build_locales.py`.
3. Commit `i18n/strings.csv` + the regenerated locale files together.

### Add a new translatable string
1. Add a `data-i18n="new_key"` (or `data-i18n-attr="content:new_key"` for meta
   tags) to the relevant element in `en/index.html`.
2. Append a row `new_key,<en>,<fa>,<ku>,<ar>,<bal>,<az>` to `i18n/strings.csv`.
3. Run `python3 scripts/build_locales.py`.

### Change page structure (layout, new section, reorder, etc.)
1. Edit `en/index.html` only.
2. Run `python3 scripts/build_locales.py` to propagate to all locales.

### Add a new locale
1. Add a column `<loc>` to `i18n/strings.csv` and fill in translations.
2. Add an entry to `LOCALES` and `OG_LOCALE` in `scripts/build_locales.py`.
3. Add a switcher link in `en/index.html` (`.lang-switch` and `footer-col`
   under "Languages"), then run the build.

## Tagging rules for `en/index.html`

- For elements with **only text** (no child elements): put `data-i18n="key"`
  directly on the element.
- For elements with **mixed content** (text + child elements like `<i>`,
  `<br>`, `<a>`): wrap the translatable text in a `<span data-i18n="key">…</span>`.
- For meta tags / attributes: use
  `data-i18n-attr="content:key"` (or `placeholder:key`, `aria-label:key`, etc.;
  semicolon-separated for multiple).
- Keep one key per piece of distinct text. Reuse existing keys when text is
  semantically the same (e.g. `nav_join` in nav AND footer). Don't reuse a key
  for two different meanings even if EN happens to match.

## Build script behaviour (`scripts/build_locales.py`)

- Reads `en/index.html` as a Jinja-less template (BeautifulSoup).
- Reads `i18n/strings.csv` keyed by `key`.
- For each locale:
  - Sets `<html lang dir>` (RTL for fa/ku/ar/bal/az; ku uses `lang="ckb"`).
  - Replaces text on every `[data-i18n]` (longest direct text node, preserving
    sibling elements like icons).
  - Replaces attributes on every `[data-i18n-attr]`.
  - Updates `og:url`, `og:locale`, `og:image`, `twitter:image` to the locale.
  - Marks the active link in `.lang-switch`.
- Missing CSV value falls back to the EN text (so untranslated keys still render).

## Runtime loader (`js/i18n.js`)

Optional — fetches the CSV at runtime and re-applies translations in the
browser without rebuilding. Useful for live preview during translation work.
The static build is what gets shipped; `i18n.js` is a developer aid only.

## Local preview

```bash
python3 -m http.server 8765
# open http://localhost:8765/en/  (and /fa/, /ku/, …)
```

## Don't

- Don't edit `fa/`, `ku/`, `ar/`, `bal/`, `az/` `index.html` directly.
- Don't add hardcoded text to `en/index.html` without a CSV row + key.
- Don't rename a key without grepping `data-i18n="key"` across `en/index.html`
  first.
- Don't reorder CSV columns; the build script reads by header name but humans
  scan by position.

#!/usr/bin/env python3
"""Build all locale index.html files from en/index.html template + i18n/strings.csv.

Single source of truth:
  - Structure / untranslated text:  en/index.html
  - Translatable text:               i18n/strings.csv
  - Per-locale tweaks:               LOCALES dict below

Generated files: fa/, ku/, ar/, bal/, az/ index.html (and en/ is rewritten in place).

Translation mechanism:
  - Elements with data-i18n="key" have their longest direct text node replaced
    with the locale's CSV value (or kept as English fallback if missing).
  - Elements with data-i18n-attr="attr:key[;attr2:key2]" have those attributes
    replaced.

Usage:
    python3 scripts/build_locales.py
"""
from __future__ import annotations

import csv
import os
import re
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    sys.exit("Install dependency: pip install beautifulsoup4")

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "en" / "index.html"
CSV_PATH = ROOT / "i18n" / "strings.csv"

# Per-locale config. dir is "rtl" for right-to-left scripts.
# hreflang matches the value already used in the lang switcher.
LOCALES = {
    "en":  {"lang": "en",  "dir": "ltr", "hreflang": "en",  "switch_label": "EN"},
    "fa":  {"lang": "fa",  "dir": "rtl", "hreflang": "fa",  "switch_label": "\u0641\u0627"},
    "ku":  {"lang": "ckb", "dir": "rtl", "hreflang": "ckb", "switch_label": "\u06a9\u0648"},
    "ar":  {"lang": "ar",  "dir": "rtl", "hreflang": "ar",  "switch_label": "\u0639\u0631"},
    "bal": {"lang": "bal", "dir": "rtl", "hreflang": "bal", "switch_label": "\u0628\u0644"},
    "az":  {"lang": "az",  "dir": "rtl", "hreflang": "az",  "switch_label": "\u062a\u06c6"},
}

OG_LOCALE = {
    "en":  "en_US",
    "fa":  "fa_IR",
    "ku":  "ckb_IQ",
    "ar":  "ar_AR",
    "bal": "bal_IR",
    "az":  "az_IR",
}


def load_csv() -> dict[str, dict[str, str]]:
    """Returns {key: {locale: value}}."""
    with CSV_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        return {row["key"]: row for row in reader}


def replace_longest_text_node(el, text: str) -> None:
    """Set element's text content while preserving child elements.

    If the element has no element children, set textContent.
    Otherwise, replace the longest direct text-node child (preserving
    leading whitespace).
    """
    has_child_element = any(
        getattr(c, "name", None) for c in el.children
    )
    if not has_child_element:
        el.string = text
        return

    # Find longest direct text-node child
    best = None
    for child in el.children:
        if isinstance(child, NavigableString) and child.strip():
            if best is None or len(child.strip()) > len(best.strip()):
                best = child

    if best is not None:
        leading = re.match(r"^\s*", str(best)).group(0) or " "
        best.replace_with(NavigableString(leading + text))
    else:
        # No text node yet; append one with a leading space
        el.append(NavigableString(" " + text))


def apply_translations(soup: BeautifulSoup, locale: str, strings: dict) -> None:
    # data-i18n: replace text content
    for el in soup.find_all(attrs={"data-i18n": True}):
        key = el["data-i18n"]
        row = strings.get(key)
        if not row:
            continue
        value = (row.get(locale) or "").strip()
        if not value:
            continue
        replace_longest_text_node(el, value)

    # data-i18n-attr: replace specific attributes
    # spec syntax: "attr:key" or "attr1:key1;attr2:key2"
    for el in soup.find_all(attrs={"data-i18n-attr": True}):
        spec = el["data-i18n-attr"]
        for pair in spec.split(";"):
            if ":" not in pair:
                continue
            attr, key = pair.split(":", 1)
            attr, key = attr.strip(), key.strip()
            row = strings.get(key)
            if not row:
                continue
            value = (row.get(locale) or "").strip()
            if value:
                el[attr] = value


def update_html_attrs(soup: BeautifulSoup, locale: str, conf: dict) -> None:
    html_tag = soup.find("html")
    if html_tag is not None:
        html_tag["lang"] = conf["lang"]
        html_tag["dir"] = conf["dir"]


def update_lang_switcher(soup: BeautifulSoup, locale: str) -> None:
    """Mark the active locale in the .lang-switch list."""
    sw = soup.select_one(".lang-switch")
    if sw is None:
        return
    for a in sw.find_all("a"):
        # remove any existing active class
        classes = a.get("class", []) or []
        classes = [c for c in classes if c != "active"]
        href = a.get("href", "")
        # href is like ../en/, ../fa/, etc.
        m = re.search(r"\.\./([^/]+)/", href)
        if m and m.group(1) == locale:
            classes.append("active")
        if classes:
            a["class"] = classes
        elif "class" in a.attrs:
            del a["class"]


def update_meta_urls(soup: BeautifulSoup, locale: str) -> None:
    """Update og:url and og:locale to reflect the target locale."""
    for meta in soup.find_all("meta"):
        prop = meta.get("property")
        if prop == "og:url":
            meta["content"] = f"https://difcongress.com/{locale}/"
        elif prop == "og:locale":
            meta["content"] = OG_LOCALE.get(locale, conf_default(locale))
        elif prop == "og:image":
            meta["content"] = f"https://difcongress.com/{locale}/og-image.png"
        elif meta.get("name") == "twitter:image":
            meta["content"] = f"https://difcongress.com/{locale}/og-image.png"


def conf_default(locale: str) -> str:
    return LOCALES.get(locale, {}).get("lang", locale)


def build_locale(template_html: str, locale: str, conf: dict, strings: dict) -> str:
    soup = BeautifulSoup(template_html, "html.parser")
    update_html_attrs(soup, locale, conf)
    apply_translations(soup, locale, strings)
    update_lang_switcher(soup, locale)
    update_meta_urls(soup, locale)
    return str(soup)


def main() -> int:
    if not TEMPLATE.exists():
        sys.exit(f"Template not found: {TEMPLATE}")
    if not CSV_PATH.exists():
        sys.exit(f"CSV not found: {CSV_PATH}")

    template_html = TEMPLATE.read_text(encoding="utf-8")
    strings = load_csv()

    for locale, conf in LOCALES.items():
        out_path = ROOT / locale / "index.html"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        html = build_locale(template_html, locale, conf, strings)
        out_path.write_text(html, encoding="utf-8")
        print(f"  wrote {out_path.relative_to(ROOT)}")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

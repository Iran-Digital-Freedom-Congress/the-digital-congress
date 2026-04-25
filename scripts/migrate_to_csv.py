#!/usr/bin/env python3
"""One-shot migration: tag en/index.html with data-i18n keys and extend
i18n/strings.csv with translations extracted from existing locale HTML
files.

Strategy
--------
Walk EN's DOM. For each text-bearing leaf element (no data-i18n yet,
single direct text node, substantive English text):

  1. If any existing CSV row has row[en] == el.text, reuse that key
     (taking each duplicate key once in document order). This preserves
     curated keys like nav_about, hero_label, gov_ga, etc.

  2. Otherwise, generate a new key (slug of EN text) and extract the
     locale translation for each non-EN locale by walking the same
     section in the locale file with the same per-tag positional index
     (only counting candidates that lack data-i18n).

Tag EN element with the chosen key.

Idempotent: skips already-tagged elements.

Run me before running scripts/build_locales.py.
"""
from __future__ import annotations

import csv
import re
import sys
from collections import defaultdict, deque
from pathlib import Path

try:
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    sys.exit("Install dependency: pip install beautifulsoup4")

ROOT = Path(__file__).resolve().parent.parent
EN_FILE = ROOT / "en" / "index.html"
CSV_PATH = ROOT / "i18n" / "strings.csv"
LOCALES = ["en", "fa", "ku", "ar", "bal", "az"]
NON_EN = ["fa", "ku", "ar", "bal", "az"]

TEXT_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "li", "span", "a", "button",
    "td", "th", "caption", "label", "summary",
}

SKIP_PARENT_CLASSES = {"lang-switch", "planning-banner"}


def direct_texts(el):
    return [c for c in el.children if isinstance(c, NavigableString) and c.strip()]


def has_skipped_ancestor(el) -> bool:
    p = el.parent
    while p is not None:
        cls = p.get("class") if hasattr(p, "get") else None
        if cls and any(c in SKIP_PARENT_CLASSES for c in cls):
            return True
        p = p.parent
    return False


def find_anchor(el):
    cur = el.parent
    while cur is not None:
        if hasattr(cur, "get") and cur.get("id"):
            return cur
        cur = cur.parent
    return None


def is_candidate_en(el) -> bool:
    if el.name not in TEXT_TAGS:
        return False
    if el.has_attr("data-i18n"):
        return False
    if has_skipped_ancestor(el):
        return False
    dts = direct_texts(el)
    if len(dts) != 1:
        return False
    text = dts[0].strip()
    if len(text) < 5:
        return False
    if not re.search(r"[A-Za-z]", text):
        return False
    return True


def is_candidate_locale(el) -> bool:
    if el.name not in TEXT_TAGS:
        return False
    if el.has_attr("data-i18n"):
        return False
    if has_skipped_ancestor(el):
        return False
    dts = direct_texts(el)
    if len(dts) != 1:
        return False
    text = dts[0].strip()
    if len(text) < 2:
        return False
    return True


def slugify(text: str, max_len: int = 50) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", text.lower()).strip("_")
    return s[:max_len].rstrip("_") or "x"


def collect_by_anchor(soup, candidate_fn):
    """{anchor_id: {tag: [elements_in_doc_order]}}"""
    out = {}
    for el in soup.find_all(True):
        if not candidate_fn(el):
            continue
        anc = find_anchor(el)
        anc_id = anc.get("id") if anc is not None else "__root__"
        out.setdefault(anc_id, {}).setdefault(el.name, []).append(el)
    return out


def main() -> int:
    with CSV_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or (["key"] + LOCALES))

    used_keys = {r["key"] for r in rows}
    for loc in LOCALES:
        if loc not in fieldnames:
            fieldnames.append(loc)
            for r in rows:
                r.setdefault(loc, "")

    # Build {en_text: deque([key, key, ...])} for reuse pool (FIFO by CSV order)
    en_pool: dict[str, deque[str]] = defaultdict(deque)
    for r in rows:
        en_text = (r.get("en") or "").strip()
        if en_text:
            en_pool[en_text].append(r["key"])

    soups = {
        loc: BeautifulSoup((ROOT / loc / "index.html").read_text(encoding="utf-8"), "html.parser")
        for loc in LOCALES
    }

    locale_index = {
        loc: collect_by_anchor(soups[loc], is_candidate_locale) for loc in NON_EN
    }
    en_soup = soups["en"]
    en_index = collect_by_anchor(en_soup, is_candidate_en)

    new_rows = []
    reused = 0
    fresh = 0
    fallbacks = 0

    for en_el in en_soup.find_all(True):
        if not is_candidate_en(en_el):
            continue
        anc = find_anchor(en_el)
        anc_id = anc.get("id") if anc is not None else "__root__"
        bucket = en_index[anc_id][en_el.name]
        pos = bucket.index(en_el)
        en_text = direct_texts(en_el)[0].strip()

        # 1. Try reuse existing key
        if en_pool.get(en_text):
            key = en_pool[en_text].popleft()
            en_el["data-i18n"] = key
            reused += 1
            continue

        # 2. Generate fresh key
        base = "x_" + slugify(en_text)
        key = base
        n = 2
        while key in used_keys:
            key = f"{base}_{n}"
            n += 1
        used_keys.add(key)

        row = {fn: "" for fn in fieldnames}
        row["key"] = key
        row["en"] = en_text
        for loc in NON_EN:
            loc_buckets = locale_index[loc].get(anc_id, {})
            loc_list = loc_buckets.get(en_el.name, [])
            if pos < len(loc_list):
                loc_text = direct_texts(loc_list[pos])[0].strip()
                row[loc] = loc_text
            else:
                fallbacks += 1
                row[loc] = en_text
        new_rows.append(row)
        en_el["data-i18n"] = key
        fresh += 1

    rows.extend(new_rows)
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

    EN_FILE.write_text(str(en_soup), encoding="utf-8")

    print(f"Reused existing CSV keys: {reused}")
    print(f"Newly added CSV keys:     {fresh}")
    print(f"Position fallbacks (EN):  {fallbacks}")
    print(f"CSV total rows:           {len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

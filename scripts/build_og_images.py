#!/usr/bin/env python3
"""Generate per-locale OG images (SVG + PNG) from i18n/strings.csv.

Single source of truth for OG text:
  - page_title       -> headline
  - hero_label       -> tagline 1
  - rhythm_label     -> tagline 2
  - planning_phase_cta -> CTA badge

Output:
  <loc>/og-image.svg
  <loc>/og-image.png   (rendered via rsvg-convert, must be on PATH)

Usage:
    python3 scripts/build_og_images.py
"""
from __future__ import annotations

import csv
import shutil
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "i18n" / "strings.csv"

# Per-locale font / direction config.
# Font families must be quoted within the SVG so spaces survive.
LOCALES: dict[str, dict[str, str]] = {
    "en": {
        "dir": "ltr",
        "font_title": "Inter, sans-serif",
        "font_body":  "Inter, sans-serif",
        "title_size": "52",
        "body_size":  "24",
        "cta_size":   "18",
        "imports": (
            "@import url('https://fonts.googleapis.com/css2?"
            "family=Inter:wght@400;600;700;800&amp;display=swap');"
        ),
    },
    "fa": {
        "dir": "rtl",
        "font_title": "Parastoo, Vazirmatn, 'Noto Sans Arabic', sans-serif",
        "font_body":  "Parastoo, Vazirmatn, 'Noto Sans Arabic', sans-serif",
        "title_size": "52",
        "body_size":  "24",
        "cta_size":   "18",
        "imports": (
            "@import url('https://fonts.googleapis.com/css2?"
            "family=Vazirmatn:wght@400;600;700;800&amp;"
            "family=Noto+Sans+Arabic:wght@400;700&amp;display=swap');"
            "@import url('https://cdn.jsdelivr.net/gh/rastikerdar/"
            "parastoo-font@v2.0.1/dist/font-face.css');"
        ),
    },
    "ku": {
        "dir": "rtl",
        "font_title": "Vazirmatn, 'Noto Sans Arabic', sans-serif",
        "font_body":  "Vazirmatn, 'Noto Sans Arabic', sans-serif",
        "title_size": "48",
        "body_size":  "24",
        "cta_size":   "18",
        "imports": (
            "@import url('https://fonts.googleapis.com/css2?"
            "family=Vazirmatn:wght@400;600;700;800&amp;"
            "family=Noto+Sans+Arabic:wght@400;700&amp;display=swap');"
        ),
    },
    "ar": {
        "dir": "rtl",
        "font_title": "'Noto Naskh Arabic', 'Noto Sans Arabic', Vazirmatn, sans-serif",
        "font_body":  "'Noto Naskh Arabic', 'Noto Sans Arabic', Vazirmatn, sans-serif",
        "title_size": "52",
        "body_size":  "24",
        "cta_size":   "18",
        "imports": (
            "@import url('https://fonts.googleapis.com/css2?"
            "family=Noto+Naskh+Arabic:wght@400;500;600;700&amp;"
            "family=Noto+Sans+Arabic:wght@400;700&amp;"
            "family=Vazirmatn:wght@400;700&amp;display=swap');"
        ),
    },
    "bal": {
        "dir": "rtl",
        "font_title": "'Noto Sans Arabic', 'Noto Naskh Arabic', Vazirmatn, sans-serif",
        "font_body":  "'Noto Sans Arabic', 'Noto Naskh Arabic', Vazirmatn, sans-serif",
        "title_size": "48",
        "body_size":  "24",
        "cta_size":   "18",
        "imports": (
            "@import url('https://fonts.googleapis.com/css2?"
            "family=Noto+Sans+Arabic:wght@400;500;600;700&amp;"
            "family=Noto+Naskh+Arabic:wght@400;500;700&amp;"
            "family=Vazirmatn:wght@400;700&amp;display=swap');"
        ),
    },
    "az": {
        "dir": "rtl",
        "font_title": "Vazirmatn, 'Noto Sans Arabic', sans-serif",
        "font_body":  "Vazirmatn, 'Noto Sans Arabic', sans-serif",
        "title_size": "48",
        "body_size":  "24",
        "cta_size":   "18",
        "imports": (
            "@import url('https://fonts.googleapis.com/css2?"
            "family=Vazirmatn:wght@400;600;700;800&amp;"
            "family=Noto+Sans+Arabic:wght@400;700&amp;display=swap');"
        ),
    },
}

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      {imports}
    </style>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="8%" stop-color="#BFDBFE"/>
      <stop offset="43%" stop-color="#BAE6FD"/>
      <stop offset="92%" stop-color="#F5F7FA"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1"/>
      <feColorMatrix in="blur1" type="matrix" values="1 0 0 0 0  0.64 0 0 0 0  0 0.04 0 0 0  0 0 0 0.5 0" result="glow1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2"/>
      <feMerge>
        <feMergeNode in="glow1"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg-grad)"/>
  <circle cx="100" cy="530" r="180" fill="#3B82F6" opacity="0.05"/>
  <circle cx="1100" cy="100" r="200" fill="#0EA5E9" opacity="0.05"/>
  <rect x="0" y="0" width="1200" height="5" fill="url(#accent)"/>
  <text x="600" y="195" text-anchor="middle" font-family="Inter, sans-serif" font-size="68" font-weight="800" fill="#F59E0B" filter="url(#glow)">◆</text>
  <text x="600" y="290" text-anchor="middle" font-family="{font_title}" font-size="{title_size}" font-weight="700" fill="rgba(0,0,0,0.87)"{dir_attr}>{title}</text>
  <text x="600" y="370" text-anchor="middle" font-family="{font_body}" font-size="{body_size}" font-weight="400" fill="rgba(0,0,0,0.56)"{dir_attr}>{tagline1}</text>
  <text x="600" y="410" text-anchor="middle" font-family="{font_body}" font-size="{body_size}" font-weight="400" fill="rgba(0,0,0,0.56)"{dir_attr}>{tagline2}</text>
  <rect x="480" y="440" width="240" height="2" rx="1" fill="url(#accent)" opacity="0.4"/>
  <text x="600" y="490" text-anchor="middle" font-family="{font_body}" font-size="{cta_size}" font-weight="600" fill="#3B82F6"{dir_attr}>{cta}</text>
  <rect x="0" y="580" width="1200" height="50" fill="url(#accent)"/>
  <text x="600" y="613" text-anchor="middle" font-family="Inter, sans-serif" font-size="21" font-weight="600" fill="#ffffff" letter-spacing="2">difcongress.com</text>
</svg>
"""


def load_csv() -> dict[str, dict[str, str]]:
    with CSV_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = {row["key"]: row for row in reader}
    return rows


def get(rows: dict, key: str, loc: str) -> str:
    val = rows.get(key, {}).get(loc, "").strip()
    if not val:
        val = rows.get(key, {}).get("en", "").strip()
    return val


def render_svg(loc: str, cfg: dict, rows: dict) -> str:
    title = escape(get(rows, "page_title",   loc))
    tagline1 = escape(get(rows, "hero_label",   loc))
    tagline2 = escape(get(rows, "rhythm_label", loc))
    cta = escape(get(rows, "planning_phase_cta", loc))
    dir_attr = f' direction="{cfg["dir"]}"' if cfg["dir"] == "rtl" else ""
    return SVG_TEMPLATE.format(
        imports=cfg["imports"],
        font_title=cfg["font_title"],
        font_body=cfg["font_body"],
        title_size=cfg["title_size"],
        body_size=cfg["body_size"],
        cta_size=cfg["cta_size"],
        dir_attr=dir_attr,
        title=title,
        tagline1=tagline1,
        tagline2=tagline2,
        cta=cta,
    )


def render_png(svg_path: Path, png_path: Path) -> None:
    subprocess.run(
        ["rsvg-convert", "-w", "1200", "-h", "630",
         "-o", str(png_path), str(svg_path)],
        check=True,
    )


def main() -> int:
    if not shutil.which("rsvg-convert"):
        sys.exit("rsvg-convert not found on PATH (brew install librsvg)")
    rows = load_csv()
    for loc, cfg in LOCALES.items():
        out_dir = ROOT / loc
        out_dir.mkdir(exist_ok=True)
        svg_path = out_dir / "og-image.svg"
        png_path = out_dir / "og-image.png"
        svg_path.write_text(render_svg(loc, cfg, rows), encoding="utf-8")
        render_png(svg_path, png_path)
        print(f"  {loc}/og-image.{{svg,png}}")
    print("OG images rebuilt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

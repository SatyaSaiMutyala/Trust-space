#!/usr/bin/env bash
# Screenshot a page with headless Chrome.
#   tools/shot.sh <url> <out.png> [width=1400] [height=2200]
# React app (dev server): http://localhost:5173/?route=overview
# Reference prototype:   file:///D:/Satya-App/Trust-space/reference/TruSpace-nav.html?route=overview
# Query params (both): role=tdpl|o1..o7|fr:pa1|fr:pa2  route=<page>  sel=<propertyId>  tab=<tab>  mode=board|table|compare
#                      d=<url-encoded JSON drawer, e.g. {"kind":"invoiceView","id":"i101"}>
URL="$1"; OUT="$2"; W="${3:-1400}"; H="${4:-2200}"
P="$(mktemp -d)"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
  --user-data-dir="$P" --window-size="$W,$H" --virtual-time-budget=6000 --screenshot="$OUT" "$URL" >/dev/null 2>&1
rm -rf "$P"
echo "$OUT"

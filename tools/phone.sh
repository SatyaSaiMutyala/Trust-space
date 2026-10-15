#!/usr/bin/env bash
# Screenshot the React app at a true phone width (iframe), e.g.
#   tools/phone.sh "route=overview&role=tdpl" out.png [width=375] [height=1600]
Q="$1"; OUT="$2"; W="${3:-375}"; H="${4:-1600}"
ENC=$(printf '%s' "$Q" | sed 's/%/%25/g; s/&/%26/g; s/=/%3D/g; s/{/%7B/g; s/}/%7D/g; s/"/%22/g; s/:/%3A/g; s/,/%2C/g')
P="$(mktemp -d)"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$P" \
  --window-size="$((W+20)),$H" --virtual-time-budget=7000 --screenshot="$OUT" "http://localhost:5173/frame.html?w=$W&h=$H&q=$ENC" >/dev/null 2>&1
rm -rf "$P"
echo "$OUT"

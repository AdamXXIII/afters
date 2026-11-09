#!/usr/bin/env bash
# Downloads real Jackbox Party Pack screenshots from the Steam store into reference/ (git-ignored).
# Needs the "second-brain (Afters reference)" environment (allows store.steampowered.com + steamstatic).
cd "$(dirname "$0")/../reference" || exit 1
for id in 331670 397460 434170 610180 1005300 1211630 2652000; do
  curl -s --max-time 20 "https://store.steampowered.com/api/appdetails?appids=$id" |
  python3 -c "import json,sys;d=json.load(sys.stdin)['$id'];print('\n'.join(s['path_full'] for s in d['data'].get('screenshots',[])) if d.get('success') else '')" > urls-$id.txt
  n=0; while read -r u; do [ -n "$u" ] || continue; n=$((n+1)); [ -f "jb-$id-$n.jpg" ] || curl -s --max-time 30 "$u" -o "jb-$id-$n.jpg"; done < urls-$id.txt
done
ls jb-*.jpg | wc -l

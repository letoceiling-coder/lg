#!/usr/bin/env bash
curl -s 'https://dataout.trendagent.ru/msk/about.json' | python3 -c "
import sys, json
data = json.load(sys.stdin)
for d in data:
    print(d['name'], d.get('url',''))
"

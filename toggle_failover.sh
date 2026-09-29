#!/usr/bin/env bash
# ==============================================================================
# Megha Setu — 1-Step Weather API Outage & Failover Simulator for Video Demos
# Usage:
#   ./toggle_failover.sh        -> Toggles between Open-Meteo (Tier 1) and wttr.in (Tier 3)
#   ./toggle_failover.sh on     -> Forces Tier 1 Outage (Routes all queries to wttr.in)
#   ./toggle_failover.sh off    -> Restores Tier 1 Open-Meteo (Normal Mode)
# ==============================================================================

ARG=$(echo "$1" | tr '[:upper:]' '[:lower:]')
API_URL="http://localhost:8000/api/dev/toggle-outage"

if [ "$ARG" == "on" ] || [ "$ARG" == "disable" ] || [ "$ARG" == "wttr" ]; then
    ENDPOINT="${API_URL}?enable=true"
elif [ "$ARG" == "off" ] || [ "$ARG" == "enable" ] || [ "$ARG" == "normal" ]; then
    ENDPOINT="${API_URL}?enable=false"
else
    ENDPOINT="${API_URL}"
fi

echo "🔄 Contacting Megha Setu backend failover controller..."
RESP=$(curl -s "$ENDPOINT")

if [ -z "$RESP" ]; then
    echo "❌ Error: Could not reach backend at http://localhost:8000. Is the backend server running?"
    exit 1
fi

echo ""
echo "======================================================================"
echo "$RESP" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    outage = data.get('simulated_outage', False)
    source = data.get('active_source', 'Unknown')
    msg = data.get('message', '')
    if outage:
        print('🔴 SIMULATED OUTAGE ACTIVE')
        print(f'   Active Source : {source}')
        print(f'   Effect        : Tier 1 (Open-Meteo) disabled.')
        print(f'                   Next chat query will fetch live from wttr.in (Tier 3)!')
        print(f'   Demo Tip      : Ask \"What is the weather in Delhi?\" and show the card badge:')
        print('                   \"🛰️ wttr.in (fallback)\"')
    else:
        print('🟢 NORMAL MODE RESTORED')
        print(f'   Active Source : {source}')
        print(f'   Effect        : Tier 1 (Open-Meteo IMD-aligned) active.')
except Exception as e:
    print(sys.stdin.read())
"
echo "======================================================================"
echo ""

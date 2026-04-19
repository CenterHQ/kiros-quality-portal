#!/bin/bash
# Query centre_context table from Kiros Supabase instance
# Usage: ./context.sh [context_type]
# Run from project root (needs .env.local)

set -e

SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2 | tr -d '[:space:]')
SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2 | tr -d '[:space:]')
BASE="$SUPABASE_URL/rest/v1"
CONTEXT_TYPE="${1:-}"

if [ -z "$CONTEXT_TYPE" ]; then
  # List all categories with counts
  curl -s "$BASE/centre_context?select=context_type" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" | \
  python3 -c "
import sys, json
from collections import Counter
rows = json.load(sys.stdin)
counts = Counter(r['context_type'] for r in rows)
labels = {
  'qip_goal': 'Quality Improvement Plan goals',
  'safety_protocol': 'Emergency and risk procedures',
  'service_value': 'Core centre values',
  'policy_requirement': 'Operational policy rules',
  'procedure_step': 'How things are done step by step',
  'qip_strategy': 'Improvement strategies',
  'teaching_approach': 'How educators work with children',
  'family_engagement': 'Orienting and involving families',
  'leadership_goal': 'Governance and management intent',
  'philosophy_principle': 'K.I.R.O.S philosophy',
  'environment_feature': 'Physical spaces and room setup',
  'inclusion_practice': 'Diversity and support needs',
}
print('Available categories in centre_context:')
for i, (t, c) in enumerate(sorted(counts.items(), key=lambda x: -x[1]), 1):
  label = labels.get(t, '')
  print(f'  {i:>2}. {t:<30} ({c:>2} rows)  {label}')
print()
print('Usage: /kiros context <category>  (plain language OK — goals, safety, teaching, etc.)')
"
else
  # Fetch rows for the given context_type
  curl -s "$BASE/centre_context?context_type=eq.$CONTEXT_TYPE&select=title,content,source_quote&order=id" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" | \
  python3 -c "
import sys, json
rows = json.load(sys.stdin)
ct = sys.argv[1]
if not rows:
  print(f'No rows found for context_type: {ct}')
  sys.exit(0)
for r in rows:
  print(f'── {r[\"title\"]}')
  print(f'   {r[\"content\"]}')
  if r.get('source_quote'):
    print(f'   (source: \"{r[\"source_quote\"]}\")')
  print()
print(f'Loaded {len(rows)} rows from centre_context [{ct}] into conversation context.')
" "$CONTEXT_TYPE"
fi

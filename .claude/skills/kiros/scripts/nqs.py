#!/usr/bin/env python3
"""
Query qa_elements (and element_actions) from Kiros Supabase instance.
Run from project root (needs .env.local).

Actual column names (verified against live DB 2026-04-19):
  element_code, element_name, qa_number, qa_name, standard_number, standard_name,
  concept, current_rating (not_met|met), target_rating, status (not_started|in_progress),
  assigned_to, officer_finding, our_response, actions_taken,
  meeting_criteria, exceeding_criteria, training_points, due_date, notes

Usage:
  python3 nqs.py                  — all 40 elements, grouped by QA area
  python3 nqs.py qa1              — all elements in QA1 (medium detail)
  python3 nqs.py 1.1.1            — single element full detail + actions
  python3 nqs.py "not met"        — filter by current_rating=not_met
  python3 nqs.py met              — filter by current_rating=met
  python3 nqs.py "in progress"    — filter by status=in_progress
  python3 nqs.py <name>           — filter by assigned_to (partial match)
"""

import sys, re, json, subprocess, urllib.parse
from pathlib import Path
from collections import defaultdict


def load_credentials():
    env = Path(".env.local").read_text()
    creds = {}
    for line in env.splitlines():
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            creds[k.strip()] = v.strip()
    url = creds.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = creds.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)
    return url, key


def fetch(base_url, key, table, params):
    url = f"{base_url}/rest/v1/{table}?{params}"
    result = subprocess.run(
        ["curl", "-s", url, "-H", f"apikey: {key}", "-H", f"Authorization: Bearer {key}"],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    if isinstance(data, dict) and "message" in data:
        print(f"API error: {data['message']}")
        sys.exit(1)
    return data


def show_all(url, key):
    rows = fetch(url, key, "qa_elements",
                 "select=element_code,element_name,qa_number,qa_name,current_rating,status&order=element_code")
    by_qa = defaultdict(list)
    for r in rows:
        by_qa[str(r["qa_number"])].append(r)
    for qa_num in sorted(by_qa.keys(), key=int):
        elements = by_qa[qa_num]
        qa_label = elements[0]["qa_name"] if elements else ""
        print(f"QA{qa_num} — {qa_label}")
        for e in elements:
            code = e["element_code"]
            name = (e["element_name"] or "")[:50]
            rating = e["current_rating"] or "—"
            status = e["status"] or "—"
            print(f"  {code:<8}  {name:<52}  {rating:<12}  {status}")
        print()
    print(f"Loaded {len(rows)} elements from qa_elements [all]")


def show_qa_area(url, key, qa_num):
    rows = fetch(url, key, "qa_elements",
                 f"qa_number=eq.{qa_num}&select=element_code,element_name,current_rating,status,officer_finding&order=element_code")
    if not rows:
        print(f"No elements found for QA{qa_num}")
        return
    qa_label = ""
    full = fetch(url, key, "qa_elements",
                 f"qa_number=eq.{qa_num}&select=qa_name&limit=1")
    if full:
        qa_label = full[0].get("qa_name", "")
    print(f"QA{qa_num} — {qa_label}")
    print()
    for e in rows:
        print(f"{e['element_code']} — {e['element_name']}")
        print(f"  Rating:   {e['current_rating'] or 'not set'}")
        print(f"  Status:   {e['status'] or 'not set'}")
        if e.get("officer_finding"):
            print(f"  Inspector: {e['officer_finding']}")
        print()
    print(f"Loaded {len(rows)} elements from qa_elements [QA{qa_num}]")


def show_single(url, key, code):
    elements = fetch(url, key, "qa_elements",
                     f"element_code=eq.{urllib.parse.quote(code)}&select=*")
    if not elements:
        print(f"No element found with code: {code}")
        return
    e = elements[0]

    # Try to fetch linked element_actions
    actions = []
    try:
        actions = fetch(url, key, "element_actions",
                        f"element_id=eq.{e['id']}&select=*")
    except Exception:
        pass

    print(f"{e['element_code']} — {e['element_name']}")
    print(f"  QA Area:     QA{e['qa_number']} — {e['qa_name']}")
    print(f"  Standard:    {e.get('standard_number')} — {e.get('standard_name') or ''}")
    print(f"  Rating:      {e['current_rating'] or 'not set'}")
    print(f"  Target:      {e.get('target_rating') or 'not set'}")
    print(f"  Status:      {e['status'] or 'not set'}")
    print(f"  Assigned to: {e['assigned_to'] or 'unassigned'}")
    if e.get("concept"):
        print(f"\n  Concept:\n    {e['concept']}")
    if e.get("officer_finding"):
        print(f"\n  Inspector finding:\n    {e['officer_finding']}")
    if e.get("our_response"):
        print(f"\n  Centre response:\n    {e['our_response']}")
    if e.get("actions_taken"):
        print(f"\n  Actions taken:\n    {e['actions_taken']}")
    if e.get("meeting_criteria"):
        print(f"\n  Meeting criteria:\n    {e['meeting_criteria']}")
    if e.get("training_points"):
        print(f"\n  Training points:\n    {e['training_points']}")
    if actions:
        print(f"\n  Improvement actions ({len(actions)}):")
        for a in actions:
            desc = a.get("description") or a.get("action") or str(a)
            print(f"    - {desc}")
    print(f"\nLoaded 1 element from qa_elements [{code}] with {len(actions)} linked actions.")


def show_filtered(url, key, params, label):
    rows = fetch(url, key, "qa_elements",
                 f"{params}&select=element_code,element_name,current_rating,status,assigned_to&order=element_code")
    if not rows:
        print(f"No elements found matching: {label}")
        return
    for e in rows:
        code = e["element_code"]
        name = (e["element_name"] or "")[:50]
        rating = e["current_rating"] or "—"
        status = e["status"] or "—"
        assigned = e["assigned_to"] or "—"
        print(f"{code:<8}  {name:<52}  {rating:<12}  {status:<15}  → {assigned}")
    print(f"\nLoaded {len(rows)} elements from qa_elements [{label}]")


def main():
    url, key = load_credentials()
    arg = sys.argv[1].strip() if len(sys.argv) > 1 else ""

    if not arg:
        show_all(url, key)
    elif re.match(r'^qa?([1-7])$', arg, re.IGNORECASE):
        qa_num = re.match(r'^qa?([1-7])$', arg, re.IGNORECASE).group(1)
        show_qa_area(url, key, qa_num)
    elif re.match(r'^[1-7]\.\d+\.\d+$', arg):
        show_single(url, key, arg)
    elif re.search(r'not.?met|unmet', arg, re.IGNORECASE):
        show_filtered(url, key, "current_rating=eq.not_met", "not met")
    elif re.match(r'^met$', arg, re.IGNORECASE):
        show_filtered(url, key, "current_rating=eq.met", "met")
    elif re.search(r'in.?progress', arg, re.IGNORECASE):
        show_filtered(url, key, "status=eq.in_progress", "in progress")
    elif re.search(r'not.?start', arg, re.IGNORECASE):
        show_filtered(url, key, "status=eq.not_started", "not started")
    else:
        encoded = urllib.parse.quote(arg)
        show_filtered(url, key, f"assigned_to=ilike.*{encoded}*", f"assigned to: {arg}")


if __name__ == "__main__":
    main()

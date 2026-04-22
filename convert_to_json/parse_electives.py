import csv
import json
import re
from collections import defaultdict

COURSE_CODE_RE = re.compile(r'^[A-Z]{2,6}\s+\d{3,4}[A-Z]?$')

def is_course_code(name):
    return bool(COURSE_CODE_RE.match(name.strip()))

def parse_set_courses(text):
    """Extract course codes from 'Course within this set of courses: A, B, C' lines."""
    courses = []
    for match in re.finditer(r'Course within this set of courses:\s*([^\n]+)', text):
        for c in match.group(1).split(','):
            c = c.strip()
            if is_course_code(c):
                courses.append(c)
    return courses

def parse_ranges(text):
    """Extract range strings from 'Course within one of these ranges: X-Y' lines."""
    ranges = []
    for match in re.finditer(r'Course within one of these ranges:\s*([^\n]+)', text):
        val = match.group(1).strip()
        if val:
            ranges.append(val)
    return ranges

# ── Load CSV ──────────────────────────────────────────────────────────────────
rows = []
with open('audit_requirements_undergrad.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

# ── Build graph ───────────────────────────────────────────────────────────────
req_names    = {}                      # req_id  -> requirement name
req_programs = {}                      # req_id  -> program name
req_rows     = defaultdict(list)       # req_id  -> [rows] (one per constraint)
children     = defaultdict(set)        # parent_req_id -> {child req_ids}

for row in rows:
    rid  = row['Requirement ID']
    pid  = row['Parent Requirement ID']
    name = row['Requirement Name']
    prog = row['Program Name']
    if rid:
        req_names[rid]    = name
        req_programs[rid] = prog
        req_rows[rid].append(row)
    if rid and pid:
        children[pid].add(rid)

# ── Recursive course collector ────────────────────────────────────────────────
def collect_courses(rid, visited=None):
    """Return (courses, ranges) reachable from requirement node `rid`."""
    if visited is None:
        visited = set()
    if rid in visited:
        return [], []
    visited.add(rid)

    name = req_names.get(rid, '')

    # Leaf node: the requirement IS a course code
    if is_course_code(name):
        return [name], []

    courses, ranges = [], []

    for row in req_rows.get(rid, []):
        constraint = row.get('Constraint') or ''
        # Skip pure restriction rows — they limit counting, not eligibility
        if constraint.startswith('Count courses only from'):
            continue
        courses.extend(parse_set_courses(constraint))
        ranges.extend(parse_ranges(constraint))

    for child_id in children.get(rid, []):
        c, r = collect_courses(child_id, visited)
        courses.extend(c)
        ranges.extend(r)

    return courses, ranges

# ── Find all elective requirements and build output ───────────────────────────
elective_classes = {}
seen_keys = set()

for rid, name in req_names.items():
    if 'elective' not in name.lower():
        continue

    program = req_programs.get(rid, 'Unknown')
    key = f"{program} - {name}"

    if key in seen_keys:
        continue
    seen_keys.add(key)

    courses, ranges = collect_courses(rid)

    # Deduplicate while preserving order
    unique_courses = list(dict.fromkeys(courses))
    unique_ranges  = list(dict.fromkeys(ranges))

    result = unique_courses + [f"[range] {r}" for r in unique_ranges]

    if result:
        elective_classes[key] = result

# Sort keys for readability
elective_classes = dict(sorted(elective_classes.items()))

with open('elective_classes.json', 'w', encoding='utf-8') as f:
    json.dump(elective_classes, f, indent=2)

print(f"Done — {len(elective_classes)} elective categories written to elective_classes.json")

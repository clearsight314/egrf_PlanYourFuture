# from anytree import Node, RenderTree # manages the tree data structure
import pandas as pd # dataframes
import hashlib
import re

reqs = pd.read_csv("audit_requirements-2026.csv", usecols=["Program Name"])
# print(reqs.columns.tolist())

UNDERGRAD_TYPES = {
    'BA', 'BS', 'BIS', 'BPS', 'BUEP',
    'ASUB', 'ASUD', 'ASUG', 'ASUS',
    'Min', 'Mn', 'mn', '2m'
    'Transfer', 'Teacher Ed Transfer', 'Teacher Education',
    'Electives', '3-Year Format',
}

def _get_program_type(item):
    m = re.search(r'\(([^)]+)\)', item)
    if not m:
        return ''
    return re.sub(r'\s*2m\s*', '', m.group(1)).strip()

hash_set = {item for item in reqs["Program Name"] if _get_program_type(item) in UNDERGRAD_TYPES}
hash_set_minor = {item for item in hash_set if "Min" in item or "Mn" in item or "mn" in item}

#'English - Medieval and Renaissance Studies (2m)' edge case
hash_set_major = {item for item in hash_set if "BA" in item or "BS" in item or "BIS" in item or "BPS" in item or "BUEP" in item}
hash_set_second_minor = {item for item in reqs["Program Name"] if "2mn" in item}
hash_set_2nd_major = {item for item in reqs["Program Name"] if "2mj" in item}


def find_all_majors():
    sorted_list = sorted(hash_set)
    #print(hash_set)
    #print(sorted_list)
    #print(hash_set_2nd_major)
    print(sorted_list)

def get_parentheses_info():
    paren_list = sorted([
        m.group(1)
        for item in hash_set
        for m in [re.search(r'\(([^)]+)\)', item)]
        if m
    ])
    #paren_list_unknown = sorted({item for item in paren_list if "Minor" not in item and "BA" not in item and "BS" not in item and '2' not in item})
    print(paren_list)
    #print(paren_list_unknown)
    return paren_list
    
    


def filter_audit_requirements():
    full_reqs = pd.read_csv("audit_requirements-2026.csv")
    filtered = full_reqs[full_reqs["Program Name"].isin(hash_set)]
    filtered.to_csv("audit_requirements_undergrad.csv", index=False)
    print(f"Saved {len(filtered)} rows to audit_requirements_undergrad.csv")

def export_json(path="majors_data.json"):
    import json
    data = {
        "majors":  sorted(hash_set_major),
        "minors":  sorted(hash_set_minor),
        "majors2": sorted(hash_set_2nd_major),
        "minors2": sorted(hash_set_second_minor),
    }
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {path}")

if __name__ == "__main__":
    export_json()

import pandas as pd
import json
import re
import math


def nan_to_none(obj):
    """Recursively convert NaN floats to None for JSON serialization."""
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, dict):
        return {k: nan_to_none(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [nan_to_none(v) for v in obj]
    return obj


def build_tree(program_df):
    program_df = program_df.copy()
    program_df["Requirement ID"] = program_df["Requirement ID"].fillna(-1)
    program_df["Parent Requirement ID"] = program_df["Parent Requirement ID"].fillna(-1)

    records = program_df.to_dict(orient="records")

    node_map = {}
    for record in records:
        req_id = record["Requirement ID"]
        if req_id not in node_map:
            node_map[req_id] = {
                "Requirement ID": req_id,
                "Parent Requirement ID": record["Parent Requirement ID"],
                "Program Name": record.get("Program Name"),
                "Requirement Name": record.get("Requirement Name"),
                "children": [],
                "details": [record],
            }
        else:
            node_map[req_id]["details"].append(record)

    tree = []
    for req_id, node in node_map.items():
        parent_id = node["Parent Requirement ID"]
        if parent_id != -1 and parent_id in node_map:
            node_map[parent_id]["children"].append(node)
        else:
            tree.append(node)

    return tree


def parse_constraint(constraint_text):
    if pd.isna(constraint_text) or str(constraint_text).strip().lower() == "nan":
        return "", [], ""

    text = str(constraint_text).strip()
    req_type = ""
    courses = []
    raw_rule = ""

    if "Fulfill all" in text:
        req_type = "ALL"
    elif "Fulfill any" in text:
        match = re.search(r"Fulfill any (\d+)", text)
        req_type = f"ANY {match.group(1)}" if match else "ANY"
    elif "Any course can satisfy" in text:
        req_type = "ANY COURSE"
    else:
        match = re.search(
            r"Take (at least|exactly) (\d+\.?\d*) (course|courses|units|credits?)",
            text,
            re.IGNORECASE,
        )
        if match:
            req_type = f"{match.group(1).upper()} {match.group(2)} {match.group(3).upper()}"
        else:
            req_type = "CUSTOM RULE"
            raw_rule = text

    course_lines = re.findall(r"Course within this set of courses:\s*([^\n]+)", text)
    for line in course_lines:
        line = line.replace("(hidden from the student unless taken)", "").strip()
        courses.extend([c.strip() for c in line.split(",") if c.strip()])

    range_lines = re.findall(r"Course within one of these ranges:\s*([^\n]+)", text)
    for line in range_lines:
        courses.extend([c.strip() for c in line.split(",") if c.strip()])

    topic_lines = re.findall(r"Course within this set of course topics:\s*([^\n]+)", text)
    for line in topic_lines:
        courses.append(line.strip())

    return req_type, courses, raw_rule


def main():
    df = pd.read_csv("audit_requirements_undergrad.csv")
    drop_cols = [c for c in ["Audit ID", "Audit Name", "Audit Start Entry Year", "Audit End Entry Year"] if c in df.columns]
    df = df.drop(columns=drop_cols)

    all_programs = {}
    for program_code, group in df.groupby("Program Code"):
        program_name = group["Program Name"].iloc[0]
        tree = build_tree(group)
        all_programs[program_code] = {
            "program_name": program_name,
            "tree": nan_to_none(tree),
        }

    with open("all_majors_audit.json", "w") as f:
        json.dump(all_programs, f, indent=4)

    print(f"Saved {len(all_programs)} programs to all_majors_audit.json")


if __name__ == "__main__":
    main()

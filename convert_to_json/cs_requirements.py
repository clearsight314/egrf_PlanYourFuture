import pandas as pd
import json
import re

# Load and clean data
df = pd.read_csv("audit_requirements-2026.csv")
cs_df = df[df['Program Code'].str.contains("COMPSC-BS", case=False)]
cs_df = cs_df.drop(columns=["Audit ID", "Audit Name", "Audit Start Entry Year", "Audit End Entry Year"])

cs_df["Requirement ID"] = cs_df["Requirement ID"].fillna(-1)
cs_df["Parent Requirement ID"] = cs_df["Parent Requirement ID"].fillna(-1)

records = cs_df.to_dict(orient="records")

# Build the Tree
node_map = {}
tree = []

for record in records:
    req_id = record["Requirement ID"]
    if req_id not in node_map:
        node_map[req_id] = {
            "Requirement ID": req_id,
            "Parent Requirement ID": record["Parent Requirement ID"],
            "Program Name": record.get("Program Name"),
            "Requirement Name": record.get("Requirement Name"),
            "children": [],
            "details": [record]
        }
    else:
        node_map[req_id]["details"].append(record)

for req_id, node in node_map.items():
    parent_id = node["Parent Requirement ID"]
    if parent_id != -1 and parent_id in node_map:
        node_map[parent_id]["children"].append(node)
    else:
        tree.append(node)


# Text Parser for Constraints
def parse_constraint(constraint_text):
    if pd.isna(constraint_text) or str(constraint_text).strip().lower() == 'nan':
        return "", [], ""
        
    text = str(constraint_text).strip()
    req_type = ""
    courses = []
    raw_rule = ""
    
    # Determine fulfill all vs fulfill any
    if "Fulfill all" in text:
        req_type = "ALL"
    elif "Fulfill any" in text:
        # Check if it specifies an amount
        match = re.search(r"Fulfill any (\d+)", text)
        if match:
            req_type = f"ANY {match.group(1)}"
        else:
            req_type = "ANY"
    elif "Any course can satisfy" in text:
        req_type = "ANY COURSE"
    else:
        # Check for specific numeric credits/courses
        match = re.search(r"Take (at least|exactly) (\d+\.?\d*) (course|courses|units|credits?)", text, re.IGNORECASE)
        if match:
            req_type = f"{match.group(1).upper()} {match.group(2)} {match.group(3).upper()}"
        else:
            req_type = "CUSTOM RULE"
            raw_rule = text
            
    # Find exact courses
    course_lines = re.findall(r"Course within this set of courses:\s*([^\n]+)", text)
    for line in course_lines:
        line = line.replace("(hidden from the student unless taken)", "").strip()
        courses.extend([c.strip() for c in line.split(",") if c.strip()])
        
    # Find course ranges
    range_lines = re.findall(r"Course within one of these ranges:\s*([^\n]+)", text)
    for line in range_lines:
        courses.extend([c.strip() for c in line.split(",") if c.strip()])
        
    # Find course topics
    topic_lines = re.findall(r"Course within this set of course topics:\s*([^\n]+)", text)
    for line in topic_lines:
        courses.append(line.strip())

    return req_type, courses, raw_rule


# Print the Tree Skeleton
# def print_tree_skeleton(nodes, depth=0):
#     for node in nodes:
#         indent = "    " * depth
#         req_id = int(node["Requirement ID"])
#         name = node.get("Requirement Name", "Unnamed") 
        
#         constraint = node["details"][0].get("Constraint")
#         req_type, inline_courses, raw_rule = parse_constraint(constraint)
        
#         # Add a visual tag for ALL/ANY/AT LEAST
#         tag = f"[{req_type}] " if req_type else ""
#         print(f"{indent}↳ {tag}{name}")
        
#         # Print courses extracted from text
#         if inline_courses:
#             course_indent = "    " * (depth + 1)
#             # Truncate list if too long
#             if len(inline_courses) > 12:
#                 print(f"{course_indent}• Courses: {', '.join(inline_courses[:12])} ... (+{len(inline_courses)-12} more)")
#             else:
#                 print(f"{course_indent}• Courses: {', '.join(inline_courses)}")
                
#         # Print custom string rules if no courses were cleanly extracted
#         elif raw_rule:
#             rule_indent = "    " * (depth + 1)
#             clean_rule = raw_rule.replace('\n', ' | ')
#             print(f"{rule_indent}• Rule: {clean_rule}")

#         # Recursively print children
#         if node["children"]:
#             print_tree_skeleton(node["children"], depth + 1)

# print_tree_skeleton(tree)
import json
with open("uva_cs_audit.json", "w") as f:
    json.dump(tree, f, indent=4)

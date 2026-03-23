# from anytree import Node, RenderTree # manages the tree data structure
import pandas as pd # dataframes

reqs = pd.read_csv("audit_requirements-2026.csv")
print(reqs)

def classify_requirement(constraint): # takes constraints, isolates only "fulfill all" and "fulfill any" for now, for simplicity
    if pd.isna(constraint):
        return None
    constraint = constraint.strip().lower()
    if constraint.startswith('fulfill all'):
        return 'fulfill_all'
    elif constraint.startswith('fulfill any'):
        return 'fulfill_any'
    return

"""
Take requirements and get a list of all the classes that are needed for it ("fulfill all")
Group the "fulfill any" classes together as being "equivalent" for that program's purposes
Then, we can treat "fulfill any" classes as one "fulfill all" unit
"""

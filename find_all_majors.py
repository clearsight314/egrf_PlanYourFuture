# from anytree import Node, RenderTree # manages the tree data structure
import pandas as pd # dataframes
import sys
reqs = pd.read_csv("audit_requirements-2026.csv")
# print(reqs.columns.tolist())
reqs.columns = ['Program_ID', 'Program_Name', 'Program_Code', 'Audit_ID', 'Audit_Name', 
                'Audit_Start_Entry_Year', 'Audit_End_Entry_Year', 'Parent_Requirement_ID', 
                'Parent_Requirement_Name', 'Requirement_ID', 'Requirement_Name', 
                'Is_Uni_Req', 'Subrequirement_Level', 'Constraint'] # remove spaces
#print(reqs)

hash_set = set()
def find_all_majors():
    for Program_Name, col_data in reqs.items():
        if col_data in hash_set:
            continue
        else:
            hash_set.add(col_data)
    print(hash_set)


if __name__ == "__main__":
    find_all_majors()
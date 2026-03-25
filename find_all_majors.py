# from anytree import Node, RenderTree # manages the tree data structure
import pandas as pd # dataframes
import hashlib
import re

reqs = pd.read_csv("audit_requirements-2026.csv", usecols=["Program Name"])
# print(reqs.columns.tolist())

hash_set = set(reqs["Program Name"])
#get rid of PHD's from set
hash_set = {item for item in hash_set if "PhD" not in item and "PHD" not in item}
#delete all columns that should be deleted
hash_set = {item for item in hash_set if "DELETE" not in item}
hash_set = {item for item in hash_set if "MS" not in item and "MA" not in item and "ME" not in item }
hash_set_2nd_major = {item for item in hash_set if "2m" in item}


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
    paren_list_unknown = sorted({item for item in paren_list if "Minor" not in item and "BA" not in item and "BS" not in item and '2' not in item})
    #print(paren_list)
    print(paren_list_unknown)
    return paren_list
    
    


if __name__ == "__main__":
    #find_all_majors()
    get_parentheses_info()
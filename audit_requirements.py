# from anytree import Node, RenderTree # manages the tree data structure
import pandas as pd # dataframes

reqs = pd.read_csv("audit_requirements-2026.csv")
# print(reqs.columns.tolist())
reqs.columns = ['Program_ID', 'Program_Name', 'Program_Code', 'Audit_ID', 'Audit_Name', 
                'Audit_Start_Entry_Year', 'Audit_End_Entry_Year', 'Parent_Requirement_ID', 
                'Parent_Requirement_Name', 'Requirement_ID', 'Requirement_Name', 
                'Is_Uni_Req', 'Subrequirement_Level', 'Constraint'] # remove spaces
#print(reqs)

def classify_requirement(constraint): # takes constraints, isolates only "fulfill all" and "fulfill any" for now, for simplicity
    if pd.isna(constraint):
        return "blank"
    constraint = constraint.strip().lower()
    if constraint.startswith('fulfill all'):
        return 'fulfill_all'
    elif constraint.startswith('fulfill any'):
        return 'fulfill_any'
    return "unknown"

"""
Take requirements and get a list of all the classes that are needed for it ("fulfill all")
Group the "fulfill any" classes together as being "equivalent" for that program's purposes
Then, we can treat "fulfill any" classes as one "fulfill all" unit
"""
records = list(reqs.itertuples(index=False))
print(records[434])

class_map = pd.DataFrame(columns=["Requirement", "Class List"]) # will store the data we want (eventually)

def get_classes(req_row, current_row, current_list=None): # recursive approach-- given the row of a parent requirement, give every subrequirement
    # input should be the integer of the requirement row number and then that plus 1 (most likely)
    # next step is to implement "take any"

    if current_list is None:
        current_list = []

    req_data = records[req_row]
    req_level = req_data.Subrequirement_Level
    name = req_data.Requirement_Name
    req_kind = classify_requirement(req_data.Constraint)

    curr_data = records[current_row]
    curr_level = curr_data.Subrequirement_Level
    curr_name = curr_data.Requirement_Name
    curr_kind = classify_requirement(curr_data.Constraint)
    if(curr_level <= req_level):
        return current_list
    elif curr_kind == "fulfill_all" :
        return current_list + get_classes(req_row,current_row+1)
    elif curr_kind == "blank":
        current_list.append(curr_name)
        return current_list + get_classes(req_row,current_row+1)
    elif curr_kind == "fulfill_any":
        options = []
        i = current_row + 1
        while i < len(records) and records[i].Subrequirement_Level > curr_level:
            options.append(records[i].Requirement_Name)
            i += 1
        current_list += [options]
        return current_list + get_classes(req_row, i)
    else:
        # don't recognize type, skip
        return current_list + get_classes(req_row,current_row+1)

def classes_by_major(major_name):
    starting_index = 0
    while records[starting_index].Program_Name != major_name:
        starting_index+=1
    second_index = starting_index + 1
    while classify_requirement(records[second_index].Constraint) == 'unknown':
        second_index+=1
    return get_classes(starting_index,second_index);     

print(classes_by_major("Computer Science (BS)"))
# from anytree import Node, RenderTree # manages the tree data structure
import pandas as pd # dataframes

programs = [
    "Aerospace Engineering (BS)", "African-American and African Studies (BA)", "Anthropology (BA)",
    "Applied Statistics (BA)", "Architecture (BS)", "Area Studies - Latin American Studies (BA)",
    "Art - Art History (BA)", "Art - Studio Art (BA)", "Astronomy (BA)", "Astronomy-Physics (BA)",
    "Astronomy-Physics (BS)", "Batten - Disciplines Plus - BS (ASUS)",
    "Batten - New College Curriculum Disciplines Plus Non-BS (ASUD)",
    "Batten - New College Curriculum Non-BS (ASUG)", "Batten - New College Curriculum for BS (ASUB)",
    "Batten \u2013 Disciplines Plus Transfer (BS)", "Behavioral Neuroscience (BS)", "Biology (BA)",
    "Biology (BS)", "Biomedical Engineering (BS)", "Chemical Engineering (BS)", "Chemistry (BA)",
    "Chemistry (BS)", "Chemistry - Biochemistry (BS)", "Chemistry - Chemical Education (BS)",
    "Chemistry - Chemical Physics (BS)", "Chemistry - Environmental Chemistry (BS)",
    "Chemistry - Materials (BS)", "Civil Engineering (BS)", "Classics (BA)",
    "Commerce - New College Curriculum for BS (ASUB)",
    "Commerce \u2013  New College Curriculum for Non-BS - (ASUG)", "Computer Engineering (BS)",
    "Computer Science (BA)", "Computer Science (BS)", "Data Science (BS)",
    "Data Science Graduation (BS) Requirements", "Disciplines Plus - BS (ASUS)", "Drama (BA)",
    "Economics (BA)", "Electrical Engineering (BS)", "Engineering Science (BS)", "English (BA)",
    "English - Medieval and Renaissance Studies (BA)", "English - Modern Literature and Culture (BA)",
    "English - Poetry Writing (BA)", "Environmental Sciences (BA)", "Environmental Sciences (BS)",
    "Foreign Affairs (BA)", "French (BA)", "German (BA)", "Government (BA)",
    "Government - Foreign Affairs (BA)", "Health Sciences Management (BPS)", "History (BA)",
    "Interdisciplinary (BA)", "Interdisciplinary - American Studies (BA)",
    "Interdisciplinary - Archaeology (BA)", "Interdisciplinary - Chinese Language and Literature (BA)",
    "Interdisciplinary - Cognitive Science (BA)", "Interdisciplinary - Computer Science (BA)",
    "Interdisciplinary - East Asian Studies (BA)", "Interdisciplinary - Echols Scholar (BA)",
    "Interdisciplinary - Environmental Thought and Practice (BA)",
    "Interdisciplinary - German Studies (BA)", "Interdisciplinary - Global Development Studies (BA)",
    "Interdisciplinary - Global Studies (BA)", "Interdisciplinary - Human Biology (BA)",
    "Interdisciplinary - Japanese Language and Literature (BA)",
    "Interdisciplinary - Jewish Studies (BA)", "Interdisciplinary - Linguistics (BA)",
    "Interdisciplinary - Medieval Studies (BA)",
    "Interdisciplinary - Middle Eastern Languages and Literatures (BA)",
    "Interdisciplinary - Middle Eastern Studies (BA)", "Interdisciplinary - Neuroscience (BA)",
    "Interdisciplinary - Political Philosophy, Policy, and Law (BA)",
    "Interdisciplinary - Political and Social Thought (BA)",
    "Interdisciplinary - South Asian Languages and Literatures (BA)",
    "Interdisciplinary - South Asian Studies (BA)", "Interdisciplinary - Statistics (BA)",
    "Interdisciplinary - Women, Gender and Sexuality (BA)", "Interdisciplinary Studies (BIS)",
    "Italian (BA)", "Materials Science and Engineering (BS)", "Mathematics (BA)",
    "Mathematics - Financial Mathematics (BA)", "Mathematics - Graduate Preparatory (BA)",
    "Mathematics - Probability and Statistics (BA)", "Mathematics - Teacher Education (BA)",
    "Mechanical Engineering (BS)", "Media Studies (BA)", "Music (BA)",
    "New College Curriculum Non-BS - (ASUG)", "New College Curriculum for BS (ASUB)",
    "New College Curriculum \u2013 Disciplines Plus Non-BS (ASUD)",
    "New College Curriculum \u2013 Disciplines Plus Transfer (BS)", "Philosophy (BA)", "Physics (BA)",
    "Physics (BS)", "Psychology (BA)", "Public Policy and Leadership (BA)",
    "Religious Studies (BA)", "Slavic Languages and Literatures (BA)",
    "Slavic Languages and Literatures - Russian and East European Studies (BA)", "Sociology (BA)",
    "Spanish (BA)", "Statistics (BS)", "Systems Engineering (BS)",
    "Urban and Environmental Planning (BUEP)", "African-American and African Studies (Min)",
    "American Sign Language (Min)", "Chinese Language and Literature (Min)",
    "Creative Writing (Min)", "Data Analytics (Min)", "Global Culture and Commerce (Min)",
    "Health, Ethics, & Society (mn)", "History of Science and Technology (Min)",
    "Japanese Language and Literature (Min)", "Korean Language and Literature (Min)",
    "Languages, Literatures and Cultures of the Spanish-Speaking World (mn)",
    "Native American Indigenous Studies (Min)", "Public Writing and Rhetoric (Mn)",
    "Russian and East European Studies (Min)", "Science and Technology Policy (Min)",
    "Statistical Analysis of Social Behavior (Min)", "Statistics (Min)",
    "Technology and Environment (Min)", "Urban and Environmental Planning (Min)",
    "Women, Gender and Sexuality (Min)", "Aerospace Engineering (BS-2mj)",
    "African-American and African Studies (2mj)", "Anthropology (BA-2mj)",
    "Architectural History (BARH-2mj)", "Architecture (BS-2mj)",
    "Area Studies - Latin American Studies (BA-2mj)", "Art - Art History (BA-2mj)",
    "Art - Studio Art (BA-2mj)", "Astronomy (BA-2mj)", "Astronomy-Physics (BS-2mj)",
    "Biology (BA-2mj)", "Biology (BS-2mj)", "Biomedical Engineering (BS-2mj)",
    "Chemical Engineering (BS-2mj)", "Chemistry (BA-2mj)", "Chemistry (BS-2mj)",
    "Chemistry - Biochemistry (BS-2mj)", "Chemistry - Chemical Education (BS-2mj)",
    "Chemistry - Chemical Physics (BS-2mj)", "Chemistry - Environmental Chemistry (BS-2mj)",
    "Chemistry - Materials (BS-2mj)", "Civil Engineering (BS-2mj)", "Classics (BA-2mj)",
    "Computer Engineering (BS-2mj)", "Computer Science (BS-2mj)", "Drama (BA-2mj)",
    "Economics (BA-2mj)", "Electrical Engineering (BS-2mj)", "Engineering Science (BS-2mj)",
    "English (BA-2mj)", "English - Modern Literature and Culture (BA-2mj)",
    "English - Poetry Writing (BA-2mj)", "Environmental Sciences (BA-2mj)",
    "Environmental Sciences (BS-2mj)", "Foreign Affairs (BA-2mj)", "French (BA-2mj)",
    "German (BA-2mj)", "Government (BA-2mj)", "Government - Foreign Affairs (2mj)",
    "History (BA-2mj)", "Interdisciplinary (2mj)", "Interdisciplinary - American Studies (BA-2mj)",
    "Interdisciplinary - Archaeology (BA-2mj)",
    "Interdisciplinary - Chinese Language and Literature (2mj)",
    "Interdisciplinary - Cognitive Science (2mj)", "Interdisciplinary - Computer Science (BA-2mj)",
    "Interdisciplinary - East Asian Studies (2mj)", "Interdisciplinary - Echols Scholar (BA-2mj)",
    "Interdisciplinary - Environmental Thought and Practice (2mj)",
    "Interdisciplinary - German Studies (BA-2mj)", "Interdisciplinary - Global Studies (BA-2mj)",
    "Interdisciplinary - Japanese Language and Literature (2mj)",
    "Interdisciplinary - Jewish Studies (BA-2mj)", "Interdisciplinary - Linguistics (BA-2mj)",
    "Interdisciplinary - Medieval Studies (BA-2mj)",
    "Interdisciplinary - Middle Eastern Languages and Literatures (2mj)",
    "Interdisciplinary - Middle Eastern Studies (2mj)", "Interdisciplinary - Neuroscience (BA-2mj)",
    "Interdisciplinary - Political and Social Thought (2mj)",
    "Interdisciplinary - South Asian Languages and Literatures (2mj)",
    "Interdisciplinary - South Asian Studies (2mj)", "Interdisciplinary - Statistics (BA-2mj)",
    "Interdisciplinary - Women, Gender and Sexuality (2mj", "Italian (BA-2mj)",
    "Materials Science and Engineering (BS2mj)", "Mathematics (BA-2mj)",
    "Mathematics - Financial Mathematics (BA-2mj)", "Mathematics - Graduate Preparatory (BA-2mj)",
    "Mathematics - Probability and Statistics (BA-2mj)", "Mathematics - Teacher Education (BA-2mj)",
    "Mechanical Engineering (BS-2mj)", "Music (BA-2mj)", "Philosophy (BA-2mj)",
    "Physics (BA-2mj)", "Physics (BS-2mj)", "Psychology (BA-2mj)", "Religious Studies (BA-2mj)",
    "Slavic Languages and Literatures (BA-2mj)",
    "Slavic Languages and Literatures - Russian and East European Studies (BA-2mj)",
    "Sociology (BA-2mj)", "Spanish (BA-2mj)", "Speech Communication Disorders (2mj)",
    "Systems Engineering (BS-2mj)", "Urban and Environmental Planning (BUEP-2mj)",
    "African Studies (2mn)", "African-American and African Studies (2mn)",
    "American Sign Language (2mn)", "Anthropology (2mn)", "Archaeology (2mn)",
    "Art History (2mn)", "Asian Pacific American Studies (2mn)", "Astronomy (2mn)",
    "Biology (2mn)", "Business Spanish (2mn)", "Chinese Language and Literature (2mn)",
    "Comparative Literature (2mn)", "Creative Writing (2mn)", "Dance (2mn)",
    "Data Analytics (2mn)", "Drama (2mn)", "East Asian Studies (2mn)", "Economics (2mn)",
    "English (2mn)", "Environmental Sciences (2mn)", "Foreign Affairs (2mn)", "French (2mn)",
    "German (2mn)", "German Studies (2mn)", "Global Culture and Commerce (2mn)",
    "Government (2mn)", "Greek (2mn)", "Health, Ethics, & Society (2mn)", "History (2mn)",
    "Italian (2mn)", "Japanese Language and Literature (2mn)", "Jewish Studies (2mn)",
    "Korean Language and Literature (2mn)", "Latin (2mn)", "Latin American Studies (2mn)",
    "Linguistics (2mn)", "Mathematics (2mn)", "Medieval Studies (2mn)",
    "Middle Eastern Studies (2mn)", "Native American Indigenous Studies (2mn)",
    "Philosophy (2mn)", "Physics (2mn)", "Portuguese (2mn)", "Psychology (2mn)",
    "Religious Studies (2mn)", "Russian Language, Literature, and Culture (2mn)",
    "Russian and East European Studies (2mn)", "Sociology (2mn)", "South Asian Studies (2mn)",
    "Spanish (2mn)", "Statistical Analysis of Social Behavior (2mn)", "Statistics (2mn)",
    "Studio Art (2mn)", "U.S. Latinx Studies (2mn)", "Women, Gender and Sexuality (2mn)",
]

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

# now want to generate a new pandas dataframe (and then CSV) that has all majors and then all the classes needed for that major
major_classes_dict = {"Program": programs, "Classes": [None] * len(programs)}
major_classes = pd.DataFrame(data=major_classes_dict)

for i in range(len(major_classes)):
    major_classes.at[i, 'Classes'] = classes_by_major(major_classes.at[i, 'Program'])

print(major_classes)

major_classes.to_csv('major_classes.csv') 
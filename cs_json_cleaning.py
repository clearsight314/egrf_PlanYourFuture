import re

with open("./uva_cs_audit.json", "r") as f:
    text_data = f.read()

cleaned_data = re.sub(r': NaN', ': null', text_data)

with open("uva_cs_audit_cleaned.json", "w") as f:
    f.write(cleaned_data)

print("JSON cleaned and saved to uva_cs_audit_cleaned.json")

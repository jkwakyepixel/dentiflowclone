import sys

with open('src/pages/Admissions.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1
content = content.replace("a.dentist.startsWith('Dr.') ? a.dentist : `Dr. ${a.dentist}`", "a.dentist ? (a.dentist.startsWith('Dr.') ? a.dentist : `Dr. ${a.dentist}`) : 'Unassigned'")

# Fix 2
content = content.replace("{item.dentist} •", "{item.dentist ? (item.dentist.startsWith('Dr.') ? item.dentist : 'Dr. ' + item.dentist) : 'Unassigned'} •")

content = content.replace(">\n                  {item.dentist}\n                </div>", ">\n                  {item.dentist ? (item.dentist.startsWith('Dr.') ? item.dentist : 'Dr. ' + item.dentist) : 'Unassigned'}\n                </div>")

with open('src/pages/Admissions.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

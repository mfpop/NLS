"""Update QualityControlPage.tsx issue/action detail views to match Production design."""
import re

path = r"D:\02_Work\localai\lmd\frontend\src\pages\check\QualityControlPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add new issue state vars after `const [iOwner, setIOwner] = useState("");`
new_issue_vars = """  const [iProblemType, setIProblemType] = useState("QUALITY");
  const [iDueDate, setIDueDate] = useState("");
  const [iNotes, setINotes] = useState("");
  const [iSourceType, setISourceType] = useState("MANUAL");
  const [iSourceId, setISourceId] = useState<number | null>(null);"""

content = content.replace(
    '  const [iOwner, setIOwner] = useState("");',
    '  const [iOwner, setIOwner] = useState("");\n' + new_issue_vars
)

# 2. Add new edit issue state vars after `const [editIDesc, setEditIDesc] = useState("");`
new_edit_issue_vars = """  const [editIOwner, setEditIOwner] = useState("");
  const [editIDueDate, setEditIDueDate] = useState("");
  const [editINotes, setEditINotes] = useState("");
  const [editISourceType, setEditISourceType] = useState("MANUAL");
  const [editISourceId, setEditISourceId] = useState<number | null>(null);"""

content = content.replace(
    '  const [editIDesc, setEditIDesc] = useState("");',
    '  const [editIDesc, setEditIDesc] = useState("");\n' + new_edit_issue_vars
)

# 3. Add new action state vars after `const [aDesc, setADesc] = useState("");`
new_action_vars = """  const [aNotes, setANotes] = useState("");
  const [aSourceType, setASourceType] = useState("MANUAL");
  const [aSourceId, setASourceId] = useState<number | null>(null);"""

content = content.replace(
    '  const [aDesc, setADesc] = useState("");',
    '  const [aDesc, setADesc] = useState("");\n' + new_action_vars
)

# 4. Add new edit action state vars after `const [editADesc, setEditADesc] = useState("");`
new_edit_action_vars = """  const [editADescription, setEditADescription] = useState("");
  const [editANotes, setEditANotes] = useState("");
  const [editASourceType, setEditASourceType] = useState("MANUAL");
  const [editASourceId, setEditASourceId] = useState<number | null>(null);"""

content = content.replace(
    '  const [editADesc, setEditADesc] = useState("");',
    '  const [editADesc, setEditADesc] = useState("");\n' + new_edit_action_vars
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("State variables added successfully")

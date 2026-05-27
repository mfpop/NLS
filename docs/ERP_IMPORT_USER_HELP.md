# ERP Import — User Help / Instructions

## Purpose
Use ERP Import to update LeanSync data from ERP files by using saved ERP Patterns.

ERP Pattern defines **how data maps**.  
ERP Import uses that pattern to **validate and import data**.

---

## Main Flow

### 1. Upload sample ERP file
Open **ERP Pattern** and upload a sample ERP file.

Supported source examples:
- Excel `.xlsx`
- CSV `.csv`
- JSON `.json`
- XML `.xml`

The sample file is used to detect source fields.

---

### 2. Create ERP Pattern
Create a new ERP Pattern.

Fill in:
- Pattern Name
- Scope
- Destination Entity
- Source File Pattern
- Description, if needed

---

### 3. Select Source File Pattern
Select the uploaded sample file or define a file pattern.

Examples:
- `Departments.xlsx`
- `Resources.csv`
- `RG_Dashboard*.xlsx`

The pattern is later used to match real ERP import files.

---

### 4. Map Fields
Map ERP source fields to LeanSync destination fields.

Rules:
- Required destination fields must be mapped.
- Optional fields may stay unmapped.
- Destination fields are controlled by the selected Destination Entity.
- ERP Import page does not edit mappings.

---

### 5. Save ERP Pattern
Save the ERP Pattern.

After saving:
- Source schema is stored in the database.
- Field mappings are stored in the database.
- The original sample file is no longer required.

---

## Import Data from ERP

### 6. Open ERP Import
Open **ERP Import**.

The page lists saved ERP Patterns.

---

### 7. Upload real ERP source file
Upload the real ERP file that will update LeanSync data.

The file must match the saved Source File Pattern.

Examples:
- Pattern: `Resources*.xlsx`
- Valid file: `Resources_May.xlsx`
- Invalid file: `Departments_May.xlsx`

---

### 8. Select ERP Pattern
Select the ERP Pattern row that should process the uploaded file.

The system automatically validates the selected pattern and matching source file.

---

### 9. Review Validation Status
Possible statuses:

| Status | Meaning |
|---|---|
| `MISSING_FILE` | No uploaded file matches the pattern. |
| `MISSING_FIELDS` | Source file is missing required mapped fields. |
| `INVALID_FILE` | File type or format is invalid. |
| `READY` | File is valid and ready to import. |
| `IMPORTED` | Import completed. |
| `FAILED` | Import failed. |

Import is allowed only when status is `READY`.

---

### 10. Run Import / Update
When validation status is `READY`:

1. Select the row.
2. Click **Import / Update**.
3. Confirm the operation.

The backend updates LeanSync data using:
- selected ERP Pattern
- matched ERP source file
- saved field mappings

---

### 11. Review Import Result
After import, review result counts:

- Added
- Updated
- Not Updated
- Failed

These counts come from backend import results.

---

### 12. Review Import Logs
Import logs remain visible after import and reset.

Logs should show:
- Pattern name
- Source file
- Destination entity
- User
- Timestamp
- Added / Updated / Not Updated / Failed counts
- Errors or warnings

---

## Reset Workspace

Use **Reset** only when needed.

Reset does:
- refresh ERP Pattern list
- clear selected rows
- clear validation state
- delete ERP source files from source folder

Reset does **not** delete:
- ERP Patterns
- saved source schemas
- field mappings
- import logs

Reset requires confirmation.

---

## Important Rules

- ERP Pattern is the mapping source of truth.
- ERP Import never edits mappings.
- Frontend does not parse ERP files.
- Backend validates files and executes import.
- Import is blocked unless validation status is `READY`.
- Wrong filename should return `MISSING_FILE`.
- Wrong extension should return `INVALID_FILE`.
- Logs must remain readable after reset.

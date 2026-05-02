@echo off
setlocal

REM ============================================================
REM  PROJECT STRUCTURE SNAPSHOT
REM  Regenerates structure.txt with the current file tree,
REM  excluding .venv, node_modules, .git, __pycache__, and *.pyc
REM ============================================================

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set PROJECT_ROOT=%%~fI
set OUT=%SCRIPT_DIR%structure.txt

powershell -NoProfile -Command ^
  "Get-ChildItem -Path '%PROJECT_ROOT%' -Recurse -File | " ^
  "Where-Object { $_.FullName -notmatch '\\\.venv\\|\\node_modules\\|\\\.git\\|\\__pycache__\\|\.pyc$' } | " ^
  "ForEach-Object { $_.FullName.Replace('%PROJECT_ROOT%\\', '') } | " ^
  "Sort-Object | " ^
  "Set-Content -Path '%OUT%' -Encoding UTF8"

echo tools\structure.txt updated.

endlocal

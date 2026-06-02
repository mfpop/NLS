from __future__ import annotations
import os
import re
from pathlib import Path
from typing import Optional


def find_files(workspace: str, pattern: str, subdirs: Optional[list[str]] = None) -> list[str]:
    root = Path(workspace)
    if subdirs:
        paths = []
        for sd in subdirs:
            p = root / sd
            if p.exists():
                paths.extend(str(f) for f in p.rglob(pattern))
        return paths
    return [str(f) for f in root.rglob(pattern)]


def read_file(path: str) -> Optional[str]:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


def find_class_definitions(content: str, class_base: Optional[str] = None) -> list[dict]:
    pattern = r"class\s+(\w+)(\(.*?\))?:"
    matches = []
    for m in re.finditer(pattern, content):
        name = m.group(1)
        bases = m.group(2) or ""
        if class_base and class_base not in bases:
            continue
        matches.append({"name": name, "bases": bases.strip("()") if bases else ""})
    return matches


def find_function_definitions(content: str) -> list[dict]:
    pattern = r"(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*(\w+))?\s*:"
    matches = []
    for m in re.finditer(pattern, content):
        matches.append({
            "name": m.group(1),
            "params": [p.strip() for p in m.group(2).split(",") if p.strip()],
            "return_type": m.group(3) or "None",
        })
    return matches


def count_lines_of_code(content: str) -> int:
    return len([l for l in content.splitlines() if l.strip() and not l.strip().startswith("#")])


def find_imports(content: str, package: str) -> list[str]:
    pattern = rf"(?:from\s+{package}\.|import\s+{package}\.)"
    return re.findall(pattern, content)

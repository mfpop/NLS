import json
import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

_ERP_ROOT: str = ""

def _resolve_erp_root() -> str:
    root = getattr(settings, "ERP_DATA_ROOT", None)
    if not root:
        BASE = getattr(settings, "BASE_DIR", Path(__file__).resolve().parent.parent.parent)
        root = str(Path(BASE) / "erp_data")
    return root

_ERP_ROOT = _resolve_erp_root()

FOLDERS = {
    "source": "source",
    "patterns": "patterns",
    "structure": "structure",
    "imported": "imported",
    "archive": "archive",
    "error": "error",
}

LOG_FILE = "import.log"

TRAVERSAL_RE = re.compile(r"(\.\./|\.\.\\)")


class ERPStorageError(Exception):
    pass


class ERPStorageService:
    """Standardized file operations under erp_data/."""

    _root_override: Optional[str] = None

    @staticmethod
    def root() -> str:
        if ERPStorageService._root_override:
            return ERPStorageService._root_override
        return _ERP_ROOT

    @staticmethod
    def ensure_folder_structure() -> dict[str, str]:
        """Create required folders under erp_data/ if missing.  Returns a dict of
        ``{folder_key: absolute_path}``."""
        paths = {}
        for key, relative in FOLDERS.items():
            abspath = os.path.join(ERPStorageService.root(), relative)
            os.makedirs(abspath, exist_ok=True)
            paths[key] = abspath
        # ensure log file exists
        log_path = os.path.join(ERPStorageService.root(), LOG_FILE)
        if not os.path.isfile(log_path):
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"# ERP Import Log — created {datetime.now().isoformat()}\n")
            except OSError:
                pass
        return paths

    # ── Path safety ────────────────────────────────────────────────────

    @staticmethod
    def _normalize_relative_path(user_path: str) -> str:
        """Strip dangerous characters and return a safe relative path."""
        cleaned = TRAVERSAL_RE.sub("", user_path.strip())
        cleaned = cleaned.lstrip("/").lstrip("\\")
        return cleaned

    @staticmethod
    def _resolve(sub_dir: str, file_name: str) -> str:
        """Return an absolute path inside a sub-directory of erp_data/.

        Raises ``ERPStorageError`` on path traversal or unknown sub-dir.
        """
        if sub_dir not in FOLDERS:
            raise ERPStorageError(f"Unknown storage folder: {sub_dir!r}")
        safe_name = ERPStorageService._normalize_relative_path(file_name)
        if not safe_name:
            raise ERPStorageError("Empty file name after sanitisation")
        abspath = os.path.normpath(os.path.join(ERPStorageService.root(), FOLDERS[sub_dir], safe_name))
        expected_prefix = os.path.normpath(os.path.join(ERPStorageService.root(), FOLDERS[sub_dir]))
        if not abspath.startswith(expected_prefix):
            raise ERPStorageError(f"Path traversal detected for {file_name!r}")
        return abspath

    @staticmethod
    def validate_allowed_path(proposed_path: str) -> bool:
        """Return True if *proposed_path* is inside erp_data/."""
        norm = os.path.normpath(proposed_path)
        root_norm = os.path.normpath(ERPStorageService.root())
        return norm.startswith(root_norm)

    # ── Write operations ───────────────────────────────────────────────

    @staticmethod
    def save_pattern_file(file_name: str, content: bytes) -> str:
        """Save a template / empty pattern file to ``patterns/``.

        Returns the absolute path of the saved file.
        """
        ERPStorageService.ensure_folder_structure()
        dest = ERPStorageService._resolve("patterns", file_name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(content)
        logger.info("Saved pattern file: %s", dest)
        ERPStorageService.append_import_log(
            source="patterns", file_name=file_name, status="PATTERN_SAVED",
            message=f"Pattern file saved to {dest}",
        )
        return dest

    @staticmethod
    def save_source_file(file_name: str, content: bytes) -> str:
        """Save a real ERP source file to ``source/``.

        Returns the absolute path.
        """
        ERPStorageService.ensure_folder_structure()
        dest = ERPStorageService._resolve("source", file_name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(content)
        logger.info("Saved source file: %s", dest)
        ERPStorageService.append_import_log(
            source="source", file_name=file_name, status="SOURCE_SAVED",
            message=f"Source file saved to {dest}",
        )
        return dest

    @staticmethod
    def save_mapping_profile(profile_name: str, data: dict) -> str:
        """Save a mapping profile JSON to ``structure/``.

        Returns the absolute path.
        """
        ERPStorageService.ensure_folder_structure()
        safe_name = profile_name.strip().replace(" ", "_")
        if not safe_name.endswith(".json"):
            safe_name += ".json"
        dest = ERPStorageService._resolve("structure", safe_name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        logger.info("Saved mapping profile: %s", dest)
        return dest

    @staticmethod
    def read_mapping_profile(profile_name: str) -> Optional[dict]:
        """Read a mapping profile JSON from ``structure/``.

        Returns the parsed dict or None if not found.
        """
        safe_name = profile_name.strip().replace(" ", "_")
        if not safe_name.endswith(".json"):
            safe_name += ".json"
        dest = ERPStorageService._resolve("structure", safe_name)
        if not os.path.isfile(dest):
            return None
        with open(dest, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def move_to_imported(file_path: str) -> str:
        """Move a successfully processed file to ``imported/``.

        The destination name includes a timestamp to avoid collisions.
        Returns the new absolute path.
        """
        ERPStorageService.ensure_folder_structure()
        if not ERPStorageService.validate_allowed_path(file_path):
            raise ERPStorageError("Cannot move file outside erp_data/")
        src = Path(file_path)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_name = f"{src.stem}_{ts}{src.suffix}"
        dest = ERPStorageService._resolve("imported", dest_name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(str(src), str(dest))
        logger.info("Moved to imported: %s -> %s", file_path, dest)
        ERPStorageService.append_import_log(
            source="imported", file_name=src.name, status="IMPORTED",
            message=f"File moved to {dest}",
        )
        return str(dest)

    @staticmethod
    def move_to_error(file_path: str, error_info: Optional[dict] = None) -> str:
        """Move or copy a failed file to ``error/`` and optionally write an
        error artifact JSON beside it.

        Returns the absolute path of the error artifact (or the moved file).
        """
        ERPStorageService.ensure_folder_structure()
        if not ERPStorageService.validate_allowed_path(file_path):
            raise ERPStorageError("Cannot move file outside erp_data/")
        src = Path(file_path)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_name = f"{src.stem}_{ts}{src.suffix}"
        dest = ERPStorageService._resolve("error", dest_name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)

        # Try to move; fall back to copy if the file is already in error/
        try:
            shutil.move(str(src), str(dest))
        except shutil.Error:
            shutil.copy2(str(src), str(dest))

        # Write error artifact JSON
        if error_info:
            artifact_name = f"{src.stem}_{ts}_error.json"
            artifact_path = ERPStorageService._resolve("error", artifact_name)
            with open(artifact_path, "w", encoding="utf-8") as f:
                json.dump(error_info, f, indent=2, default=str)
            logger.info("Moved to error: %s ; artifact: %s", file_path, artifact_path)
            ERPStorageService.append_import_log(
                source="error", file_name=src.name, status="ERROR",
                message=f"File moved to {dest}; error artifact at {artifact_path}",
            )
            return artifact_path

        logger.info("Moved to error: %s -> %s", file_path, dest)
        ERPStorageService.append_import_log(
            source="error", file_name=src.name, status="ERROR",
            message=f"File moved to {dest}",
        )
        return str(dest)

    @staticmethod
    def archive_file(file_path: str) -> str:
        """Move an older processed file to ``archive/``.

        Returns the new absolute path.
        """
        ERPStorageService.ensure_folder_structure()
        if not ERPStorageService.validate_allowed_path(file_path):
            raise ERPStorageError("Cannot archive file outside erp_data/")
        src = Path(file_path)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_name = f"{src.stem}_{ts}{src.suffix}"
        dest = ERPStorageService._resolve("archive", dest_name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(str(src), str(dest))
        logger.info("Archived: %s -> %s", file_path, dest)
        return str(dest)

    @staticmethod
    def append_import_log(
        source: str = "",
        file_name: str = "",
        status: str = "",
        user: str = "",
        message: str = "",
        job_id: str = "",
    ) -> None:
        """Append a single line to ``erp_data/import.log``."""
        ERPStorageService.ensure_folder_structure()
        log_path = os.path.join(ERPStorageService.root(), LOG_FILE)
        ts = datetime.now().isoformat()
        line = (
            f"{ts} | {source:12s} | {status:15s} | {user:20s} | {job_id:12s} | "
            f"{file_name} | {message}\n"
        )
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(line)
        except OSError as exc:
            logger.warning("Failed to write import log: %s", exc)

    @staticmethod
    def list_files(sub_dir: str) -> list[dict]:
        """List files inside a sub-directory of erp_data/.

        Returns a list of ``{"name": ..., "path": ..., "size": ..., "modified": ...}``.
        """
        if sub_dir not in FOLDERS:
            raise ERPStorageError(f"Unknown storage folder: {sub_dir!r}")
        folder = os.path.join(ERPStorageService.root(), FOLDERS[sub_dir])
        if not os.path.isdir(folder):
            return []
        entries = []
        for entry in sorted(os.listdir(folder)):
            full = os.path.join(folder, entry)
            if os.path.isfile(full):
                st = os.stat(full)
                entries.append({
                    "name": entry,
                    "path": full,
                    "size": st.st_size,
                    "modified": datetime.fromtimestamp(st.st_mtime).isoformat(),
                })
        return entries

    @staticmethod
    def read_file(sub_dir: str, file_name: str) -> Optional[bytes]:
        """Read the content of a file inside a sub-directory of erp_data/."""
        abspath = ERPStorageService._resolve(sub_dir, file_name)
        if not os.path.isfile(abspath):
            return None
        with open(abspath, "rb") as f:
            return f.read()

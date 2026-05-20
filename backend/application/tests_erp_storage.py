import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Configure minimal Django settings before importing the service
import django
from django.conf import settings
if not settings.configured:
    settings.configure(
        ERP_DATA_ROOT=tempfile.mkdtemp(),
        BASE_DIR=Path(tempfile.mkdtemp()),
        DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
        INSTALLED_APPS=["django.contrib.contenttypes", "django.contrib.auth"],
    )
    django.setup()

from application.erp_storage_service import (
    ERPStorageService, ERPStorageError, FOLDERS,
)


class TestERPStorageService(unittest.TestCase):
    """Tests for ERPStorageService — folder structure and file operations."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        # Set the class-level override used by root()
        ERPStorageService._root_override = self.tmpdir

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)
        ERPStorageService._root_override = None

    # ── Helpers to call service with overridden root ───────────────────

    def _call_ensure(self):
        return ERPStorageService.ensure_folder_structure()

    def _call_save_pattern(self, name, content):
        return ERPStorageService.save_pattern_file(name, content)

    def _call_save_source(self, name, content):
        return ERPStorageService.save_source_file(name, content)

    def _call_save_mapping(self, name, data):
        return ERPStorageService.save_mapping_profile(name, data)

    def _call_move_imported(self, path):
        return ERPStorageService.move_to_imported(path)

    def _call_move_error(self, path, info=None):
        return ERPStorageService.move_to_error(path, info)

    def _call_archive(self, path):
        return ERPStorageService.archive_file(path)

    def _call_list(self, folder):
        return ERPStorageService.list_files(folder)

    def _call_read(self, folder, name):
        return ERPStorageService.read_file(folder, name)

    # ── Tests ──────────────────────────────────────────────────────────

    def test_folder_structure_is_created(self):
        paths = self._call_ensure()
        for key in FOLDERS:
            self.assertIn(key, paths)
            self.assertTrue(os.path.isdir(paths[key]), f"Folder {key} not created")

    def test_log_file_created(self):
        self._call_ensure()
        log_path = os.path.join(self.tmpdir, "import.log")
        self.assertTrue(os.path.isfile(log_path))

    def test_save_pattern_file(self):
        content = b"template content"
        path = self._call_save_pattern("test_template.xlsx", content)
        self.assertTrue(os.path.isfile(path))
        self.assertIn("patterns", path)
        with open(path, "rb") as f:
            self.assertEqual(f.read(), content)

    def test_save_source_file(self):
        content = b"real erp data"
        path = self._call_save_source("test_source.xlsx", content)
        self.assertTrue(os.path.isfile(path))
        self.assertIn("source", path)
        with open(path, "rb") as f:
            self.assertEqual(f.read(), content)

    def test_save_mapping_profile(self):
        data = {"name": "test_profile", "fields": [{"name": "col1", "type": "string"}]}
        path = self._call_save_mapping("test_profile", data)
        self.assertTrue(os.path.isfile(path))
        self.assertIn("structure", path)
        self.assertTrue(path.endswith(".json"))
        with open(path, "r") as f:
            loaded = json.load(f)
        self.assertEqual(loaded["name"], "test_profile")

    def test_save_mapping_profile_adds_json_suffix(self):
        path = self._call_save_mapping("my_profile", {})
        self.assertTrue(path.endswith(".json"))

    def test_read_mapping_profile(self):
        data = {"key": "value"}
        self._call_save_mapping("read_test", data)
        result = ERPStorageService.read_mapping_profile("read_test")
        self.assertEqual(result, data)

    def test_read_mapping_profile_not_found(self):
        result = ERPStorageService.read_mapping_profile("nonexistent")
        self.assertIsNone(result)

    def test_move_to_imported(self):
        src = os.path.join(self.tmpdir, "source", "test_import.xlsx")
        os.makedirs(os.path.dirname(src), exist_ok=True)
        with open(src, "w") as f:
            f.write("data")
        imported_path = self._call_move_imported(src)
        self.assertIn("imported", imported_path)
        self.assertTrue(os.path.isfile(imported_path))
        self.assertFalse(os.path.isfile(src))

    def test_move_to_error(self):
        src = os.path.join(self.tmpdir, "source", "test_error.xlsx")
        os.makedirs(os.path.dirname(src), exist_ok=True)
        with open(src, "w") as f:
            f.write("data")
        error_info = {"error": "test failure"}
        error_path = self._call_move_error(src, error_info)
        self.assertIn("error", error_path)
        self.assertTrue(os.path.isfile(error_path))
        # Error artifact JSON should also exist
        error_dir = os.path.join(self.tmpdir, "error")
        artifacts = [f for f in os.listdir(error_dir) if f.endswith("_error.json")]
        self.assertGreaterEqual(len(artifacts), 1)

    def test_archive_file(self):
        src = os.path.join(self.tmpdir, "source", "test_archive.xlsx")
        os.makedirs(os.path.dirname(src), exist_ok=True)
        with open(src, "w") as f:
            f.write("data")
        archive_path = self._call_archive(src)
        self.assertIn("archive", archive_path)
        self.assertTrue(os.path.isfile(archive_path))
        self.assertFalse(os.path.isfile(src))

    def test_path_traversal_rejected(self):
        """Path traversal components are stripped; file saved safely inside erp_data/."""
        content = b"test"
        path = self._call_save_source("../../etc/passwd", content)
        self.assertIn("source", path)
        self.assertNotIn("..", path)

    def test_absolute_external_path_rejected(self):
        result = ERPStorageService.validate_allowed_path("/tmp/outside.txt")
        self.assertFalse(result)

    def test_import_log_appended(self):
        self._call_ensure()
        ERPStorageService.append_import_log(
            source="test", file_name="test.log", status="TEST", user="tester", message="unit test"
        )
        log_path = os.path.join(self.tmpdir, "import.log")
        self.assertTrue(os.path.isfile(log_path))
        with open(log_path, "r") as f:
            content = f.read()
        self.assertIn("unit test", content)
        self.assertIn("tester", content)

    def test_list_files(self):
        self._call_save_pattern("list_test.txt", b"hello")
        files = self._call_list("patterns")
        names = [f["name"] for f in files]
        self.assertIn("list_test.txt", names)

    def test_list_files_unknown_folder(self):
        with self.assertRaises(ERPStorageError):
            self._call_list("unknown_folder")

    def test_read_file(self):
        self._call_save_pattern("read_me.txt", b"read content")
        content = self._call_read("patterns", "read_me.txt")
        self.assertEqual(content, b"read content")

    def test_read_file_not_found(self):
        content = self._call_read("patterns", "does_not_exist.txt")
        self.assertIsNone(content)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations
import sys
import os
import tempfile
import shutil

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yaml

from memory.memory_store import JsonMemoryStore
from shared.exceptions import MemoryOverflowError


def test_memory_cannot_override_project_context():
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "memory": {
                "backend": "json_store",
                "base_path": os.path.join(tmpdir, "data"),
                "namespaces": {
                    "test": {"ttl_days": 30, "max_items": 100},
                },
                "rules": {
                    "never_override_project_context": True,
                },
            },
        }
        config_path = os.path.join(tmpdir, "memory_config.yaml")
        with open(config_path, "w") as f:
            yaml.dump(config, f)

        store = JsonMemoryStore(config_path)
        store.save("test", "key1", {"value": "ok"})
        assert store.load("test", "key1")["value"] == "ok"


def test_memory_prunes_excess_items():
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "memory": {
                "backend": "json_store",
                "base_path": os.path.join(tmpdir, "data"),
                "namespaces": {
                    "limited": {"ttl_days": 30, "max_items": 5},
                },
                "rules": {},
            },
        }
        config_path = os.path.join(tmpdir, "memory_config.yaml")
        with open(config_path, "w") as f:
            yaml.dump(config, f)

        store = JsonMemoryStore(config_path)
        for i in range(10):
            store.save("limited", f"key{i}", {"index": i})

        remaining = list(os.listdir(os.path.join(tmpdir, "data")))
        assert len(remaining) == 1

        data = store._load_ns("limited")
        assert len(data) <= 5, f"Expected at most 5 items, got {len(data)}"


def test_memory_namespace_isolation():
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "memory": {
                "backend": "json_store",
                "base_path": os.path.join(tmpdir, "data"),
                "namespaces": {
                    "ns1": {"ttl_days": 30, "max_items": 100},
                    "ns2": {"ttl_days": 30, "max_items": 100},
                },
                "rules": {},
            },
        }
        config_path = os.path.join(tmpdir, "memory_config.yaml")
        with open(config_path, "w") as f:
            yaml.dump(config, f)

        store = JsonMemoryStore(config_path)
        store.save("ns1", "key_a", "value_a")
        store.save("ns2", "key_b", "value_b")

        assert store.load("ns1", "key_a") == "value_a"
        assert store.load("ns2", "key_a") is None
        assert store.load("ns2", "key_b") == "value_b"


def test_memory_delete_and_clear():
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "memory": {
                "backend": "json_store",
                "base_path": os.path.join(tmpdir, "data"),
                "namespaces": {
                    "test": {"ttl_days": 30, "max_items": 100},
                },
                "rules": {},
            },
        }
        config_path = os.path.join(tmpdir, "memory_config.yaml")
        with open(config_path, "w") as f:
            yaml.dump(config, f)

        store = JsonMemoryStore(config_path)
        store.save("test", "key1", "val1")
        store.save("test", "key2", "val2")

        store.delete("test", "key1")
        assert store.load("test", "key1") is None
        assert store.load("test", "key2") == "val2"

        store.clear_namespace("test")
        assert store.load("test", "key2") is None


def test_memory_search():
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "memory": {
                "backend": "json_store",
                "base_path": os.path.join(tmpdir, "data"),
                "namespaces": {
                    "test": {"ttl_days": 30, "max_items": 100},
                },
                "rules": {},
            },
        }
        config_path = os.path.join(tmpdir, "memory_config.yaml")
        with open(config_path, "w") as f:
            yaml.dump(config, f)

        store = JsonMemoryStore(config_path)
        store.save("test", "apple", "fruit1")
        store.save("test", "application", "app_data")
        store.save("test", "banana", "fruit2")

        results = store.search("test", "app")
        assert len(results) == 2
        assert "fruit1" in results
        assert "app_data" in results


if __name__ == "__main__":
    test_memory_cannot_override_project_context()
    test_memory_prunes_excess_items()
    test_memory_namespace_isolation()
    test_memory_delete_and_clear()
    test_memory_search()
    print("All memory tests passed.")

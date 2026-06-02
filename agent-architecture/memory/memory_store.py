from __future__ import annotations
import json
import os
from datetime import datetime, timedelta
from typing import Any, Optional

import yaml
from shared.interfaces import MemoryStore


class JsonMemoryStore(MemoryStore):
    def __init__(self, config_path: str = "memory/memory_config.yaml"):
        with open(config_path) as f:
            cfg = yaml.safe_load(f)

        self.base_path = cfg["memory"]["base_path"]
        self.namespaces = cfg["memory"]["namespaces"]
        self.rules = cfg["memory"].get("rules", {})
        os.makedirs(self.base_path, exist_ok=True)

    def _ns_path(self, namespace: str) -> str:
        return os.path.join(self.base_path, f"{namespace}.json")

    def _load_ns(self, namespace: str) -> dict:
        path = self._ns_path(namespace)
        if not os.path.exists(path):
            return {}
        with open(path) as f:
            return json.load(f)

    def _save_ns(self, namespace: str, data: dict) -> None:
        path = self._ns_path(namespace)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def save(self, namespace: str, key: str, value: Any) -> None:
        if self.rules.get("never_override_project_context", False):
            if isinstance(value, dict) and value.get("_source") == "project_context":
                raise PermissionError(
                    "Cannot store project_context data in memory. "
                    "project_context is the source of truth."
                )
        data = self._load_ns(namespace)
        data[key] = {
            "value": value,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._prune(namespace, data)
        self._save_ns(namespace, data)

    def load(self, namespace: str, key: str) -> Any:
        data = self._load_ns(namespace)
        entry = data.get(key)
        if entry is None:
            return None
        return entry["value"]

    def search(self, namespace: str, query: str, limit: int = 10) -> list[Any]:
        data = self._load_ns(namespace)
        results = []
        q = query.lower()
        for key, entry in data.items():
            if q in key.lower():
                results.append(entry["value"])
                if len(results) >= limit:
                    break
        return results

    def delete(self, namespace: str, key: str) -> None:
        data = self._load_ns(namespace)
        data.pop(key, None)
        self._save_ns(namespace, data)

    def clear_namespace(self, namespace: str) -> None:
        path = self._ns_path(namespace)
        if os.path.exists(path):
            os.remove(path)

    def _prune(self, namespace: str, data: dict) -> None:
        ns_cfg = self.namespaces.get(namespace)
        if not ns_cfg:
            return
        max_items = ns_cfg.get("max_items", 0)
        if max_items and len(data) > max_items:
            sorted_keys = sorted(
                data.keys(),
                key=lambda k: data[k].get("timestamp", ""),
            )
            excess = len(data) - max_items
            for k in sorted_keys[:excess]:
                del data[k]


def get_memory_store() -> MemoryStore:
    return JsonMemoryStore()

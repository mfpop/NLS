#!/usr/bin/env python3
"""Nexus Agent System — Main Entry Point for LeanSync."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging

import yaml

from execution.execution_loop import create_default_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s | %(message)s",
)
logger = logging.getLogger("nexus")


def setup_logging(config_path: str = "config/logging_config.yaml") -> None:
    try:
        with open(config_path) as f:
            cfg = yaml.safe_load(f)
        log_cfg = cfg.get("logging", {})
        if log_cfg.get("disable_existing_loggers", False):
            logging.getLogger().setLevel(
                getattr(logging, log_cfg.get("level", "INFO"))
            )
    except FileNotFoundError:
        pass


def main():
    setup_logging()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace = os.path.abspath(os.path.join(script_dir, ".."))
    loop = create_default_loop(workspace_root=workspace, context_base=script_dir)

    print("=" * 60)
    print("  Nexus Agent System — LeanSync")
    print("=" * 60)
    print("  Agent Entry:")
    print("    10. Manager             — Orchestrator (default entry)")
    print("")
    print("  Specialists:")
    print("    0. General Chat         — Coordination & triage")
    print("    1. Governance           — Rules & compliance")
    print("    2. Manufacturing Structure — Production hierarchy")
    print("    3. Architecture Audit   — Implementation verification")
    print("    4. Backend-GraphQL      — Django, GraphQL, API")
    print("    5. Frontend-UI          — React, Tailwind, Apollo")
    print("=" * 60)
    print("  Type 'exit' to quit.\n")

    while True:
        try:
            user_input = input("You: ")
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if user_input.lower() in ("exit", "quit"):
            break

        if not user_input.strip():
            continue

        result = loop.run(user_input)
        formatted = loop.result_formatter.format(result)
        print(f"\n{formatted}\n")


if __name__ == "__main__":
    main()

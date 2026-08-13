#!/usr/bin/env python3
"""Local-only safety preflight; never starts a model request."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path


SESSION_ID = re.compile(r"^[A-Za-z0-9._-]{1,96}$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check a disposable DSH SDK workspace")
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--session-root", required=True, type=Path)
    parser.add_argument("--session-id", required=True)
    return parser.parse_args()


def fail(message: str) -> int:
    print(f"BLOCKED_SAFETY: {message}")
    return 2


def main() -> int:
    args = parse_args()
    workspace = args.workspace.expanduser()
    sessions = args.session_root.expanduser()
    if not workspace.is_absolute() or not sessions.is_absolute():
        return fail("workspace and session-root must be absolute paths")
    if not SESSION_ID.fullmatch(args.session_id):
        return fail("session-id contains unsupported characters")

    home = Path.home().resolve()
    project = Path.cwd().resolve()
    if workspace.resolve() in {home, project}:
        return fail("workspace must not be the user home or project root")
    if sessions.resolve() in {home, project}:
        return fail("session-root must not be the user home or project root")
    if workspace.resolve() == sessions.resolve():
        return fail("workspace and session-root must be separate")

    sessions.mkdir(parents=True, exist_ok=True, mode=0o700)
    sessions.chmod(0o700)
    if os.environ.get("DEEPSEEK_API_KEY", "").strip() == "":
        print("BLOCKED_NO_CREDENTIAL: no model request was attempted")
        print(f"PASS_PATHS: workspace={workspace} session_root={sessions}")
        return 0

    print(f"READY_FOR_EXPLICIT_AUTH: workspace={workspace} session_root={sessions}")
    print("NEXT_STEP_REQUIRED: run a separately approved keyed smoke")
    return 0


if __name__ == "__main__":
    sys.exit(main())


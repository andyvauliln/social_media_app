#!/usr/bin/env python3
"""
Detect whether Claude Code or Cursor agents are mid-turn for a repo.

Exit codes (check mode):
  0 — idle (no in-progress turn for this repo)
  1 — busy
  2 — usage / config error

wait mode: poll until idle (stable quiet period) or timeout.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return int(raw)


def _normalized_repo_path(repo_root: Path) -> str:
    # Claude/Cursor slugify paths with hyphens, not underscores.
    return str(repo_root.resolve()).replace("_", "-")


def claude_project_dir_slug(repo_root: Path) -> str:
    return _normalized_repo_path(repo_root).replace("/", "-")


def cursor_project_dir_slug(repo_root: Path) -> str:
    return _normalized_repo_path(repo_root).lstrip("/").replace("/", "-")


def is_human_claude_user(entry: dict) -> bool:
    if entry.get("type") != "user" or entry.get("isMeta") or entry.get("isSidechain"):
        return False
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, str):
        return bool(content.strip())
    if isinstance(content, list) and content:
        return content[0].get("type") != "tool_result"
    return False


def claude_session_busy(jsonl_path: Path, max_age_sec: int) -> str | None:
    try:
        st = jsonl_path.stat()
    except OSError:
        return None
    if max_age_sec > 0 and (time.time() - st.st_mtime) > max_age_sec:
        return None

    last_human = -1
    last_turn_done = -1
    try:
        lines = jsonl_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as exc:
        return f"claude transcript unreadable {jsonl_path.name}: {exc}"

    for i, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if is_human_claude_user(entry):
            last_human = i
        if entry.get("type") == "system" and entry.get("subtype") == "turn_duration":
            last_turn_done = i

    if last_human < 0:
        return None
    if last_turn_done < last_human:
        stale_turn_sec = _env_int("GIT_SYNC_AGENT_STALE_TURN_SEC", 1800)
        if stale_turn_sec > 0 and (time.time() - st.st_mtime) > stale_turn_sec:
            return None
        return f"claude session {jsonl_path.stem} mid-turn"
    return None


def cursor_transcript_busy(jsonl_path: Path, max_age_sec: int, activity_sec: float) -> str | None:
    try:
        st = jsonl_path.stat()
    except OSError:
        return None
    age = time.time() - st.st_mtime
    if max_age_sec > 0 and age > max_age_sec:
        return None

    try:
        lines = [
            ln
            for ln in jsonl_path.read_text(encoding="utf-8", errors="replace").splitlines()
            if ln.strip()
        ]
    except OSError as exc:
        return f"cursor transcript unreadable {jsonl_path.name}: {exc}"

    if not lines:
        return None

    try:
        last = json.loads(lines[-1])
    except json.JSONDecodeError:
        return None

    role = last.get("role")
    if role == "user":
        msg = last.get("message") or {}
        content = msg.get("content")
        if isinstance(content, list) and content:
            if content[0].get("type") == "text":
                return f"cursor session {jsonl_path.parent.name} awaiting response"
        elif isinstance(content, str) and content.strip():
            return f"cursor session {jsonl_path.parent.name} awaiting response"

    if role == "assistant" and age < activity_sec:
        return f"cursor session {jsonl_path.parent.name} still active ({age:.0f}s since update)"

    return None


def ralph_loop_busy(repo_root: Path) -> list[str]:
    reasons: list[str] = []
    candidates = [
        repo_root / ".claude" / "ralph-loop.local.md",
    ]
    for agent_dir in (repo_root / "agents").glob("*/.claude/ralph-loop.local.md"):
        candidates.append(agent_dir)
    for path in candidates:
        if path.is_file():
            reasons.append(f"ralph-loop active ({path.relative_to(repo_root)})")
    return reasons


def print_mode_busy(repo_root: Path) -> list[str]:
    reasons: list[str] = []
    proc = Path("/proc")
    if not proc.is_dir():
        return reasons

    root_s = str(repo_root.resolve())
    for pid_dir in proc.iterdir():
        if not pid_dir.name.isdigit():
            continue
        try:
            cmd = (
                pid_dir.joinpath("cmdline")
                .read_bytes()
                .replace(b"\x00", b" ")
                .decode("utf-8", errors="replace")
            )
        except OSError:
            continue

        is_claude_print = "claude" in cmd and " -p" in cmd
        is_agent_print = "agent" in cmd and (" -p" in cmd or "--print" in cmd)
        if not (is_claude_print or is_agent_print):
            continue

        try:
            cwd = pid_dir.joinpath("cwd").resolve()
        except OSError:
            continue

        cwd_s = str(cwd)
        if cwd_s == root_s or cwd_s.startswith(root_s + os.sep):
            label = "claude -p" if is_claude_print else "agent -p"
            reasons.append(f"{label} pid={pid_dir.name} cwd={cwd_s}")

    return reasons


def collect_busy_reasons(repo_root: Path) -> list[str]:
    max_age = _env_int("GIT_SYNC_AGENT_SESSION_MAX_AGE_SEC", 86400)
    activity_sec = float(_env_int("GIT_SYNC_AGENT_ACTIVITY_SEC", 20))
    reasons: list[str] = []

    reasons.extend(ralph_loop_busy(repo_root))
    reasons.extend(print_mode_busy(repo_root))

    claude_base = Path.home() / ".claude" / "projects"
    slug = claude_project_dir_slug(repo_root)
    if claude_base.is_dir():
        for pattern in (f"{slug}/*.jsonl", f"{slug}-*/*.jsonl"):
            for path in claude_base.glob(pattern):
                msg = claude_session_busy(path, max_age)
                if msg:
                    reasons.append(msg)

    cursor_projects = Path.home() / ".cursor" / "projects"
    cursor_slug = cursor_project_dir_slug(repo_root)
    if cursor_projects.is_dir():
        for project_dir in cursor_projects.glob(f"{cursor_slug}*"):
            transcripts = project_dir / "agent-transcripts"
            if not transcripts.is_dir():
                continue
            for path in transcripts.glob("*/*.jsonl"):
                msg = cursor_transcript_busy(path, max_age, activity_sec)
                if msg:
                    reasons.append(msg)

    return reasons


def wait_until_idle(repo_root: Path, timeout_sec: int, poll_sec: int, idle_sec: int) -> bool:
    stable_since: float | None = None
    deadline = time.time() + timeout_sec if timeout_sec > 0 else None
    last_logged: list[str] | None = None

    while True:
        reasons = collect_busy_reasons(repo_root)
        now = time.time()

        if reasons:
            stable_since = None
            if reasons != last_logged:
                print(
                    "[agent-wait] agents busy: " + "; ".join(reasons),
                    file=sys.stderr,
                    flush=True,
                )
                last_logged = list(reasons)
        else:
            if stable_since is None:
                stable_since = now
            elif now - stable_since >= idle_sec:
                print(
                    f"[agent-wait] idle for {idle_sec}s, continuing",
                    file=sys.stderr,
                    flush=True,
                )
                return True

        if deadline is not None and now >= deadline:
            print(
                "[agent-wait] timeout after "
                f"{timeout_sec}s; still busy: " + "; ".join(reasons or ["unknown"]),
                file=sys.stderr,
                flush=True,
            )
            return False

        time.sleep(poll_sec)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "mode",
        choices=("check", "wait"),
        help="check: exit 0 if idle; wait: block until idle or timeout",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="repository root (default: cwd)",
    )
    args = parser.parse_args()
    repo_root = args.root.resolve()

    if args.mode == "check":
        reasons = collect_busy_reasons(repo_root)
        if reasons:
            print("; ".join(reasons), file=sys.stderr)
            return 1
        return 0

    timeout = _env_int("GIT_SYNC_AGENT_WAIT_TIMEOUT_SEC", 3600)
    poll_sec = _env_int("GIT_SYNC_AGENT_POLL_SEC", 10)
    idle_sec = _env_int("GIT_SYNC_AGENT_IDLE_SEC", 15)

    if not wait_until_idle(repo_root, timeout, poll_sec, idle_sec):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

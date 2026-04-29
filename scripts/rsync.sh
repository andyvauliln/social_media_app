#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="${1:-$PROJECT_ROOT/slink.config.jsonc}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Config not found: $CONFIG_PATH" >&2
  exit 1
fi

python3 - "$PROJECT_ROOT" "$CONFIG_PATH" <<'PY'
import json
import os
import pathlib
import re
import sys

root_dir = pathlib.Path(sys.argv[1]).resolve()
config_path = pathlib.Path(sys.argv[2]).resolve()


def strip_jsonc(raw: str) -> str:
    no_block = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
    no_line = re.sub(r"(?m)//.*$", "", no_block)
    no_trailing_commas = re.sub(r",(\s*[}\]])", r"\1", no_line)
    return no_trailing_commas


def expand(path_text: str) -> pathlib.Path:
    # Normalize to absolute path but do not resolve symlinks.
    expanded = os.path.expanduser(path_text)
    if os.path.isabs(expanded):
        absolute = os.path.abspath(expanded)
    else:
        absolute = os.path.abspath(os.path.join(str(root_dir), expanded))
    return pathlib.Path(absolute)


raw = config_path.read_text(encoding="utf-8")
entries = json.loads(strip_jsonc(raw))

if not isinstance(entries, list):
    raise SystemExit("Config must be a JSON array")

for index, entry in enumerate(entries, start=1):
    if not isinstance(entry, dict):
        print(f"[skip] entry #{index} is not an object", file=sys.stderr)
        continue

    name = entry.get("name", f"entry #{index}")
    source_path = entry.get("source_path")
    target_path = entry.get("target_path")
    source_root = entry.get("source_root")
    source_glob = entry.get("source_glob")
    target_dir = entry.get("target_dir")
    target_postfix = entry.get("target_postfix", "")
    keep_folder_structure = entry.get("keep_folder_structure", True)

    # Pattern mode: create multiple symlinks from a recursive glob.
    if source_root and source_glob and target_dir:
        root = expand(source_root)
        out_dir = expand(target_dir)

        if not root.exists() or not root.is_dir():
            print(f"[skip] {name}: source_root does not exist or is not a directory ({root})", file=sys.stderr)
            continue

        out_dir.mkdir(parents=True, exist_ok=True)

        excluded_prefixes = []
        try:
            out_dir.relative_to(root)
            excluded_prefixes.append(out_dir)
        except ValueError:
            pass

        matched_count = 0
        linked_count = 0
        already_linked_count = 0
        for current_root, dirs, files in os.walk(root):
            current_root_path = pathlib.Path(current_root)
            dirs[:] = [d for d in dirs if not (current_root_path / d).is_symlink()]

            if excluded_prefixes:
                dirs[:] = [
                    d for d in dirs
                    if not any((current_root_path / d) == excluded or (current_root_path / d).is_relative_to(excluded) for excluded in excluded_prefixes)
                ]

            for file_name in files:
                source = current_root_path / file_name
                if source.is_symlink():
                    continue

                rel = source.relative_to(root)
                rel_posix_path = pathlib.PurePosixPath(rel.as_posix())
                glob_matches = rel_posix_path.match(source_glob)
                if not glob_matches and source_glob.startswith("**/"):
                    glob_matches = rel_posix_path.match(source_glob[3:])
                if not glob_matches:
                    continue
                matched_count += 1

                if keep_folder_structure:
                    target = out_dir / pathlib.Path(str(rel) + target_postfix)
                else:
                    target = out_dir / pathlib.Path(source.name + target_postfix)
                if source == target:
                    print(f"[skip] {name}: source equals target ({source})", file=sys.stderr)
                    continue

                target.parent.mkdir(parents=True, exist_ok=True)

                if target.is_symlink():
                    current = pathlib.Path(target.readlink())
                    if not current.is_absolute():
                        current = (target.parent / current).resolve()
                    if current == source:
                        already_linked_count += 1
                        continue
                    if not keep_folder_structure:
                        print(
                            f"[skip] {name}: flat-name collision for {target.name} ({current} vs {source})",
                            file=sys.stderr,
                        )
                        continue
                    target.unlink()
                    print(f"[replace] {name}: updated existing symlink {target}")
                elif target.exists():
                    backup = target.with_name(target.name + ".backup")
                    if backup.exists() or backup.is_symlink():
                        raise SystemExit(f"[error] {name}: backup path already exists: {backup}")
                    target.rename(backup)
                    print(f"[backup] {name}: moved existing target to {backup}")

                target.symlink_to(source, target_is_directory=False)
                print(f"[link] {name}: {target} -> {source}")
                linked_count += 1

        print(
            f"[ok] {name}: matched {matched_count}, already_linked {already_linked_count}, linked {linked_count}"
        )
        continue

    if not source_path or not target_path:
        print(f"[skip] {name}: missing source_path or target_path, or pattern mode fields", file=sys.stderr)
        continue

    source = expand(source_path)
    target = expand(target_path)

    if source == target:
        print(f"[skip] {name}: source_path equals target_path ({source})", file=sys.stderr)
        continue

    target.parent.mkdir(parents=True, exist_ok=True)

    if target.is_symlink():
        current = pathlib.Path(target.readlink())
        if not current.is_absolute():
            current = (target.parent / current).resolve()
        if current == source:
            print(f"[ok] {name}: already linked")
            continue
        target.unlink()
        print(f"[replace] {name}: updated existing symlink")
    elif target.exists():
        backup = target.with_name(target.name + ".backup")
        if backup.exists() or backup.is_symlink():
            raise SystemExit(f"[error] {name}: backup path already exists: {backup}")
        target.rename(backup)
        print(f"[backup] {name}: moved existing target to {backup}")

    target.symlink_to(source, target_is_directory=source.is_dir())
    print(f"[link] {name}: {target} -> {source}")

print("done")
PY

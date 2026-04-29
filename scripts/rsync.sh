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
    out = []
    i = 0
    in_string = False
    escape = False
    while i < len(raw):
        ch = raw[i]
        nxt = raw[i + 1] if i + 1 < len(raw) else ""

        if in_string:
            out.append(ch)
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            i += 1
            continue

        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
            continue

        if ch == "/" and nxt == "/":
            i += 2
            while i < len(raw) and raw[i] != "\n":
                i += 1
            continue

        if ch == "/" and nxt == "*":
            i += 2
            while i + 1 < len(raw) and not (raw[i] == "*" and raw[i + 1] == "/"):
                i += 1
            i += 2
            continue

        out.append(ch)
        i += 1

    no_comments = "".join(out)
    no_trailing_commas = re.sub(r",(\s*[}\]])", r"\1", no_comments)
    return no_trailing_commas


def expand(path_text: str) -> pathlib.Path:
    # Normalize to absolute path but do not resolve symlinks.
    expanded = os.path.expanduser(path_text)
    if os.path.isabs(expanded):
        absolute = os.path.abspath(expanded)
    else:
        absolute = os.path.abspath(os.path.join(str(root_dir), expanded))
    return pathlib.Path(absolute)


def apply_postfix_before_suffix(file_name: str, postfix: str) -> str:
    if not postfix:
        return file_name
    suffix = pathlib.Path(file_name).suffix
    if suffix:
        return file_name[: -len(suffix)] + postfix + suffix
    return file_name + postfix


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
    source_roots = entry.get("source_roots")
    source_glob = entry.get("source_glob")
    target_dir = entry.get("target_dir")
    target_dirs = entry.get("target_dirs")
    target_postfix = entry.get("target_postfix", "")
    keep_folder_structure = entry.get("keep_folder_structure", True)

    # Pattern mode: create multiple symlinks from one or many roots.
    pattern_mode_enabled = bool(source_glob) and bool(source_root or source_roots) and bool(target_dir or target_dirs)
    if pattern_mode_enabled:
        normalized_source_roots = source_roots if source_roots is not None else [source_root]
        normalized_target_dirs = target_dirs if target_dirs is not None else [target_dir]

        if not isinstance(normalized_source_roots, list) or not isinstance(normalized_target_dirs, list):
            print(f"[skip] {name}: source_roots/target_dirs must be arrays when provided", file=sys.stderr)
            continue
        if not normalized_source_roots or not normalized_target_dirs:
            print(f"[skip] {name}: source_roots/target_dirs cannot be empty", file=sys.stderr)
            continue

        root_to_out_pairs = []
        if len(normalized_source_roots) == len(normalized_target_dirs):
            root_to_out_pairs = list(zip(normalized_source_roots, normalized_target_dirs))
        elif len(normalized_source_roots) == 1:
            root_to_out_pairs = [(normalized_source_roots[0], d) for d in normalized_target_dirs]
        elif len(normalized_target_dirs) == 1:
            root_to_out_pairs = [(s, normalized_target_dirs[0]) for s in normalized_source_roots]
        else:
            print(
                f"[skip] {name}: source_roots and target_dirs must have same length, or one side must have length 1",
                file=sys.stderr,
            )
            continue

        total_matched_count = 0
        total_linked_count = 0
        total_already_linked_count = 0

        for source_root_value, target_dir_value in root_to_out_pairs:
            if not isinstance(source_root_value, str) or not source_root_value.strip():
                print(f"[skip] {name}: invalid source_root value ({source_root_value!r})", file=sys.stderr)
                continue
            if not isinstance(target_dir_value, str) or not target_dir_value.strip():
                print(f"[skip] {name}: invalid target_dir value ({target_dir_value!r})", file=sys.stderr)
                continue

            root = expand(source_root_value)
            out_dir = expand(target_dir_value)

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
                        target_rel = rel.parent / apply_postfix_before_suffix(rel.name, target_postfix)
                        target = out_dir / target_rel
                    else:
                        target = out_dir / pathlib.Path(apply_postfix_before_suffix(source.name, target_postfix))
                    if source == target:
                        print(f"[skip] {name}: source equals target ({source})", file=sys.stderr)
                        continue

                    target.parent.mkdir(parents=True, exist_ok=True)

                    # Cleanup previous naming style where postfix was appended
                    # after full filename (e.g. file.ts.symlink).
                    legacy_target = out_dir / pathlib.Path(source.name + target_postfix)
                    if legacy_target != target and legacy_target.is_symlink():
                        current_legacy = pathlib.Path(legacy_target.readlink())
                        if not current_legacy.is_absolute():
                            current_legacy = (legacy_target.parent / current_legacy).resolve()
                        if current_legacy == source:
                            legacy_target.unlink()
                            print(f"[cleanup] {name}: removed legacy symlink {legacy_target}")

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

            total_matched_count += matched_count
            total_linked_count += linked_count
            total_already_linked_count += already_linked_count
            print(
                f"[ok] {name}: source_root={root} target_dir={out_dir} matched {matched_count}, already_linked {already_linked_count}, linked {linked_count}"
            )

        print(
            f"[ok] {name}: total matched {total_matched_count}, already_linked {total_already_linked_count}, linked {total_linked_count}"
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

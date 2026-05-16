#!/usr/bin/env python3
"""
turn_audit.py — extract a per-turn audit from a Claude Code session JSONL,
                always write it to disk, optionally push to Telegram.

Runs as a Stop hook (.claude/hooks/turn-audit.sh) or manually with --transcript.

Always writes:
    logs/claude/<sessionId>.json   read-modify-write, full session w/ turns[]
    logs/claude/last.json          overwrite, just the latest turn

Pushes to Telegram only when the turn's inbound was a telegram channel message
AND either the inbound contains "@full" OR env TELEGRAM_AUDIT_REPLY=1.

Pure stdlib. LLM calls via Anthropic API or OpenRouter fallback.
"""
import json
import os
import re
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
LOGS_DIR = REPO_ROOT / "logs" / "claude"
META_DIR = LOGS_DIR / "_meta"

# Anthropic public pricing per million tokens (update when prices change)
MODEL_PRICES = {
    "sonnet": {"input": 3.0,   "output": 15.0,  "cache_write": 3.75,  "cache_read": 0.30},
    "haiku":  {"input": 0.80,  "output": 4.0,   "cache_write": 1.0,   "cache_read": 0.08},
    "opus":   {"input": 15.0,  "output": 75.0,  "cache_write": 18.75, "cache_read": 1.50},
}

def model_price_key(model_str):
    m = (model_str or "").lower()
    if "opus" in m:   return "opus"
    if "haiku" in m:  return "haiku"
    return "sonnet"

def calc_cost_usd(tokens, model_str):
    p = MODEL_PRICES[model_price_key(model_str)]
    return (
        tokens.get("input", 0)        * p["input"]        / 1_000_000 +
        tokens.get("output", 0)       * p["output"]       / 1_000_000 +
        tokens.get("cache_create", 0) * p["cache_write"]  / 1_000_000 +
        tokens.get("cache_read", 0)   * p["cache_read"]   / 1_000_000
    )



def load_jsonl(path):
    out = []
    for line in Path(path).read_text().splitlines():
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out


def is_turn_boundary(record):
    if record.get("type") != "user":
        return False
    content = record.get("message", {}).get("content")
    if isinstance(content, str):
        return True
    if isinstance(content, list):
        return not all(b.get("type") == "tool_result" for b in content if isinstance(b, dict))
    return False


def find_boundaries(records):
    """Return all boundary indices, oldest first."""
    return [i for i, r in enumerate(records) if is_turn_boundary(r)]


def parse_inbound(record):
    content = record.get("message", {}).get("content", "")
    if not isinstance(content, str):
        return None
    if "<channel" not in content or "plugin:telegram:telegram" not in content:
        return None
    info = {"source": "telegram"}
    for key in ("chat_id", "message_id", "user", "user_id", "ts",
                "attachment_kind", "attachment_file_id"):
        m = re.search(rf'{key}="([^"]+)"', content)
        if m:
            info[key] = m.group(1)
    body = re.sub(r"<channel[^>]*>", "", content)
    body = re.sub(r"</channel>", "", body).strip()
    info["text"] = body
    return info


def relative_path(p):
    prefix = str(REPO_ROOT) + "/"
    if isinstance(p, str) and p.startswith(prefix):
        return p[len(prefix):]
    try:
        return str(Path(p).relative_to(REPO_ROOT))
    except Exception:
        return p


def preview(s, n=100):
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n] + ("…" if len(s) > n else "")


def count_lines(s):
    return s.count("\n") + (1 if s else 0)


def extract_files_for_step(tool_uses):
    files = []
    for tu in tool_uses:
        name = tu.get("name")
        inp = tu.get("input") or {}
        if name == "Edit":
            old, new = inp.get("old_string", "") or "", inp.get("new_string", "") or ""
            files.append({
                "path": inp.get("file_path", ""),
                "op": "Edit",
                "lines_added": max(0, count_lines(new) - count_lines(old)),
                "lines_removed": max(0, count_lines(old) - count_lines(new)),
                "hunks": [{"old_preview": preview(old), "new_preview": preview(new)}],
            })
        elif name == "Write":
            content = inp.get("content", "") or ""
            files.append({
                "path": inp.get("file_path", ""),
                "op": "Write",
                "lines_added": count_lines(content),
                "lines_removed": 0,
                "hunks": [{"old_preview": "", "new_preview": preview(content)}],
            })
        elif name == "MultiEdit":
            hunks = []
            la = lr = 0
            for e in inp.get("edits", []) or []:
                old, new = e.get("old_string", "") or "", e.get("new_string", "") or ""
                la += max(0, count_lines(new) - count_lines(old))
                lr += max(0, count_lines(old) - count_lines(new))
                hunks.append({"old_preview": preview(old), "new_preview": preview(new)})
            files.append({
                "path": inp.get("file_path", ""),
                "op": "MultiEdit",
                "lines_added": la,
                "lines_removed": lr,
                "hunks": hunks,
            })
    return files


def bash_preview(cmd):
    if not cmd:
        return ""
    cmd = cmd.replace(str(REPO_ROOT) + "/", "")
    return re.sub(r"\s+", " ", cmd).strip()


def extract_turn(records, boundary_idx, end_idx):
    inbound_rec = records[boundary_idx]
    slice_ = records[boundary_idx:end_idx]
    inbound = parse_inbound(inbound_rec)
    origin = "telegram" if inbound else "manual"

    steps = []
    tools_count = {}
    skills = []
    subagents = []
    hooks_fired = []
    total_in = total_out = total_cr = total_cc = 0
    main_reply_msg_id = None
    reply_tool_use_ids = set()

    # Group assistant records by message.id — Claude Code splits a single API
    # response into one record per content block; they all share the same id
    # and usage, so we must dedupe before summing tokens.
    grouped = {}
    group_order = []
    for r in slice_:
        if r.get("type") == "system":
            sub = r.get("subtype")
            if sub:
                hooks_fired.append({
                    "subtype": sub,
                    "hookCount": r.get("hookCount"),
                    "hookErrors": r.get("hookErrors"),
                    "ts": r.get("timestamp"),
                })
            continue
        if r.get("type") != "assistant":
            continue
        msg = r.get("message", {}) or {}
        mid = msg.get("id") or r.get("uuid") or r.get("timestamp")
        if mid not in grouped:
            grouped[mid] = {"usage": msg.get("usage", {}) or {}, "content": [],
                            "first_ts": r.get("timestamp"), "model": msg.get("model", "")}
            group_order.append(mid)
        for c in msg.get("content", []) or []:
            grouped[mid]["content"].append(c)

    for mid in group_order:
        g = grouped[mid]
        u = g["usage"]
        ti = u.get("input_tokens", 0)
        to_ = u.get("output_tokens", 0)
        tcr = u.get("cache_read_input_tokens", 0)
        tcc = u.get("cache_creation_input_tokens", 0)
        total_in += ti
        total_out += to_
        total_cr += tcr
        total_cc += tcc

        text_preview = ""
        step_tools = []
        step_tool_uses = []
        has_thinking = False
        for c in g["content"]:
            if c.get("type") == "thinking":
                has_thinking = True
            elif c.get("type") == "text" and not text_preview:
                text_preview = preview(c.get("text", ""), 120)
            elif c.get("type") == "tool_use":
                name = c.get("name", "")
                tu_id = c.get("id")
                inp = c.get("input") or {}
                desc = name
                if name == "Bash":
                    desc = f"Bash: {bash_preview(inp.get('command', ''))}"
                elif name == "Read":
                    desc = f"Read: {relative_path(inp.get('file_path', '?'))}"
                elif name == "Write":
                    desc = f"Write: {relative_path(inp.get('file_path', '?'))}"
                elif name == "Edit":
                    desc = f"Edit: {relative_path(inp.get('file_path', '?'))}"
                elif name == "MultiEdit":
                    desc = f"MultiEdit: {relative_path(inp.get('file_path', '?'))}"
                elif name == "Glob":
                    desc = f"Glob: {inp.get('pattern', '?')}"
                elif name == "Grep":
                    desc = f"Grep: {inp.get('pattern', '?')} in {relative_path(inp.get('path', '.'))}"
                elif name == "ToolSearch":
                    desc = f"ToolSearch: {inp.get('query', '?')}"
                elif name == "Skill":
                    desc = f"Skill: {inp.get('skill', '?')}"
                    skills.append(inp.get("skill"))
                elif name == "Agent":
                    desc = f"Agent: {inp.get('subagent_type', inp.get('description', '?'))}"
                    subagents.append({
                        "type": inp.get("subagent_type"),
                        "description": inp.get("description"),
                    })
                elif name.startswith("mcp__"):
                    short = name.split("__", 2)[-1]
                    desc = f"mcp:{short}"
                step_tools.append(desc)
                step_tool_uses.append(c)
                tools_count[name] = tools_count.get(name, 0) + 1
                if name == "mcp__plugin_telegram_telegram__reply":
                    reply_tool_use_ids.add(tu_id)

        step_files = extract_files_for_step(step_tool_uses)
        steps.append({
            "ts": g["first_ts"],
            "model": g.get("model", ""),
            "text": text_preview,
            "tools": step_tools,
            "thinking": has_thinking,
            "tokens": {
                "input": ti, "output": to_,
                "cache_read": tcr, "cache_create": tcc,
            },
            "files": step_files,
        })

    # Find the sent-message id of the LAST telegram reply tool_result
    for r in slice_:
        if r.get("type") != "user":
            continue
        content = r.get("message", {}).get("content")
        if not isinstance(content, list):
            continue
        for c in content:
            if c.get("type") == "tool_result" and c.get("tool_use_id") in reply_tool_use_ids:
                txt = c.get("content")
                if isinstance(txt, list):
                    txt = " ".join(b.get("text", "") for b in txt if isinstance(b, dict))
                m = re.search(r"id:\s*(\d+)", str(txt or ""))
                if m:
                    main_reply_msg_id = m.group(1)

    # Aggregate files across steps (dedup by path)
    files_agg = {}
    for s in steps:
        for f in s["files"]:
            key = f["path"]
            if key not in files_agg:
                files_agg[key] = {
                    "path": f["path"],
                    "ops": [f["op"]],
                    "lines_added": f["lines_added"],
                    "lines_removed": f["lines_removed"],
                    "hunks": list(f["hunks"]),
                }
            else:
                a = files_agg[key]
                a["ops"].append(f["op"])
                a["lines_added"] += f["lines_added"]
                a["lines_removed"] += f["lines_removed"]
                a["hunks"].extend(f["hunks"])

    started = inbound_rec.get("timestamp")
    ended = slice_[-1].get("timestamp") if slice_ else started
    try:
        dur_ms = int((datetime.fromisoformat(ended.replace("Z", "+00:00"))
                      - datetime.fromisoformat(started.replace("Z", "+00:00"))
                      ).total_seconds() * 1000)
    except Exception:
        dur_ms = 0

    model = next((r.get("message", {}).get("model") for r in slice_
                  if r.get("type") == "assistant" and r.get("message", {}).get("model")), "")

    tok_dict = {
        "input": total_in,
        "output": total_out,
        "cache_read": total_cr,
        "cache_create": total_cc,
        "cache_hit_rate": round(total_cr / max(1, total_cr + total_cc + total_in), 4),
    }
    cost_usd = calc_cost_usd(tok_dict, model)

    return {
        "started": started,
        "ended": ended,
        "duration_ms": dur_ms,
        "origin": origin,
        "model": model,
        "inbound": inbound or {"source": "manual"},
        "steps": steps,
        "tools_summary": [{"name": n, "count": c}
                          for n, c in sorted(tools_count.items(), key=lambda x: -x[1])],
        "skills": [s for s in skills if s],
        "subagents": subagents,
        "hooks_fired": hooks_fired,
        "files": list(files_agg.values()),
        "tokens": tok_dict,
        "cost_usd": round(cost_usd, 6),
        "main_reply_telegram_msg_id": main_reply_msg_id,
    }


def atomic_write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except Exception:
            pass
        raise


def update_session_file(session_id, turn, first_record):
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    session_path = LOGS_DIR / f"{session_id}.json"
    data = None
    if session_path.exists():
        try:
            data = json.loads(session_path.read_text())
        except Exception:
            data = None
    if not data:
        data = {
            "sessionId": session_id,
            "model": turn.get("model"),
            "cwd": (first_record or {}).get("cwd", ""),
            "gitBranch": (first_record or {}).get("gitBranch", ""),
            "origin": turn.get("origin"),
            "started": (first_record or {}).get("timestamp", turn["started"]),
            "turns": [],
            "totals": {},
        }
    turn_no = len(data["turns"]) + 1
    turn_with_no = {"turn_no": turn_no, **turn}
    data["turns"].append(turn_with_no)
    data["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    t = data["totals"]
    t["turns"] = len(data["turns"])
    t["duration_ms"] = sum(x.get("duration_ms", 0) for x in data["turns"])
    t["tokens_input"] = sum(x["tokens"]["input"] for x in data["turns"])
    t["tokens_output"] = sum(x["tokens"]["output"] for x in data["turns"])
    t["cache_read"] = sum(x["tokens"]["cache_read"] for x in data["turns"])
    t["cache_create"] = sum(x["tokens"]["cache_create"] for x in data["turns"])
    pool = t["cache_read"] + t["cache_create"] + t["tokens_input"]
    t["cache_hit_rate"] = round(t["cache_read"] / max(1, pool), 4)
    t["cost_usd"] = round(sum(x.get("cost_usd", 0) for x in data["turns"]), 6)
    t["files_touched"] = sorted({f["path"] for x in data["turns"] for f in x.get("files", []) if f.get("path")})

    atomic_write_json(session_path, data)
    atomic_write_json(LOGS_DIR / "last.json", {
        "sessionId": session_id,
        "session_file": str(session_path.relative_to(REPO_ROOT)),
        **turn_with_no,
    })
    return turn_no, data


def render_audit(turn, turn_no, session_data, files_explanation=None, steps_explanation=None):
    icon = {"telegram": "📱", "manual": "💻"}.get(turn["origin"], "❓")
    inbound = turn.get("inbound") or {}
    head = f"🔍 AUDIT · turn #{turn_no} · {icon} {turn['origin']}"
    if inbound.get("message_id"):
        head += f" · ↩ #{inbound['message_id']}"
    head += f"\n⏱ {turn['duration_ms'] // 1000}s  ·  🤖 {turn.get('model') or '?'}"

    parts = [head, ""]

    if turn["steps"]:
        parts.append(f"📋 STEPS ({len(turn['steps'])})")
        if steps_explanation:
            parts.append("")
            for line in steps_explanation.splitlines():
                parts.append(line)
        else:
            for i, s in enumerate(turn["steps"], 1):
                txt = s["text"] or "(no text)"
                mdl = s.get("model") or ""
                mdl_tag = f"  [{mdl}]" if mdl else ""
                parts.append(f"  {i}. {txt[:100]}{mdl_tag}")
                if s["tools"]:
                    parts.append(f"     🛠 {' · '.join(s['tools'][:4])}"
                                 + (f" +{len(s['tools'])-4} more" if len(s['tools']) > 4 else ""))
                t = s["tokens"]
                parts.append(f"     in:{t['input']} out:{t['output']}  "
                             f"cache_read:{t['cache_read']} cache_new:{t['cache_create']}")
        parts.append("")

    # Tools section removed — steps narrative covers tool usage

    if turn.get("skills"):
        parts.append(f"🔧 SKILLS  {', '.join(turn['skills'])}")
    if turn.get("subagents"):
        sub = ", ".join(f"{s['type']}" for s in turn["subagents"])
        parts.append(f"🤖 SUBAGENTS  {sub}")

    if turn["files"]:
        parts.append("")
        parts.append(f"📝 FILES UPDATED ({len(turn['files'])})")
        if files_explanation:
            for line in files_explanation.splitlines():
                parts.append(f"  {line}" if line and not line.startswith("/") else line)
        else:
            for f in turn["files"]:
                ops = "+".join(sorted(set(f["ops"])))
                rel = relative_path(f.get("path", ""))
                parts.append(f"  • {rel}  ·  {ops}  ·  +{f['lines_added']}/−{f['lines_removed']}")
                for h in f["hunks"][:3]:
                    if h["old_preview"]:
                        parts.append(f"     ─ {h['old_preview']}")
                    if h["new_preview"]:
                        parts.append(f"     + {h['new_preview']}")
                if len(f["hunks"]) > 3:
                    parts.append(f"     … ({len(f['hunks']) - 3} more hunks)")
    else:
        parts.append("")
        parts.append("📝 FILES UPDATED  none")

    tok = turn["tokens"]
    turn_cost = turn.get("cost_usd", 0)
    totals = session_data.get("totals", {})
    session_cost = totals.get("cost_usd", 0)

    parts.append("")
    parts.append("💬 TOKENS")
    parts.append(f"  fresh in     {tok['input']:>10,}")
    parts.append(f"  cache read   {tok['cache_read']:>10,}  ⚡ hit {tok['cache_hit_rate']*100:.1f}%")
    parts.append(f"  cache create {tok['cache_create']:>10,}")
    parts.append(f"  output       {tok['output']:>10,}")

    parts.append("")
    parts.append("💵 COST")
    parts.append(f"  this turn    ${turn_cost:.4f}")
    parts.append(f"  session      ${session_cost:.4f}  (+${turn_cost:.4f} since last)")
    return "\n".join(parts)


def get_bot_token():
    tok = os.environ.get("TELEGRAM_BOT_TOKEN")
    if tok:
        return tok
    env_path = Path.home() / ".claude" / "channels" / "telegram" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("TELEGRAM_BOT_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def push_telegram(chat_id, text, reply_to=None, bot_token=None):
    if not bot_token:
        return False, "no bot token"
    if not chat_id:
        return False, "no chat_id"
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    chunks = []
    cur = ""
    for para in text.split("\n"):
        if len(cur) + len(para) + 1 > 3800:
            chunks.append(cur)
            cur = para
        else:
            cur = (cur + "\n" + para) if cur else para
    if cur:
        chunks.append(cur)
    for i, chunk in enumerate(chunks):
        data = {"chat_id": chat_id, "text": chunk, "disable_web_page_preview": "true"}
        if i == 0 and reply_to:
            data["reply_to_message_id"] = reply_to
        body = urllib.parse.urlencode(data).encode()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=body), timeout=10) as resp:
                resp.read()
        except urllib.error.HTTPError as e:
            return False, f"http {e.code}: {e.read()[:200]!r}"
        except Exception as e:
            return False, str(e)
    return True, None


def _call_model(prompt, max_tokens=800):
    """Call LLM via Anthropic API (ANTHROPIC_API_KEY) or OpenRouter fallback."""
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    or_key = os.environ.get("OPEN_ROUTER_API_KEY")

    if anthropic_key:
        payload = json.dumps({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key": anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read())["content"][0]["text"].strip()
        except Exception as e:
            log_error(f"_call_model anthropic failed: {e}")

    if or_key:
        payload = json.dumps({
            "model": "anthropic/claude-haiku-4-5",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {or_key}",
                "content-type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read())["choices"][0]["message"]["content"].strip()
        except Exception as e:
            log_error(f"_call_model openrouter failed: {e}")

    return None


def explain_files_llm(files):
    if not files:
        return None
    lines = []
    for f in files:
        ops = f.get("ops", [])
        op = "create" if ops == ["Write"] and not any(h.get("old_preview") for h in f.get("hunks", [])) \
             else "delete" if not any(h.get("new_preview") for h in f.get("hunks", [])) \
             else "edit"
        rel = relative_path(f.get("path", ""))
        lines.append(f"FILE /{op}  {rel}")
        for h in f.get("hunks", [])[:4]:
            if h.get("old_preview"):
                lines.append(f"  OLD: {h['old_preview'][:200]}")
            if h.get("new_preview"):
                lines.append(f"  NEW: {h['new_preview'][:200]}")

    prompt = (
        "You are a code-change summarizer. Given raw diff previews, produce a short semantic explanation.\n"
        "Output format — one block per file, plain text, no markdown:\n\n"
        "/edit   src/foo/bar.ts\n"
        "  logic:  before → fetched raw DB row inline\n"
        "          after  → delegates to UserDTO.fromRow()\n"
        "  sig:    fetchUser(id): Promise<any>  →  fetchUser(id): Promise<UserDTO>\n\n"
        "/create  src/foo/types.ts\n"
        "  new:    UserDTO { id, name, email }\n\n"
        "Rules: relative paths; /edit /create /delete prefix; logic: ≤12 words/line before→after; "
        "sig: only if signature changed; data: +added/-removed/~changed fields; "
        "skip import/whitespace/comment-only; ≤30 lines total.\n\n"
        "DIFFS:\n" + "\n".join(lines)
    )
    return _call_model(prompt, max_tokens=600)


def explain_steps_llm(steps):
    if not steps:
        return None
    lines = []
    for i, s in enumerate(steps, 1):
        lines.append(f"STEP {i}:")
        lines.append(f"  text: {s.get('text','') or '(none)'}")
        lines.append(f"  tools: {', '.join(s.get('tools',[]) or ['none'])}")

    prompt = (
        "You are a concise step narrator for Claude Code session audits. "
        "Given raw step data (text preview + tools used), produce a numbered narrative.\n\n"
        "Output format — one block per step, plain text only:\n\n"
        "1️⃣ Short title\n\n"
        "Goal: One sentence — what this step was trying to achieve.\n"
        "Tool: ToolName → one sentence on what it did.\n"
        "Action: What was changed/sent. (Edit/Write/reply steps only)\n"
        "Result: What was found/confirmed. (Read/Bash/Grep steps only)\n\n"
        "Rules:\n"
        "- Emoji numbers 1️⃣–🔟, then 11. 12. etc\n"
        "- Title: 3-6 word noun phrase summarising purpose, not the tool name\n"
        "- Goal always present; Action/Result only when relevant\n"
        "- ToolSearch steps: skip entirely (merge into next step context)\n"
        "- Steps with no tools and pure text: title='Response', Goal=text preview\n"
        "- Blank line between blocks\n"
        "- No token counts, no model names, no markdown\n"
        "- Total ≤ 40 lines\n\n"
        "STEPS:\n" + "\n".join(lines)
    )
    return _call_model(prompt, max_tokens=800)


def log_error(msg):
    try:
        META_DIR.mkdir(parents=True, exist_ok=True)
        with (META_DIR / "audit-errors.log").open("a") as f:
            f.write(f"{datetime.now(timezone.utc).isoformat()} {msg}\n")
    except Exception:
        pass


def main():
    transcript_path = None
    use_prev_completed_turn = False
    force_send = False
    dry_run = False

    args = sys.argv[1:]
    while args:
        a = args.pop(0)
        if a == "--transcript":
            transcript_path = args.pop(0)
        elif a == "--prev":
            use_prev_completed_turn = True
        elif a == "--send":
            force_send = True
        elif a == "--dry-run":
            dry_run = True

    if not transcript_path:
        try:
            raw = sys.stdin.read()
            if raw:
                payload = json.loads(raw)
                transcript_path = payload.get("transcript_path") or payload.get("session_log_path")
        except Exception:
            pass

    if not transcript_path or not Path(transcript_path).exists():
        log_error(f"no transcript path. got={transcript_path}")
        sys.exit(0)

    records = load_jsonl(transcript_path)
    if not records:
        sys.exit(0)

    session_id = records[0].get("sessionId") or Path(transcript_path).stem

    boundaries = find_boundaries(records)
    if not boundaries:
        sys.exit(0)

    if use_prev_completed_turn and len(boundaries) >= 2:
        boundary = boundaries[-2]
        end_idx = boundaries[-1]
    else:
        boundary = boundaries[-1]
        end_idx = len(records)

    turn = extract_turn(records, boundary, end_idx)

    if dry_run:
        print(json.dumps(turn, indent=2, ensure_ascii=False))
        sys.exit(0)

    turn_no, session_data = update_session_file(session_id, turn, records[0])

    inbound = turn.get("inbound") or {}
    send = False
    if inbound.get("source") == "telegram":
        text = inbound.get("text", "") or ""
        if "@full" in text:
            send = True
        elif os.environ.get("TELEGRAM_AUDIT_REPLY", "0") == "1":
            send = True
    if force_send and inbound.get("chat_id"):
        send = True

    if not send:
        sys.exit(0)

    bot_token = get_bot_token()
    if not bot_token:
        log_error("send wanted but no TELEGRAM_BOT_TOKEN found")
        sys.exit(0)

    results = {}
    def _run(key, fn, arg):
        results[key] = fn(arg)

    t_steps = threading.Thread(target=_run, args=("steps", explain_steps_llm, turn.get("steps") or []))
    t_files = threading.Thread(target=_run, args=("files", explain_files_llm, turn.get("files") or []))
    t_steps.start()
    t_files.start()
    t_steps.join()
    t_files.join()

    text = render_audit(turn, turn_no, session_data,
                        files_explanation=results.get("files"),
                        steps_explanation=results.get("steps"))
    ok, err = push_telegram(
        chat_id=inbound.get("chat_id"),
        text=text,
        reply_to=turn.get("main_reply_telegram_msg_id"),
        bot_token=bot_token,
    )
    if not ok:
        log_error(f"telegram push failed: {err}")
    sys.exit(0)


if __name__ == "__main__":
    main()

---
name: voice
description: Handle incoming Telegram voice messages — download, transcribe via Groq Whisper, translate if non-English, then act on any requests found in the message.
user-invocable: false

# CONTEXT
!cat envs/root.env | grep GROQ_API_KEY
---

# Telegram Voice Message Handler

Triggered automatically when an inbound `<channel>` message has `attachment_kind="voice"`.

---

# STEPS

1. **Download** — call `mcp__plugin_telegram_telegram__download_attachment` with `attachment_file_id` to get local `.oga` path.

2. **Convert** — use ffmpeg to convert `.oga` → `.wav` (16kHz mono):
   ```
   ffmpeg -i <file>.oga -ar 16000 -ac 1 -c:a pcm_s16le /tmp/voice_<msg_id>.wav -y
   ```

3. **Transcribe** — POST to Groq Whisper:
   ```
   curl -s -X POST "https://api.groq.com/openai/v1/audio/transcriptions" \
     -H "Authorization: Bearer $GROQ_API_KEY" \
     -F "file=@/tmp/voice_<msg_id>.wav" \
     -F "model=whisper-large-v3"
   ```
   Extract `.text` from the JSON response.

4. **Translate** — if the transcribed text is not in English (e.g. Indonesian/Bahasa), translate it to English before processing. State both the original and translation in the reply.

5. **Act** — if the message contains a task or request, execute it as if the user typed it.

6. **Reply** — send a single Telegram reply with:
   - Original transcription (and translation if applicable)
   - Result of any action taken

---

# RULES

- Always run this pipeline for every voice message, no exceptions.
- User may speak Indonesian (Bahasa) — always detect and translate.
- Never skip the action step if the message contains a request.
- Use `GROQ_API_KEY` from `envs/root.env` — do not hardcode.
- Clean up temp wav files after use.

---

# OUTPUT

Reply format:
```
🎙️ "<original transcription>"
[🌐 Translation: "<english translation>"]   ← only if translated
[✅ Action: <summary of what was done>]      ← only if action taken
```

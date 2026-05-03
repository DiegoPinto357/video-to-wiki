# 🧠 Video Knowledge Ingestion System (CLI-first)

## 🎯 Goal

Build a Node.js CLI application that:

1. Ingests video links (YouTube + Instagram)
2. Extracts metadata and transcripts
3. Stores normalized data in an Obsidian-compatible vault
4. Supports a human + AI workflow to create/update knowledge documents
5. Ensures safe file operations via automatic versioned backups

---

## 🧱 High-Level Architecture

```
links.txt
   ↓
Node CLI (ingest)
   ↓
Sources/raw/*.json
   ↓
AI CLI (manual)
   ↓
Node CLI helpers
   ↓
Docs/*.md
   ↓
Backup/*
```

---

## 📁 Separation of Concerns

### Node CLI App

- ingestion
- normalization
- transcription orchestration
- filesystem-safe operations
- backup/versioning
- CLI utilities

### Vault (external)

- raw data (JSON)
- final documents (Markdown)
- system metadata
- backups

---

## 📂 Vault Structure

```
vault/
├── Inbox/
│   └── links.txt
│
├── Sources/
│   └── raw/
│       └── <id>.json
│
├── Docs/
│   └── <Category>/
│       └── *.md
│
├── System/
│   ├── tags.json
│   ├── sources.json
│   └── config.json
│
├── Backup/
│   ├── Docs/
│   ├── Sources/
│   └── System/
```

---

## 🔑 Core Concepts

### Global Content ID

- Normalize URL
- Generate SHA1 hash

Example:

```
id = sha1(normalizedUrl)
```

---

### Source File (Intermediate)

Path:

```
Sources/raw/<id>.json
```

Schema:

```
{
  "id": "string",
  "url": "string",
  "source": "youtube | instagram",
  "title": "string",
  "description": "string",
  "transcript": "string",
  "createdAt": "ISO date"
}
```

---

### Document Model (Markdown)

Documents are aggregated knowledge hubs (not 1:1 with videos)

```
---
tags: [sleep, routine]
---

# Sleep Routine

## Summary
...

## Practical Tips
...

## Warnings
...

---

## Sources
- [Video title](url)
```

---

## ⚠️ Critical Rule

Videos enrich documents. They do NOT map 1:1 with documents.

---

## 🧠 AI Responsibility

AI receives:

- raw JSON
- current structure (folders + tags)

AI outputs:

```
{
  "action": "create | update | suggest",
  "target": "Docs/Sleep/sleep-routine.md",
  "content": "markdown",
  "sources": [
    { "title": "...", "url": "..." }
  ]
}
```

---

## 🧩 CLI Commands

### Ingest

```
app ingest <links-file>
```

Behavior:

- normalize URL
- generate ID
- skip duplicates
- extract metadata + transcript
- save to Sources/raw/

---

### ID

```
app id <url>
```

---

### List Raw

```
app list-raw
```

---

### List Structure

```
app list-structure
```

Returns:

```
{
  "folders": [],
  "tags": []
}
```

---

### Write Doc

```
app write-doc --file <path> --content <file>
```

- creates file
- backups if exists

---

### Update Doc

```
app update-doc --file <path> --content <file>
```

- merges content
- always backups

---

### Add Source

```
app add-source --file <path> --title <title> --url <url>
```

- deduplicates
- backups

---

### Tags

```
app tags list
app tags validate "<tags>"
```

---

### Auth (Instagram)

```
app auth instagram
```

- opens browser (Playwright)
- saves cookies

---

## 🎥 Providers

### YouTube

- ytdl
- youtube-transcript

### Instagram

- yt-dlp + cookies

---

## 🎧 Transcription

Python script (faster-whisper):

```
python scripts/transcribe.py <audio>
```

Output:

```
{ "text": "..." }
```

Model: small or medium

---

## ⚙️ URL Normalization

Example:

```
https://www.youtube.com/watch?v=abc123&ab_channel=xyz
→
https://youtube.com/watch?v=abc123
```

---

## 💾 Backup System

### Goal

Prevent data loss and allow rollback

---

### Structure

```
Backup/
  Docs/
  Sources/
  System/
```

---

### Naming

```
<timestamp>_<filename>
```

Example:

```
2026-05-02T21-30-15_sleep.md
```

---

### Config

System/config.json:

```
{
  "backup": {
    "enabled": true,
    "maxVersions": 10
  }
}
```

---

### Rules

- write-doc → backup if file exists
- update-doc → always backup
- add-source → always backup
- ingest → no backup

---

### Backup Module

Path:

```
src/utils/backup.ts
```

Interface:

```
export async function backupFile(path: string): Promise<void>;
```

---

### Responsibilities

- check existence
- generate timestamp
- copy file
- enforce retention policy

---

### Retention

- keep last N versions
- delete older ones

---

## 🧠 AI Rules

### AI CAN

- create/update documents
- suggest structure changes

### AI CANNOT

- create folders automatically
- create tags automatically
- modify system files

---

## 💬 Suggestion Format

```
{
  "action": "suggest",
  "type": "new_tag | new_folder",
  "value": "...",
  "reason": "..."
}
```

---

## 🧠 Heuristics

- prefer updating existing documents
- avoid duplication
- consolidate knowledge
- minimize fragmentation

---

## 🧾 System Files

### tags.json

```
{
  "categories": [],
  "tags": []
}
```

---

### sources.json

```
{
  "<id>": {
    "processed": true,
    "docPath": "Docs/..."
  }
}
```

---

## 🚀 Phases

### Phase 1 (MVP)

- ingest
- YouTube support
- Whisper transcription
- raw JSON output

### Phase 2

- Instagram support
- CLI helpers
- backup system

### Phase 3

- structure awareness
- tag validation
- AI workflow integration

---

## ✅ Success Criteria

- ingest 10+ videos reliably
- correct transcripts
- clean JSON outputs
- safe updates with backups
- no duplicated content
- organized vault

---

## 🧠 Final Insight

This system is a hybrid human + AI knowledge editor:

- AI → semantic reasoning
- CLI → structure and safety
- Backup → protection and recovery

---

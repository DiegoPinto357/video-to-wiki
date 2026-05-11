# video-to-wiki

CLI tool that ingests YouTube and Instagram videos into an [Obsidian](https://obsidian.md)-compatible knowledge wiki. Drop links into your inbox, run the tool, and get structured Markdown documents built from video transcripts — automated via [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) skills.

## How it works

1. Register a wiki folder and add video URLs to its `_inbox/links.md` (one per line)
2. Run ingestion — it fetches metadata + transcripts and saves structured JSON to `.system/sources/raw/`
3. The `update-wiki` Copilot skill reads raw sources, decides where content belongs, asks for your approval on tags and folder structure, and writes clean Markdown documents
4. Already-ingested URLs are skipped automatically (deduplication via SHA1 hash)

## Prerequisites

| Tool                                                        | Install                           |
| ----------------------------------------------------------- | --------------------------------- |
| Node.js ≥ 18                                                | [nodejs.org](https://nodejs.org)  |
| Python ≥ 3.9                                                | [python.org](https://python.org)  |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp)                  | `brew install yt-dlp`             |
| [ffmpeg](https://ffmpeg.org)                                | `brew install ffmpeg`             |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | `pip install faster-whisper`      |
| Playwright Chromium                                         | `npx playwright install chromium` |

> **Note:** yt-dlp, ffmpeg, faster-whisper, and Playwright are only required for Instagram ingestion. YouTube videos use the native transcript API and only fall back to Whisper when no captions are available.

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd video-to-wiki
npm install
pip install faster-whisper
npx playwright install chromium
```

### 2. Set up your first wiki

Open Copilot CLI in the repo directory and run:

```
/create-wiki
```

The skill guides you through everything interactively — wiki name, path, description, language, and context — then initializes all system files in one step.

> Prefer the CLI? See [Wiki management commands](#wiki-management) below.

## Daily use

### 1. Add links to your inbox

Open `<wiki-folder>/_inbox/links.md` and add URLs — one per line:

```md
https://youtube.com/watch?v=dQw4w9WgXcQ
https://www.instagram.com/reel/ABC123/
```

### 2. Run the update-wiki skill

```
/update-wiki
```

The agent will:

1. Check registered wikis — if multiple, ask which one to update
2. Read the wiki's configured language from `.system/config.json` (defaults to `en-US`)
3. Ingest any new links from the inbox
4. List unprocessed sources and pick one
5. Fetch the raw source + current wiki structure
6. Check related existing documents to avoid duplication
7. **Ask you** about folder structure (proposes subfolders when relevant)
8. **Ask you** about tags/categories (proposes new ones when needed, then adds them)
9. Present a full action plan (which docs to create/update and how they link) — waits for approval
10. Write the document; sources are always appended in chronological order
11. Mark the source as processed and report a summary

Each invocation processes **one source** and stops — re-invoke to process the next.

### Document template

All documents follow a consistent structure:

```md
#tag1 #tag2

Introductory paragraph. Mention [[Related Doc]] inline where relevant.

# Section

Content.

---

# Fontes

- [Video title](https://url)
```

Tags use [Obsidian inline tag syntax](https://help.obsidian.md/Editing+and+formatting/Tags). The filename is the document title.

## Wiki structure

```
<wiki-folder>/
├── _inbox/
│   └── links.md          ← Drop your URLs here
├── *.md                  ← Docs live at root (visible in Obsidian)
├── <Folder>/             ← Subfolders created on agent suggestion + approval
└── .system/              ← Hidden from Obsidian
    ├── sources/
    │   └── raw/          ← Ingested JSON files
    ├── sources.json      ← Ingestion tracking
    ├── tags.json         ← Tag and category definitions
    ├── config.json       ← Wiki config (name, language, context, backup)
    └── backup/docs/      ← Versioned doc backups
```

A shared profile directory at `~/.video-to-wiki/` stores the wiki registry and Instagram session (shared across all wikis):

```
~/.video-to-wiki/
├── wikis.json            ← Registry of all wikis + active wiki
├── browser-state/        ← Playwright session for Instagram
└── instagram-cookies.txt
```

---

## CLI Reference

The skills cover the full workflow for most cases. The CLI is available for scripting, debugging, or manual control.

### Wiki management

```bash
npm run dev -- wiki list                              # List registered wikis
npm run dev -- wiki add <path> --name <name>          # Register a wiki
npm run dev -- wiki init <name> [--description ...] [--language ...] [--wiki-context ...]
npm run dev -- wiki use <name>                        # Set active wiki
npm run dev -- wiki remove <name>                     # Unregister a wiki
npm run dev -- wiki recover <path>                    # Recover registry from .system/config.json
npm run dev -- wiki config [--wiki <name>]            # Show wiki config
npm run dev -- wiki config set <key> <value> [--wiki <name>]  # Update a config field
```

### Ingestion

```bash
npm run dev -- ingest [--wiki <name>]                 # Ingest links from inbox
npm run dev -- auth instagram                         # Authenticate Instagram manually
```

### Source management

```bash
npm run dev -- list-raw [--wiki <name>]               # List all ingested sources
npm run dev -- list-unprocessed [--wiki <name>]       # List sources not yet turned into docs
npm run dev -- get-raw <id> [--wiki <name>]           # Full raw JSON for a source
npm run dev -- mark-processed <id> [--wiki <name>]    # Mark a source as processed
npm run dev -- add-source <url> [--wiki <name>]       # Add a URL directly to the inbox
```

### Wiki content

```bash
npm run dev -- list-structure [--wiki <name>]         # Current wiki structure (docs + tags)
npm run dev -- get-doc <file> [--wiki <name>]         # Full content + metadata for a doc
npm run dev -- ai-context <id> [--wiki <name>]        # Raw source + wiki structure (AI-optimized)
npm run dev -- apply <file|-> [--json] [--wiki <name>] # Apply AI-generated JSON
```

### Tags

```bash
npm run dev -- tags list [--wiki <name>]
npm run dev -- tags validate [--wiki <name>]
npm run dev -- tags add <tag> [tag2...] [--wiki <name>]
npm run dev -- tags add <tag> [tag2...] --category [--wiki <name>]
npm run dev -- tags remove <tag> [--wiki <name>]
```

### `apply` JSON format

```bash
cat > tmp/action.json << 'EOF'
{"action":"create","target":"Doc.md","content":"...","sources":[{"title":"Title","url":"https://..."}]}
EOF
npm run dev -- apply tmp/action.json --json
```

Supported actions:

| Action    | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `create`  | Write a new document                                        |
| `update`  | Overwrite an existing document (backs up first)             |
| `suggest` | Propose a structural change (folder, tag) — no file written |
| `ask`     | Surface a question to the user — no file written            |

Response format (`--json`):

```json
{
  "status": "success|error",
  "action": "...",
  "file": "...",
  "appendedSources": ["title"]
}
```

`appendedSources` is present when sources were missing from the content and auto-appended by the system.

---

## Development

```bash
npx tsc --noEmit   # Type-check
npm run build      # Build
```

## How deduplication works

Each URL is normalized (tracking params stripped) and hashed with SHA1. The hash is used as the filename in `.system/sources/raw/<hash>.json` and tracked in `.system/sources.json`. Re-running with the same URL is always a no-op.

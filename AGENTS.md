# video-to-wiki

CLI tool that ingests YouTube and Instagram videos into an Obsidian-compatible knowledge wiki.

## Tech stack

- TypeScript (Node.js), Python (transcription fallback)
- CLI via `commander`, build via `tsup`
- YouTube: `@distube/ytdl-core`, `youtube-transcript`
- Instagram: `playwright` (browser automation)
- Transcription: faster-whisper (Python, via `.venv`)
- No testing framework present

## Commands

All commands run via `npm run dev -- <command>`. Do NOT use the compiled `dist/` version.

| Category | Command | Description |
|---|---|---|
| Wiki mgmt | `wiki list` | List registered wikis |
| | `wiki add <path> --name <name>` | Register a wiki |
| | `wiki init <name>` | Initialize wiki system |
| | `wiki use <name>` | Set active wiki |
| | `wiki config [--wiki <name>]` | Show wiki config |
| Ingestion | `ingest [--wiki <name>]` | Ingest inbox links |
| | `auth instagram` | Instagram auth |
| Sources | `list-unprocessed [--wiki <name>]` | Unprocessed sources |
| | `ai-context <id> [--wiki <name>]` | Raw source + wiki structure |
| | `mark-processed <id> [--wiki <name>]` | Mark source as done |
| Content | `get-doc <file> [--wiki <name>]` | Read a document |
| | `apply <file> --json [--wiki <name>]` | Apply create/update action |
| | `backup list <file> [--wiki <name>]` | List doc backups |
| Tags | `tags list [--wiki <name>]` | List all tags |
| | `tags add <tag> [--wiki <name>]` | Add tag |

## Skills

This project has 3 skills in `.opencode/skills/`:
- `create-wiki` — interactive setup for new wikis
- `update-wiki` — process YouTube/Instagram sources into knowledge documents
- `update-recipes` — one-video-one-recipe workflow for recipe wikis

Run `/skills` in opencode to list them, then `/skill <name>` to load one.

## Key conventions

- `npm run dev -- ` prefix for ALL CLI commands
- Use `--wiki <name>` flag for multi-wiki setups
- Documents are Markdown with Obsidian inline tags (`#tag`) and wikilinks (`[[Doc]]`)
- Sources section (`## Fontes`) is always last, after `---`
- Backups are managed via `backup` subcommand, not git
- Wiki config is read from `.system/config.json` inside the wiki folder
- Registry is at `~/.video-to-wiki/wikis.json`

## Type-check

```bash
npx tsc --noEmit
```

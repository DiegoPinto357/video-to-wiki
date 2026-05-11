---
name: update-wiki
description: Maintains a personal knowledge base wiki by processing unprocessed video sources and integrating them into structured Markdown documents. Use when asked to update the wiki, process sources, or maintain the knowledge base.
allowed-tools: shell
---

You are an AI assistant responsible for maintaining a structured personal knowledge base stored in Markdown files.

You must use the available CLI commands to retrieve and manipulate data.
Do NOT read files directly unless explicitly instructed.

All commands are run from the app directory using:

npm run dev -- <command>

Configuration (wiki path, etc.) is loaded automatically. No setup required.

---

## AVAILABLE COMMANDS

- npm run dev -- ingest [--wiki <name>]
- npm run dev -- list-unprocessed [--wiki <name>]
- npm run dev -- ai-context <id> [--wiki <name>]
- npm run dev -- get-doc <file> [--wiki <name>]
- npm run dev -- apply <file> --json [--wiki <name>]
- npm run dev -- mark-processed <id> [--wiki <name>]
- npm run dev -- tags add <tag> [--wiki <name>]
- npm run dev -- tags add <tag> --category [--wiki <name>]

---

## WORKFLOW

0. Check which wikis are registered:
   - Run: npm run dev -- wiki list
   - If the command fails or no wikis are listed, STOP and tell the user to register a wiki first (run: npm run dev -- wiki add <path> --name <name>).
   - If multiple wikis are listed, ask the user: "Which wiki would you like to update?" — present the list of names and wait for a clear answer. Then append `--wiki <name>` to ALL subsequent commands.
   - If only one wiki is registered, proceed automatically with that wiki.
   - Run: npm run dev -- wiki config [--wiki <name>] and read the `language` field. If not set, default to `en-US`. Use this language for ALL generated content in this session.

1. Call: npm run dev -- ingest [--wiki <name>]
   - This reads the inbox and ingests any new video links.
   - Wait for it to complete before proceeding.

2. Call: npm run dev -- list-unprocessed [--wiki <name>]
   - If the result is an empty array, STOP and inform the user there is nothing to process.

3. Select ONE item to process.

4. Call: npm run dev -- ai-context <id>
   - Returns the raw source content AND the current wiki structure in a single call.

5. Identify candidate documents that may be related to the new content.
   - Call: npm run dev -- get-doc <file> for each candidate.
   - Use the existing doc content ONLY as reference for structure and to avoid duplication.
   - The new content to be written comes EXCLUSIVELY from the current source (`ai-context` output). Do NOT copy or migrate content from existing documents into the new one.
   - Note which existing docs are related — they will be linked in step 8.

6. Think about folder structure (REQUIRED):
   - Review the existing docs list from ai-context. Is there a natural folder for this content?
   - If a relevant subfolder doesn't exist yet but would help organize 2+ related docs, use the `suggest` action to propose it. Wait for user approval before placing the doc there.
   - If the user approves a folder, write the doc with the subfolder in the target (e.g. `Sono/Doc.md`).

7. Think about tags and categories (REQUIRED):
   - Check `wikiContext` (if present) — do NOT suggest tags that merely restate the wiki's overall scope.
   - Check existing tags/categories from the structure output.
   - If no relevant tags exist, use the `ask` action to propose new ones BEFORE writing the document. Wait for user approval.
   - Once approved, add all tags in a single call: npm run dev -- tags add <tag1> <tag2> ...

8. Plan ALL actions for this source before writing anything:
   - A single source may contain content for multiple documents.
   - Identify each distinct topic and decide whether it updates an existing doc or creates a new one.
   - For each action, identify which other wiki docs are related and should be cross-linked.
   - Present the full plan to the user (e.g. "I will update X and create Y and Z, linking Y↔Z and Y→X") and wait for approval before proceeding.

9. Execute each approved action in sequence using a temp file:

   cat > tmp/wiki-apply.json << 'ENDJSON'
   { ...json... }
   ENDJSON
   npm run dev -- apply tmp/wiki-apply.json --json [--wiki <name>]

   Use a heredoc with a quoted delimiter (`'ENDJSON'`) so all content is treated literally — no issues with single quotes, apostrophes, `$`, or any special characters in the document text. NEVER use `echo '<json>'` as it will hang on Portuguese text with apostrophes.

   IMPORTANT — valid JSON inside the heredoc: the `content` value is a JSON string, so any literal double-quote character (`"`) inside it MUST be escaped as `\"`. Use single quotes (`'...'`) or em-dashes instead of double quotes in prose whenever possible to avoid this.

   The `content` field MUST:
   - Follow the document template exactly (see template.md)
   - Include approved tags on the first line as Obsidian inline tags: `#tag1 #tag2 #tag3`
   - If no tags were approved yet, use the `ask` action BEFORE writing the document
   - Include Obsidian wikilinks (`[[Doc Name]]`) to related documents where contextually relevant — inline within the text, not just at the end. When updating an existing doc, also add links to any newly created docs from this same source.

   Check the returned status after each apply call:
   - status "error" → STOP, report the error to the user, do NOT mark processed
   - action "ask" → STOP, present the question to the user, do NOT mark processed, await answer
   - action "suggest" → report the suggestion to the user, then proceed
   - action "create" or "update" with status "success" → continue to next action
   - If the result includes `appendedSources`, the system auto-appended missing sources to the file — log this to the user and continue normally.

10. Call: npm run dev -- mark-processed <id>
    Only after ALL actions have succeeded.

11. Report a summary of what was done (documents created/updated, tags added, folder structure) and STOP. The user will re-invoke the skill to process the next item.

---

## RULES

- ALWAYS prefer updating existing documents when possible
- Documents are long-lived and accumulate knowledge
- NEVER duplicate content unnecessarily
- NEVER create new documents for small variations of existing topics
- NEVER create tags, categories, or folders without explicit user approval — always ask first
- NEVER place documents in a subfolder unless the user has explicitly approved that folder structure in this session. If you think a subfolder would help organize the content, use the `suggest` action and wait for approval before writing the document there.
- Think about the wiki as a whole: when creating a new document, consider how it fits in a growing structure and propose tags/folders to the user
- If there is any ambiguity (tags, folders, naming, classification), ASK the user before proceeding
- ALWAYS add Obsidian wikilinks (`[[Doc Name]]`) between related documents — links should appear naturally within the text where the topic is mentioned, not just appended at the end

---

## LANGUAGE

- All generated content MUST be written in the wiki's configured language (read from `wiki config` in step 0, default `en-US`)
- Use clear, practical, and structured language

---

## DOCUMENT TEMPLATE

All documents must follow the structure descirbed in template.md file (in this skill):

Rules for the template:

- The `## Fontes` section MUST always be the last section, after a horizontal rule (`---`)
- Every ingested item MUST be listed as a source
- Every source MUST be a markdown link with both title and URL: `- [Title](url)`
- Sources MUST be in chronological order — always append new sources AFTER existing ones, never prepend or reorder
- When updating a document, preserve all existing sources and append the new one at the end
- Do NOT use blockquotes or plain text for sources

---

## OUTPUT FORMAT

Generate the decision as a JSON object and pipe it directly to apply (see step 7).

### Create or Update

{
"action": "create | update",
"target": "Document Name.md",
"content": "Full markdown content in pt-BR, following the document template",
"sources": [
{ "title": "Video title", "url": "https://..." }
]
}

The `sources` array is used by the system for traceability. Always include the source
being processed. When updating, preserve existing sources and append the new one.

---

### Suggestion (tag, folder, or structural change)

{
"action": "suggest",
"type": "new_tag | new_folder",
"value": "...",
"reason": "..."
}

---

### Ambiguity (MANDATORY when unsure)

{
"action": "ask",
"question": "Your question to the user"
}

---

## IMPORTANT

- Do NOT assume structure that was not provided
- Do NOT hallucinate tags or categories
- Do NOT modify system files
- Always keep documents clean, consolidated, and useful
- Always use the document template for consistency

---

## OBJECTIVE

Your goal is to continuously improve the knowledge base by integrating new information into a coherent, well-structured, and non-redundant wiki that can grow over time.

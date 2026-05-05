# 📦 AI Integration API Specification (video-to-wiki)

## 🎯 Objective

Define the CLI APIs required to support AI-assisted knowledge base maintenance.

These APIs must:

- Minimize token usage
- Provide structured, predictable outputs
- Avoid direct file system access by the AI
- Enable safe and deterministic operations

---

## 🧠 Design Principles

- CLI acts as a structured API layer for the AI
- AI must NOT read raw files directly
- All interactions must be JSON-based
- Responses must be minimal but sufficient
- One item processed at a time

---

## 📚 Command Overview

| Command               | Purpose                         |
| --------------------- | ------------------------------- |
| list-unprocessed      | List unprocessed sources        |
| get-raw               | Retrieve raw source content     |
| list-structure        | Provide knowledge base snapshot |
| get-doc               | Retrieve document content       |
| apply                 | Apply AI decision               |
| ai-context (optional) | Combined optimized context      |
| mark-processed        | Mark item as processed          |

---

## 🔧 1. list-unprocessed

### Description

Returns all sources that have not yet been processed by the AI.

### CLI

```
app list-unprocessed
```

### Output

```
[
  {
    "id": "string",
    "title": "string",
    "source": "youtube | instagram",
    "createdAt": "ISO date",
    "processed": false
  }
]
```

### Notes

- Should be fast
- Must not include transcript (avoid large payloads)

---

## 🔧 2. get-raw

### Description

Returns full raw content for a specific source.

### CLI

```
app get-raw <id>
```

### Output

```
{
  "id": "string",
  "title": "string",
  "description": "string",
  "transcript": "string",
  "url": "string",
  "source": "youtube | instagram"
}
```

### Notes

- Transcript is required
- No additional processing should be done

---

## 🔧 3. list-structure

### Description

Provides a snapshot of the current knowledge base.

### CLI

```
app list-structure --pretty
```

### Output

```
{
  "docs": [
    {
      "title": "string",
      "path": "string",
      "summary": "short summary (2-3 lines)"
    }
  ],
  "tags": ["string"],
  "categories": ["string"]
}
```

### Notes

- Summary should be extracted from the document (first lines)
- Keep output concise

---

## 🔧 4. get-doc

### Description

Returns full content of a document.

### CLI

```
app get-doc <file>
```

### Output

```
{
  "title": "string",
  "content": "full markdown",
  "sources": [
    { "title": "string", "url": "string" }
  ]
}
```

### Notes

- Must parse "Sources" section
- Should not modify content

---

## 🔧 5. apply

### Description

Applies AI-generated decision to the knowledge base.

### CLI

```
app apply <file.json>
```

### Input (create/update)

```
{
  "action": "create | update",
  "target": "Document Name.md",
  "content": "markdown",
  "sources": [
    { "title": "string", "url": "string" }
  ]
}
```

### Input (suggest)

```
{
  "action": "suggest",
  "type": "new_tag | new_folder",
  "value": "string",
  "reason": "string"
}
```

### Input (ask)

```
{
  "action": "ask",
  "question": "string"
}
```

### Output

```
{
  "status": "success | error",
  "action": "create | update | suggest | ask",
  "file": "string (if applicable)"
}
```

### Behavior

- Must trigger backup before any write
- Must validate JSON input
- Must deduplicate sources
- Must NOT modify system files

---

## 🔧 6. ai-context (Optional, Recommended)

### Description

Returns both raw source and structure in a single call.

### CLI

```
app ai-context <id>
```

### Output

```
{
  "raw": { ...same as get-raw... },
  "structure": { ...same as list-structure... }
}
```

### Notes

- Reduces number of CLI calls
- Improves token efficiency

---

## 🔧 7. mark-processed

### Description

Marks a source as processed after successful application.

### CLI

```
app mark-processed <id>
```

### Output

```
{
  "status": "success"
}
```

### Notes

- Updates .system/sources.json
- Must be idempotent

---

## ⚠️ Constraints

- No direct file access by AI
- All outputs must be valid JSON
- No large unnecessary payloads
- Operations must be deterministic

---

## 🧠 Expected AI Flow

```
app list-unprocessed
→ choose id
→ app get-raw <id>
→ app list-structure
→ (optional) app get-doc <target>
→ generate decision.json
→ app apply decision.json
→ app mark-processed <id>
```

---

## 🚀 Future Extensions

- app ai-run <id>
- batch processing
- diff-aware updates
- rollback command

---

## ✅ Success Criteria

- Minimal token usage
- Reliable automation loop
- No duplication of content
- Safe file operations (with backup)
- Clear separation between AI and filesystem

---

## 🧠 Final Insight

This system is a **tool-augmented AI workflow**:

- CLI = structure, safety, determinism
- AI = reasoning, synthesis
- JSON = contract between both layers

---

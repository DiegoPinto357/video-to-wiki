# Plan: Recipe Wiki Support

## Problem & Approach

The project currently supports a single wiki "mode": knowledge bases where multiple videos can accumulate into the same document. Recipes need a different model — strict 1:1 (one video = one recipe doc), a fixed structured template, and an agent that never merges recipes.

The approach is to keep the CLI pipeline untouched and introduce the differences at two layers:

1. **Config**: a `type` field on `ConfigFile` (`'knowledge'` | `'recipe'`) to identify wiki mode
2. **New skill**: `update-recipes` — a variant of `update-wiki` with 1:1 rules, recipe template, and cross-linking behavior

The core ingest/apply/backup pipeline is fully reused. No changes to providers, ingest, or apply commands.

---

## Design Decisions

### Wiki Config Type

- `type?: 'knowledge' | 'recipe'` added to `ConfigFile`
- Default: `'knowledge'` (backwards compatible)
- Set via `wiki init --type recipe` or `wiki config set type recipe`

### Recipe Document Template

```
#tag1 #tag2

Breve introdução sobre o prato — origem, quando servir, o que o torna especial.

## Ingredientes

- item 1
- item 2

## Modo de Preparo

1. passo 1
2. passo 2

## Dicas

- dica opcional (omit entire section if no tips in source)

## Conclusão

Fechamento — sugestões de variação, harmonização ou como servir.

## Outras Versões

- [[Outra versão do mesmo prato]] (omit entire section if no related recipes exist)

---

## Fontes

- [Título do vídeo](url)
```

### Recipe Skill Rules

- **Always CREATE** — never update an existing recipe doc from a new video, even if same dish
- **1:1**: one video → one document, always
- **Cross-linking same dish**: before writing, agent scans existing docs for the same dish name. If found:
  1. First `update` the existing doc to add `[[New Recipe]]` to its `## Outras Versões` section (creating the section if absent)
  2. Then `create` the new doc with `[[Existing Recipe]]` in its `## Outras Versões` section
  - This is the **only** case where an existing recipe doc gets modified
- **Folder**: agent proposes category/cuisine folder and waits for approval (same `suggest` pattern as update-wiki)
- **Tags**: auto-registered on apply (same as update-wiki)
- **Naming**: doc title = dish name + differentiator if needed (e.g. `Carbonara (versão rápida).md`)

### `create-wiki` Skill Update

- After asking for language/context, also ask: "Is this a knowledge wiki or a recipe wiki?"
- Passes `--type knowledge|recipe` to `wiki init`
- Updates closing reminder to say "use `update-recipes` skill" for recipe wikis

### Status Command

- Show `(recipe)` or `(knowledge)` label next to wiki name — reads config per wiki

---

## Files to Change

| File                                        | Change                               |
| ------------------------------------------- | ------------------------------------ |
| `src/utils/system.ts`                       | Add `type` to `ConfigFile`           |
| `src/commands/wiki.ts`                      | Add `--type` option to `wiki init`   |
| `src/commands/status.ts`                    | Read config and show wiki type label |
| `.github/skills/update-recipes/SKILL.md`    | New skill — create                   |
| `.github/skills/update-recipes/template.md` | New recipe template — create         |
| `.github/skills/create-wiki/SKILL.md`       | Ask for wiki type, pass to init      |

---
name: phablens-annotation
description: Create PhabLens annotation mapping JSON files for Phabricator diffs, especially large refactorings with cross-references or explanatory review comments for complicated patches.
---

# PhabLens Annotation JSON

Use this skill when asked to create or revise a PhabLens JSON mapping file.

## Inputs to collect

- The Phabricator diff, patch, or enough file/range context to identify exact paths and line numbers.
- The intended use case: cross-referencing a refactoring, explaining a complicated patch, or both.
- Any preferred grouping labels, such as subsystem names, migration phases, or reviewer-facing topics.

If exact line numbers or Phabricator-displayed paths are missing, ask for them or inspect the diff before producing final JSON.

## Output contract

Create JSON matching `schemas/annotation-mapping.schema.json`. Treat that schema as the source of truth for fields, optionality, category meanings, and validation rules.

```json
{
  "$schema": "./schemas/annotation-mapping.schema.json",
  "annotations": []
}
```

## Refactoring workflow

1. Identify moved, renamed, divided, combined, folded-in, removed, and new blocks.
2. Prefer one annotation per reviewable concept, not one per tiny statement.
3. Use `group` to cluster related transformations.
4. Use two-sided annotations when navigation between sides helps review.
5. For one-to-many or many-to-one changes, create multiple annotations with the same `group` and explicit comments.

## Explanatory review workflow

1. Annotate confusing additions, deletions, and behavior changes.
2. Use two-sided annotations only when a reviewer should compare ranges.
3. Write comments as review notes: explain why the code exists, what invariant it preserves, or what behavior changed.

## Quality checklist

- Paths match Phabricator headers exactly.
- Line ranges are inclusive and point to visible diff lines.
- Comments are useful while hovering in the gutter; avoid long prose.
- The file validates against `schemas/annotation-mapping.schema.json`.

# PhabLens

[Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/phablens/) for Phabricator code review on `phabricator.services.mozilla.com`. This is a collection of utilities I, vhilla, wanted to have.

## Features

![Line review tracking, comment permalinks, and annotation gutter](gutter-example.png)

### Comment Permalinks
Each inline review comment gets a `#<id>` link (e.g. `#1641595`). Click to jump to it, or right-click → copy link for a shareable permalink.

### Floating latest diff / interdiff button
The lower right has a floating button to quickly get to
- the latest diff if on an interdiff or older diff
- the latest interdiff otherwise

### Line-Level Review Tracking
A narrow gutter column on each diff line lets you track review progress locally:

- **Click** a line to mark it reviewed (green). Click again to flag it (red). Click again to clear.
- **Click and drag** across multiple lines to mark a range at once.
- **Right-click** to attach a local note.
- A floating badge shows `N/M reviewed` progress. **Click the badge** to jump to the first line of the next unmarked block.

Review state is stored per revision and diff or interdiff locally in the browser.

### Annotation Mapping and Notes
Load a JSON file to attach notes to code blocks and to visualize how code moved between files during refactoring diffs. Useful for reviewing refactorings, LLM generated code, or code that needs lots of explanation.

- Click the **PhabLens** toolbar icon to open the annotation panel, then **Load JSON**.
- A second gutter column appears. Each annotation gets its own color from a cycling palette, so adjacent blocks are always visually distinct.
- **Hover** any colored cell to see its index, category, and comment.
- **Click** a linked annotation (ported/inlined/merged/split) to scroll to the counterpart in the diff.
- Supported categories: `ported`, `new`, `inlined`, `removed`, `merged`, `split`.
- Annotations are session-only (cleared on page reload). Collapsed files are handled — the gutter appears when the file is expanded.

#### Mapping file format

```json
{
  "$schema": "./schemas/annotation-mapping.schema.json",
  "annotations": [
    {
      "category": "ported",
      "group": "Lifecycle & setup",
      "from": { "file": "browser/foo.js", "lines": [10, 25], "name": "setup" },
      "to": { "file": "dom/Bar.cpp", "lines": [42, 57], "name": "Setup" },
      "comment": "Core logic moved to native impl"
    }
  ]
}
```

The field contract and descriptions are documented in `schemas/annotation-mapping.schema.json`.
For agents creating these files, see [the annotation skill](skills/phablens-annotation/SKILL.md).

### Annotation Lens (Picture-in-Picture)

![Annotation lens popout window](lens-example.png)

Open a floating lens window that shows annotation details as you hover over the gutter.

- In the annotation panel, click **Open Lens** to pop out a Document Picture-in-Picture window.
- **Hover** any annotation cell — the lens updates with the annotation's category, comment, and the corresponding source code cloned from the diff.
- For linked annotations (ported/inlined/merged/split), the lens shows the counterpart code (hover `from` → see `to`, and vice versa).
- For unlinked annotations (removed, new), the lens shows whichever side exists.

## Install

Get it from the store under https://addons.mozilla.org/en-US/firefox/addon/phablens/

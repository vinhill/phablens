# Phabvanced

Firefox extension for Phabricator code review on `phabricator.services.mozilla.com`.

## Features

### Comment Permalinks
Each inline review comment gets a `#<id>` link (e.g. `#1641595`). Click to jump to it, or right-click → copy link for a shareable permalink.

TODO comments get lost when changing the cell color

### Line-Level Review Tracking
A narrow gutter column on each diff line lets you track review progress locally:

- **Click** a line to mark it reviewed (green). Click again to flag it (red). Click again to clear.
- **Click and drag** across multiple lines to mark a range at once.
- **Right-click** to attach a local note.
- A floating badge shows `N/M reviewed` progress.

Review state is stored per revision and diff in `browser.storage.local`. Interdiffs (`?vs=X&id=Y`) are tracked separately.

### Annotation Mapping
Load a JSON mapping file to visualize how code moved between files in a large refactoring diff. Useful when porting JS to C++, splitting/merging modules, etc.

- Click the **Phabvanced** toolbar icon to open the annotation panel, then **Load JSON**.
- A second gutter column appears. Each annotation gets its own color from a cycling palette, so adjacent blocks are always visually distinct.
- **Hover** any colored cell to see its index, category, and comment.
- **Click** a linked annotation (ported/inlined/merged/split) to scroll to the counterpart in the diff.
- Supported categories: `ported`, `new`, `inlined`, `removed`, `merged`, `split`.
- Annotations are session-only (cleared on page reload). Collapsed files are handled — the gutter appears when the file is expanded.

#### Mapping file format

```json
{
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

Required: `category` + at least one of `from`/`to`. Optional: `group`, `name` (on from/to), `comment`.

### Annotation Lens (Picture-in-Picture)

Open a floating lens window that shows annotation details as you hover over the gutter.

- In the annotation panel, click **Open Lens** to pop out a Document Picture-in-Picture window.
- **Hover** any annotation cell — the lens updates with the annotation's category, comment, and the corresponding source code cloned from the diff.
- For linked annotations (ported/inlined/merged/split), the lens shows the counterpart code (hover `from` → see `to`, and vice versa).
- For unlinked annotations (removed, new), the lens shows whichever side exists.

Requires Firefox flag `dom.pictureInPictureAPI.documentEnabled` in `about:config`. The button is hidden when the API is unavailable.

## Install

```
web-ext run
```

Or load as a temporary extension via `about:debugging`.

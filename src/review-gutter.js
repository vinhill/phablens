"use strict";

const STATES = [null, "reviewed", "flagged"];

let _totalGutters = 0;
let _reviewedGutters = 0;

function nextState(current) {
  const idx = STATES.indexOf(current);
  return STATES[(idx + 1) % STATES.length];
}

function getFilePath(tr) {
  const changeset = tr.closest('[data-sigil="differential-changeset"]');
  if (!changeset) return null;
  const pathEl = changeset.querySelector(
    '[data-sigil="changeset-header-path-name"]'
  );
  return pathEl ? pathEl.textContent.trim() : null;
}

function parseLineInfo(td) {
  const lineNum = td.getAttribute("data-n");
  if (!lineNum) return null;
  const id = td.id || "";
  let side = "new";
  if (id.includes("OL")) side = "old";
  else if (id.includes("NL")) side = "new";
  return { lineNum, side };
}

// --- Drag state ---

let _dragStart = null;
let _dragEnd = null;
let _dragState = null;
let _dragTable = null;
let _highlighted = [];

function clearDragHighlight() {
  for (const g of _highlighted) {
    g.classList.remove("phablens-drag-preview");
  }
  _highlighted = [];
}

function updateDragHighlight() {
  clearDragHighlight();
  if (!_dragStart || !_dragEnd || !_dragTable) return;

  const rows = [..._dragTable.querySelectorAll("tr")];
  const startIdx = rows.indexOf(_dragStart.closest("tr"));
  const endIdx = rows.indexOf(_dragEnd.closest("tr"));
  if (startIdx === -1 || endIdx === -1) return;

  const from = Math.min(startIdx, endIdx);
  const to = Math.max(startIdx, endIdx);
  for (let i = from; i <= to; i++) {
    const g = rows[i].querySelector(".phablens-gutter");
    if (g) {
      g.classList.add("phablens-drag-preview");
      _highlighted.push(g);
    }
  }
}

function applyDragRange() {
  if (!_dragStart || !_dragEnd || !_dragTable) return;

  const rows = [..._dragTable.querySelectorAll("tr")];
  const startIdx = rows.indexOf(_dragStart.closest("tr"));
  const endIdx = rows.indexOf(_dragEnd.closest("tr"));
  if (startIdx === -1 || endIdx === -1) return;

  const from = Math.min(startIdx, endIdx);
  const to = Math.max(startIdx, endIdx);
  for (let i = from; i <= to; i++) {
    const g = rows[i].querySelector(".phablens-gutter");
    if (!g) continue;
    applyState(
      g,
      g.dataset.phablensFile,
      g.dataset.phablensSide,
      g.dataset.phablensLine,
      _dragState
    );
  }
}

function resetDrag() {
  clearDragHighlight();
  _dragStart = null;
  _dragEnd = null;
  _dragState = null;
  _dragTable = null;
}

// --- Cell creation ---

function createGutterCell(filePath, side, lineNum) {
  const cell = document.createElement("td");
  cell.className = "phablens-gutter";
  cell.setAttribute("data-phablens", "1");

  _totalGutters++;

  const existing = getLineState(filePath, side, lineNum);
  if (existing) {
    if (existing.state) cell.setAttribute("data-state", existing.state);
    if (existing.state === "reviewed") _reviewedGutters++;
    if (existing.note) {
      cell.title = existing.note;
      cell.setAttribute("data-has-note", "1");
    }
  }

  cell.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const current = cell.getAttribute("data-state");
    _dragState = nextState(current);
    _dragStart = cell;
    _dragEnd = cell;
    _dragTable = cell.closest("table");
    updateDragHighlight();
  });

  cell.addEventListener("mouseenter", () => {
    if (!_dragStart) return;
    if (cell.closest("table") !== _dragTable) return;
    _dragEnd = cell;
    updateDragHighlight();
  });

  cell.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showNotePopover(cell, filePath, side, lineNum);
  });

  cell.dataset.phablensFile = filePath;
  cell.dataset.phablensSide = side;
  cell.dataset.phablensLine = lineNum;

  return cell;
}

document.addEventListener("mouseup", (e) => {
  if (e.button !== 0 || !_dragStart) return;
  if (_dragStart === _dragEnd) {
    applyState(
      _dragStart,
      _dragStart.dataset.phablensFile,
      _dragStart.dataset.phablensSide,
      _dragStart.dataset.phablensLine,
      _dragState
    );
  } else {
    applyDragRange();
  }
  resetDrag();
});

// --- State ---

function applyState(cell, filePath, side, lineNum, state) {
  const prev = cell.getAttribute("data-state");
  if (prev === "reviewed") _reviewedGutters--;
  if (state === "reviewed") _reviewedGutters++;

  if (state) {
    cell.setAttribute("data-state", state);
  } else {
    cell.removeAttribute("data-state");
  }
  const existing = getLineState(filePath, side, lineNum);
  setLineState(filePath, side, lineNum, state, existing ? existing.note : "");
  updateSummaryBadge();
}

// --- Note popover ---

function showNotePopover(cell, filePath, side, lineNum) {
  const existing = document.querySelector(".phablens-note-popover");
  if (existing) existing.remove();

  const popover = document.createElement("div");
  popover.className = "phablens-note-popover";
  popover.setAttribute("data-phablens", "1");

  const textarea = document.createElement("textarea");
  textarea.rows = 5;
  textarea.cols = 40;
  const current = getLineState(filePath, side, lineNum);
  textarea.value = current ? current.note : "";

  const saveBtn = document.createElement("button");
  saveBtn.className = "phablens-btn-save";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", () => {
    const state = cell.getAttribute("data-state") || "flagged";
    applyState(cell, filePath, side, lineNum, state);
    const entry = getLineState(filePath, side, lineNum);
    if (entry) entry.note = textarea.value;
    else setLineState(filePath, side, lineNum, state, textarea.value);
    saveReviewData();
    cell.title = textarea.value;
    if (textarea.value) {
      cell.setAttribute("data-has-note", "1");
    } else {
      cell.removeAttribute("data-has-note");
    }
    popover.remove();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "phablens-btn-delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    const entry = getLineState(filePath, side, lineNum);
    if (entry) entry.note = "";
    saveReviewData();
    cell.title = "";
    cell.removeAttribute("data-has-note");
    popover.remove();
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "phablens-btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => popover.remove());

  const btnRow = document.createElement("div");
  btnRow.className = "phablens-popover-buttons";
  btnRow.append(deleteBtn, cancelBtn, saveBtn);
  popover.append(textarea, btnRow);

  const rect = cell.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY + 4}px`;
  popover.style.right = `${document.documentElement.clientWidth - rect.left + 4}px`;
  document.body.append(popover);
}

// --- File-level buttons ---

function setAllInTable(table, state) {
  const gutters = table.querySelectorAll(".phablens-gutter");
  for (const g of gutters) {
    applyState(
      g,
      g.dataset.phablensFile,
      g.dataset.phablensSide,
      g.dataset.phablensLine,
      state
    );
  }
}

function createFileButton(label, state, table) {
  const btn = document.createElement("button");
  btn.className = "phablens-file-btn";
  if (state) btn.setAttribute("data-state", state);
  btn.setAttribute("data-phablens", "1");
  btn.textContent = label;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAllInTable(table, state);
  });
  return btn;
}

function injectFileButtons(changeset, table) {
  const header = changeset.querySelector("h1.differential-file-icon-header");
  if (!header || header.dataset.phablensButtons) return;
  header.dataset.phablensButtons = "1";

  const group = document.createElement("span");
  group.className = "phablens-file-btn-group";
  group.setAttribute("data-phablens", "1");
  group.append(
    createFileButton("Clear", null, table),
    createFileButton("Reviewed", "reviewed", table),
    createFileButton("Flagged", "flagged", table)
  );
  header.append(group);
}

// --- Column injection ---

function injectGutterColumn() {
  const changesets = document.querySelectorAll(
    '[data-sigil="differential-changeset"]'
  );

  for (const changeset of changesets) {
    const table = changeset.querySelector("table.differential-diff");
    if (!table || table.dataset.phablensGutter) continue;

    const filePath = getFilePath(table.querySelector("tr") || changeset);
    if (!filePath) continue;

    const rows = table.querySelectorAll("tbody tr");
    const hasCodeRows = [...rows].some((tr) => tr.querySelectorAll("td.n[data-n]").length > 0);
    if (!hasCodeRows) continue;

    table.dataset.phablensGutter = "1";

    const colgroup = table.querySelector("colgroup");
    if (colgroup) {
      const col = document.createElement("col");
      col.className = "phablens-col";
      colgroup.append(col);
    }

    injectFileButtons(changeset, table);

    for (const tr of rows) {
      const isSpecial = tr.classList.contains("inline") || tr.hasAttribute("data-sigil");
      if (isSpecial) {
        const lastTd = tr.querySelector("td:last-child");
        if (lastTd) lastTd.colSpan = (lastTd.colSpan || 1) + 1;
        continue;
      }

      const lineTds = tr.querySelectorAll("td.n[data-n]");
      if (lineTds.length === 0) {
        const lastTd = tr.querySelector("td:last-child");
        if (lastTd) lastTd.colSpan = (lastTd.colSpan || 1) + 1;
        continue;
      }

      const newLineTd = tr.querySelector('td[id*="NL"][data-n]');
      const oldLineTd = tr.querySelector('td[id*="OL"][data-n]');
      const targetTd = newLineTd || oldLineTd;

      if (targetTd) {
        const info = parseLineInfo(targetTd);
        if (info) {
          const gutter = createGutterCell(filePath, info.side, info.lineNum);
          tr.append(gutter);
          continue;
        }
      }

      const spacer = document.createElement("td");
      spacer.setAttribute("data-phablens", "1");
      tr.append(spacer);
    }
  }
  updateSummaryBadge();
}

// --- Summary ---

function scrollToFirstUnreviewed() {
  const gutters = document.querySelectorAll(".phablens-gutter");
  for (const g of gutters) {
    if (g.getAttribute("data-state") !== "reviewed") {
      g.scrollIntoView({ behavior: "smooth", block: "center" });
      g.classList.add("phablens-flash");
      setTimeout(() => g.classList.remove("phablens-flash"), 1000);
      return;
    }
  }
}

function updateSummaryBadge() {
  let badge = document.getElementById("phablens-summary");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "phablens-summary";
    badge.setAttribute("data-phablens", "1");
    badge.title = "Jump to first unreviewed line";
    badge.addEventListener("click", scrollToFirstUnreviewed);
    document.body.append(badge);
  }
  badge.textContent = `${_reviewedGutters}/${_totalGutters} reviewed`;
  badge.style.display = _totalGutters > 0 ? "block" : "none";
}

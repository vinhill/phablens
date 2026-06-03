"use strict";

let _annotationData = null;

const ANNOT_LINKED = new Set(["ported", "inlined", "merged", "split"]);

const ANNOT_COLORS = [
  "#0969da",
  "#cf222e",
  "#2da44e",
  "#8250df",
  "#bf8700",
  "#0550ae",
  "#d1242f",
  "#1a7f37",
  "#6639ba",
  "#953800",
];

function findAnnotation(filePath, side, lineNum) {
  if (!_annotationData) return null;
  const num = parseInt(lineNum, 10);
  for (let i = 0; i < _annotationData.annotations.length; i++) {
    const a = _annotationData.annotations[i];
    const ref = side === "old" ? a.from : a.to;
    if (!ref) continue;
    if (ref.file !== filePath) continue;
    if (num >= ref.lines[0] && num <= ref.lines[1]) {
      return { annotation: a, index: i };
    }
  }
  return null;
}

function getLinkedRef(annotation, side) {
  return side === "old" ? annotation.to : annotation.from;
}

function scrollToFileAndLine(filePath, lineNum) {
  const changesets = document.querySelectorAll('[data-sigil="differential-changeset"]');
  for (const cs of changesets) {
    const pathEl = cs.querySelector('[data-sigil="changeset-header-path-name"]');
    if (!pathEl || pathEl.textContent.trim() !== filePath) continue;

    const table = cs.querySelector("table.differential-diff");
    if (!table) continue;

    const targetTd = table.querySelector(`td[data-n="${lineNum}"]`);
    if (targetTd) {
      targetTd.closest("tr").scrollIntoView({ behavior: "smooth", block: "center" });
      targetTd.closest("tr").style.outline = "2px solid #0969da";
      setTimeout(() => { targetTd.closest("tr").style.outline = ""; }, 2000);
      return;
    }
  }
  showToast("Target file/line not visible in this diff view");
}

function showToast(msg) {
  const existing = document.getElementById("phabvanced-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "phabvanced-toast";
  toast.setAttribute("data-phabvanced", "1");
  toast.textContent = msg;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3000);
}

function createAnnotCell(filePath, side, lineNum) {
  const match = findAnnotation(filePath, side, lineNum);
  const cell = document.createElement("td");
  cell.className = "phabvanced-annot";
  cell.setAttribute("data-phabvanced", "1");

  if (!match) return cell;

  const { annotation, index } = match;
  const color = ANNOT_COLORS[index % ANNOT_COLORS.length];
  cell.setAttribute("data-annot-idx", index);
  cell.style.backgroundColor = color;

  const parts = [`#${index}`, annotation.category];
  if (annotation.comment) parts.push(annotation.comment);
  cell.title = parts.join(" — ");

  const linked = getLinkedRef(annotation, side);
  if (linked && ANNOT_LINKED.has(annotation.category)) {
    cell.classList.add("phabvanced-annot-linked");
    cell.addEventListener("click", () => {
      scrollToFileAndLine(linked.file, linked.lines[0]);
    });
  }

  return cell;
}

function removeAnnotationGutter() {
  for (const col of document.querySelectorAll("col.phabvanced-annot-col")) {
    col.remove();
  }
  for (const cell of document.querySelectorAll("td.phabvanced-annot")) {
    cell.remove();
  }
  for (const table of document.querySelectorAll("table[data-phabvanced-annot]")) {
    table.removeAttribute("data-phabvanced-annot");

    for (const tr of table.querySelectorAll("tbody tr")) {
      const isSpecial = tr.classList.contains("inline") || tr.hasAttribute("data-sigil");
      const lineTds = tr.querySelectorAll("td.n[data-n]");
      if (isSpecial || lineTds.length === 0) {
        const lastTd = tr.querySelector("td:last-child");
        if (lastTd && lastTd.colSpan > 1) {
          lastTd.colSpan = lastTd.colSpan - 1;
        }
      }
    }
  }
}

function injectAnnotationGutter() {
  if (!_annotationData) {
    console.log(LOG_PREFIX, "annot: no annotation data loaded");
    return;
  }

  const annotFiles = new Set();
  for (const a of _annotationData.annotations) {
    if (a.from) annotFiles.add(a.from.file);
    if (a.to) annotFiles.add(a.to.file);
  }
  console.log(LOG_PREFIX, "annot: looking for files:", [...annotFiles]);

  const changesets = document.querySelectorAll('[data-sigil="differential-changeset"]');
  console.log(LOG_PREFIX, "annot: found", changesets.length, "changesets");

  let injectedCount = 0;
  let matchedCells = 0;

  for (const changeset of changesets) {
    const table = changeset.querySelector("table.differential-diff");
    if (!table || table.dataset.phabvancedAnnot) continue;

    const filePath = getFilePath(table.querySelector("tr") || changeset);
    if (!filePath) continue;

    const rows = table.querySelectorAll("tbody tr");
    const hasCodeRows = [...rows].some((tr) => tr.querySelectorAll("td.n[data-n]").length > 0);

    if (!hasCodeRows) {
      console.log(LOG_PREFIX, "annot: skipping collapsed file:", filePath);
      continue;
    }

    const fileHasAnnotations = annotFiles.has(filePath);
    console.log(LOG_PREFIX, "annot: processing file:", filePath, fileHasAnnotations ? "(has annotations)" : "(no annotations)");

    table.dataset.phabvancedAnnot = "1";
    injectedCount++;

    const colgroup = table.querySelector("colgroup");
    if (colgroup) {
      const col = document.createElement("col");
      col.className = "phabvanced-annot-col";
      colgroup.append(col);
    }

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
          const cell = createAnnotCell(filePath, info.side, info.lineNum);
          if (cell.hasAttribute("data-annot-idx")) matchedCells++;
          tr.append(cell);
          continue;
        }
      }

      const spacer = document.createElement("td");
      spacer.className = "phabvanced-annot";
      spacer.setAttribute("data-phabvanced", "1");
      tr.append(spacer);
    }
  }

  console.log(LOG_PREFIX, "annot: injected gutter into", injectedCount, "tables,", matchedCells, "cells matched annotations");
}

// --- In-page annotation panel ---

const VALID_CATEGORIES = ["ported", "new", "inlined", "removed", "merged", "split"];

function validateAnnotations(data) {
  if (!data || !Array.isArray(data.annotations)) {
    return "Missing \"annotations\" array";
  }
  for (let i = 0; i < data.annotations.length; i++) {
    const a = data.annotations[i];
    if (!VALID_CATEGORIES.includes(a.category)) {
      return `annotations[${i}]: invalid category "${a.category}"`;
    }
    if (!a.from && !a.to) {
      return `annotations[${i}]: must have "from" and/or "to"`;
    }
    for (const side of ["from", "to"]) {
      if (a[side]) {
        if (!a[side].file || !Array.isArray(a[side].lines) || a[side].lines.length !== 2) {
          return `annotations[${i}].${side}: must have "file" (string) and "lines" ([start, end])`;
        }
      }
    }
  }
  return null;
}

// TODO can we clean this up a bit, maybe move to its own file and use a
// template / html string / html file for the markup?
function toggleAnnotationPanel() {
  const existing = document.getElementById("phabvanced-annot-panel");
  if (existing) {
    existing.remove();
    return;
  }

  const panel = document.createElement("div");
  panel.id = "phabvanced-annot-panel";
  panel.setAttribute("data-phabvanced", "1");

  const title = document.createElement("strong");
  title.textContent = "Phabvanced Annotations";

  const status = document.createElement("div");
  status.className = "phabvanced-annot-panel-status";
  status.textContent = _annotationData
    ? `${_annotationData.annotations.length} annotation(s) loaded`
    : "No annotations loaded";

  const error = document.createElement("div");
  error.className = "phabvanced-annot-panel-error";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  fileInput.style.display = "none";

  const loadBtn = document.createElement("button");
  loadBtn.className = "phabvanced-annot-panel-btn phabvanced-annot-panel-btn-load";
  loadBtn.textContent = "Load JSON";
  loadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    error.textContent = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const err = validateAnnotations(data);
      if (err) {
        error.textContent = err;
        return;
      }
      loadAnnotations(data);
      status.textContent = `${data.annotations.length} annotation(s) loaded`;
    } catch (ex) {
      error.textContent = `Parse error: ${ex.message}`;
    }
    fileInput.value = "";
  });

  const clearBtn = document.createElement("button");
  clearBtn.className = "phabvanced-annot-panel-btn phabvanced-annot-panel-btn-clear";
  clearBtn.textContent = "Clear";
  clearBtn.addEventListener("click", () => {
    clearAnnotations();
    status.textContent = "No annotations loaded";
    error.textContent = "";
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "phabvanced-annot-panel-btn";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => panel.remove());

  const btnRow = document.createElement("div");
  btnRow.className = "phabvanced-annot-panel-buttons";
  btnRow.append(loadBtn, clearBtn, closeBtn);

  panel.append(title, status, error, fileInput, btnRow);
  document.body.append(panel);
}

function loadAnnotations(data) {
  console.log(LOG_PREFIX, "annot: loading", data.annotations.length, "annotations");
  removeAnnotationGutter();
  _annotationData = data;
  injectAnnotationGutter();
}

function clearAnnotations() {
  removeAnnotationGutter();
  _annotationData = null;
}

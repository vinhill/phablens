"use strict";

function getRevisionDiffIds() {
  const revisionPath = window.location.pathname.replace(/\/$/, "");
  const diffIds = new Set();

  for (const link of document.querySelectorAll("a[href]")) {
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      continue;
    }

    const diffId = new URLSearchParams(url.search).get("id");
    if (
      url.pathname.replace(/\/$/, "") === revisionPath &&
      /^\d+$/.test(diffId || "") &&
      link.textContent.trim() === diffId
    ) {
      diffIds.add(diffId);
    }
  }

  return [...diffIds].sort((a, b) => Number(a) - Number(b));
}

function getLatestInterdiffUrl(diffIds = getRevisionDiffIds()) {
  if (diffIds.length < 2) return null;

  const params = new URLSearchParams({
    vs: diffIds[diffIds.length - 2],
    id: diffIds[diffIds.length - 1],
  });
  return `${window.location.pathname}?${params}`;
}

function injectDiffNavigation() {
  let link = document.getElementById("phablens-diff-navigation");
  const diffIds = getRevisionDiffIds();
  const latestDiffId = diffIds[diffIds.length - 1];
  const currentDiffId = getDiffId();
  const showLatestDiff = Boolean(getVsId()) ||
    (currentDiffId !== null && Number(currentDiffId) < Number(latestDiffId));
  const href = showLatestDiff
    ? `${window.location.pathname}${window.location.hash}`
    : getLatestInterdiffUrl(diffIds);

  if (!href) {
    if (link) link.remove();
    return;
  }

  if (!link) {
    link = document.createElement("a");
    link.id = "phablens-diff-navigation";
    link.className = "phablens-diff-navigation";
    link.setAttribute("data-phablens", "1");
    document.body.append(link);
  }

  link.href = href;
  link.textContent = showLatestDiff ? "Back to latest diff" : "Latest interdiff";
  link.title = showLatestDiff
    ? "Return to the latest revision diff"
    : "Compare the two latest diffs";
}

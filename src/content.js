"use strict";

let _mutationTimer = null;
let _observer = null;

function onMutations(mutations) {
  const selfOnly = mutations.every(
    (m) => m.target.closest && m.target.closest("[data-phabvanced]")
  );
  if (selfOnly) return;

  if (_mutationTimer) return;
  _mutationTimer = setTimeout(() => {
    _mutationTimer = null;
    runInjections();
  }, 300);
}

function runInjections() {
  _observer.disconnect();
  injectCommentPermalinks();
  injectGutterColumn();
  _observer.observe(document.getElementById("differential-review-stage") || document.body, {
    childList: true,
    subtree: true,
  });
}

async function init() {
  const revisionId = getRevisionId();
  if (!revisionId) return;

  await loadReviewData();

  _observer = new MutationObserver(onMutations);

  runInjections();
}

init();

"use strict";

function injectCommentPermalinks() {
  const commentAnchors = document.querySelectorAll(
    'a.differential-inline-comment-anchor[id^="inline-"]'
  );
  for (const anchor of commentAnchors) {
    if (anchor.dataset.phablensLink) continue;
    anchor.dataset.phablensLink = "1";

    const td = anchor.closest("td");
    if (!td) continue;

    const inlineId = anchor.id.replace("inline-", "");
    const link = document.createElement("a");
    link.className = "phablens-permalink";
    link.setAttribute("data-phablens", "1");
    link.href = `${window.location.pathname}${window.location.search}#${anchor.id}`;
    link.textContent = `#${inlineId}`;

    const header = td.querySelector(".differential-inline-comment-head");
    if (header) {
      const headRight = header.querySelector(".inline-head-right");
      if (headRight) {
        headRight.prepend(link);
      } else {
        header.append(link);
      }
    } else {
      td.prepend(link);
    }
  }
}

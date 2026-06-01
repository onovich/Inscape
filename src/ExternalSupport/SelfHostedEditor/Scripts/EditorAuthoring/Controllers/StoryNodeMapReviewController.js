export class StoryNodeMapReviewController {
  constructor(options) {
    this.reviewBridge = options.reviewBridge;
    this.reviewButtonElement = options.reviewButtonElement;
    this.sourceSelectionHandler = null;
    this.statusTimeout = null;
  }

  onSourceLineSelected(handler) {
    this.sourceSelectionHandler = handler;
  }

  async review(scriptText) {
    if (!this.reviewBridge) {
      return;
    }

    this.setButtonBusy(true);
    const snapshot = await this.reviewBridge.reviewNodeMap(scriptText);
    this.setButtonBusy(false);
    if (snapshot.provider !== "node-map-review" || !snapshot.review) {
      this.showButtonStatus("Node Map unavailable");
      return;
    }

    this.showButtonStatus(this.createSummaryLabel(snapshot.review.report?.summary));
    this.openReviewDialog(snapshot.review);
  }

  openReviewDialog(reviewPayload) {
    const overlay = document.createElement("div");
    overlay.className = "node-map-review-overlay";

    const dialog = document.createElement("section");
    dialog.className = "node-map-review-dialog";
    dialog.setAttribute("aria-label", "Stable node map review");

    const header = document.createElement("header");
    header.className = "node-map-review-header";

    const title = document.createElement("div");
    title.className = "node-map-review-title";
    title.textContent = "Stable Node Map";

    const summary = document.createElement("div");
    summary.className = "node-map-review-summary";
    summary.textContent = this.createSummaryLabel(reviewPayload.report?.summary);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "node-map-review-close";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => overlay.remove());

    header.append(title, summary, closeButton);

    const actions = document.createElement("div");
    actions.className = "node-map-review-actions";

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "node-map-review-download";
    downloadButton.textContent = "Download Node Map";
    downloadButton.addEventListener("click", () => this.downloadNodeMap(reviewPayload));
    actions.append(downloadButton);

    const itemList = document.createElement("div");
    itemList.className = "node-map-review-list";
    const items = Array.isArray(reviewPayload.report?.items) ? reviewPayload.report.items : [];
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "node-map-review-empty";
      empty.textContent = "No review items";
      itemList.append(empty);
    } else {
      for (const item of items) {
        itemList.append(this.createReviewItemElement(item));
      }
    }

    dialog.append(header, actions, itemList);
    overlay.append(dialog);
    document.body.append(overlay);
  }

  createReviewItemElement(item) {
    const wrapper = document.createElement("article");
    wrapper.className = `node-map-review-item node-map-review-item-${item.kind || "unknown"}`;

    const head = document.createElement("button");
    head.type = "button";
    head.className = "node-map-review-item-main";
    head.dataset.sourceLine = String(item.sourceLine || 1);
    head.addEventListener("click", () => {
      this.selectSourceLine(item);
    });

    const kind = document.createElement("span");
    kind.className = "node-map-review-kind";
    kind.textContent = item.kind || "unknown";

    const title = document.createElement("strong");
    title.className = "node-map-review-item-title";
    title.textContent = item.title || "(untitled)";

    const source = document.createElement("small");
    source.className = "node-map-review-source";
    source.textContent = this.formatSource(item.sourcePath, item.sourceLine);

    const message = document.createElement("p");
    message.className = "node-map-review-message";
    message.textContent = item.message || "";

    head.append(kind, title, source, message);
    wrapper.append(head);

    if (Array.isArray(item.candidates) && item.candidates.length > 0) {
      const candidates = document.createElement("div");
      candidates.className = "node-map-review-candidates";
      for (const candidate of item.candidates) {
        const candidateButton = document.createElement("button");
        candidateButton.type = "button";
        candidateButton.className = "node-map-review-candidate";
        candidateButton.dataset.sourceLine = String(candidate.sourceLine || 1);
        candidateButton.textContent = `${candidate.title || "(candidate)"} · score ${Number(candidate.score || 0)}`;
        candidateButton.addEventListener("click", () => {
          this.selectSourceLine(candidate);
        });
        candidates.append(candidateButton);
      }
      wrapper.append(candidates);
    }

    return wrapper;
  }

  selectSourceLine(item) {
    if (!this.sourceSelectionHandler) {
      return;
    }

    this.sourceSelectionHandler({
      lineNumber: Math.max(1, Number(item.sourceLine || 1)),
      sourcePath: item.sourcePath || "",
    });
  }

  downloadNodeMap(reviewPayload) {
    if (!reviewPayload?.nodeMapText || typeof Blob === "undefined" || typeof URL === "undefined") {
      return;
    }

    const blob = new Blob([reviewPayload.nodeMapText], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = this.fileNameFromPath(reviewPayload.nodeMapPath || "inscape.node-map.json");
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  setButtonBusy(isBusy) {
    if (!this.reviewButtonElement) {
      return;
    }

    this.reviewButtonElement.disabled = isBusy;
    this.reviewButtonElement.dataset.nodeMapState = isBusy ? "loading" : "idle";
    this.reviewButtonElement.textContent = isBusy ? "Node Map..." : "Node Map";
  }

  showButtonStatus(label) {
    if (!this.reviewButtonElement) {
      return;
    }

    globalThis.window?.clearTimeout?.(this.statusTimeout);
    this.reviewButtonElement.textContent = label;
    this.statusTimeout = globalThis.window?.setTimeout?.(() => {
      this.reviewButtonElement.textContent = "Node Map";
    }, 2600);
  }

  createSummaryLabel(summary) {
    const renamed = Number(summary?.renamedNodeCount || 0);
    const manual = Number(summary?.manualReviewCount || 0);
    const conflicts = Number(summary?.conflictNodeCount || 0);
    const missing = Number(summary?.missingNodeCount || 0);
    const fresh = Number(summary?.newNodeCount || 0);
    return `${fresh} new · ${renamed} renamed · ${manual} review · ${conflicts} conflict · ${missing} missing`;
  }

  formatSource(sourcePath, line) {
    const fileName = this.fileNameFromPath(sourcePath || "workspace");
    return `${fileName}:${Number(line || 1)}`;
  }

  fileNameFromPath(sourcePath) {
    const segments = String(sourcePath || "").replace(/\\/g, "/").split("/").filter(Boolean);
    return segments[segments.length - 1] || "inscape.node-map.json";
  }
}

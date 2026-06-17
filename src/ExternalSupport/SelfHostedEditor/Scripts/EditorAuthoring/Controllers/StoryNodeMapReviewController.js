export class StoryNodeMapReviewController {
  constructor(options) {
    this.reviewBridge = options.reviewBridge;
    this.reviewButtonElement = options.reviewButtonElement;
    this.currentReviewPayload = null;
    this.currentScriptText = "";
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

    this.currentReviewPayload = snapshot.review;
    this.currentScriptText = scriptText;
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
        itemList.append(this.createReviewItemElement(item, reviewPayload));
      }
    }

    dialog.append(header, actions, itemList);
    overlay.append(dialog);
    document.body.append(overlay);
  }

  createReviewItemElement(item, reviewPayload) {
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
        const candidateRow = document.createElement("div");
        candidateRow.className = "node-map-review-candidate-row";

        const candidateButton = document.createElement("button");
        candidateButton.type = "button";
        candidateButton.className = "node-map-review-candidate";
        candidateButton.dataset.sourceLine = String(candidate.sourceLine || 1);
        candidateButton.textContent = `${candidate.title || "(candidate)"} · score ${Number(candidate.score || 0)}`;
        candidateButton.addEventListener("click", () => {
          this.selectSourceLine(candidate);
        });
        candidateRow.append(candidateButton);

        const applyPreview = this.formatApplyPreview(candidate.applyPreview);
        if (applyPreview) {
          const previewLabel = document.createElement("small");
          previewLabel.className = "node-map-review-candidate-plan";
          previewLabel.textContent = applyPreview;
          candidateRow.append(previewLabel);
        }

        if (item.kind === "manual-review") {
          const previewButton = document.createElement("button");
          previewButton.type = "button";
          previewButton.className = "node-map-review-candidate-action node-map-review-candidate-preview";
          previewButton.textContent = "Preview Apply";
          previewButton.addEventListener("click", (event) => {
            event.stopPropagation();
            void this.previewCandidateApply(item, candidate, candidateRow);
          });

          const applyButton = document.createElement("button");
          applyButton.type = "button";
          applyButton.className = "node-map-review-candidate-action node-map-review-candidate-apply";
          applyButton.textContent = "Apply";
          applyButton.addEventListener("click", (event) => {
            event.stopPropagation();
            this.requestCandidateApplyConfirmation(item, candidate, reviewPayload, candidateRow);
          });

          candidateRow.append(previewButton, applyButton);
        }

        candidates.append(candidateRow);
      }
      wrapper.append(candidates);
    }

    return wrapper;
  }

  async previewCandidateApply(item, candidate, container) {
    if (!this.reviewBridge || typeof this.reviewBridge.previewCandidateApply !== "function") {
      this.setCandidateStatus(container, "Candidate preview unavailable");
      return;
    }

    this.setCandidateBusy(container, true);
    const snapshot = await this.reviewBridge.previewCandidateApply(
      this.currentScriptText,
      item,
      candidate,
      this.currentReviewPayload?.nodeMapPath || ""
    );
    this.setCandidateBusy(container, false);
    if (snapshot.provider !== "node-map-apply" || !snapshot.apply) {
      this.setCandidateStatus(container, snapshot.error || "Candidate preview failed");
      return;
    }

    this.setCandidateStatus(container, `Dry-run ready: ${this.formatApplyPreview(snapshot.apply.changePreview) || snapshot.apply.candidateStableId || candidate.stableId || "candidate"}`);
    this.downloadNodeMapText(
      snapshot.apply.nodeMapText,
      `preview-${this.fileNameFromPath(snapshot.apply.nodeMapPath || "inscape.node-map.json")}`
    );
  }

  requestCandidateApplyConfirmation(item, candidate, reviewPayload, container) {
    if (!container) {
      return;
    }

    if (container.querySelector(".node-map-review-candidate-confirm")) {
      this.setCandidateStatus(container, "Confirm Apply to write after backup");
      return;
    }

    const confirmation = document.createElement("div");
    confirmation.className = "node-map-review-candidate-confirm";

    const message = document.createElement("small");
    message.className = "node-map-review-candidate-confirm-message";
    message.textContent = "Confirm apply. Desktop workspaces write after creating a backup.";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "node-map-review-candidate-action node-map-review-candidate-confirm-apply";
    confirmButton.textContent = "Confirm Apply";
    confirmButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.applyCandidate(item, candidate, reviewPayload, container);
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "node-map-review-candidate-action node-map-review-candidate-cancel-apply";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", (event) => {
      event.stopPropagation();
      confirmation.remove();
      this.setCandidateStatus(container, "Apply canceled");
    });

    confirmation.append(message, confirmButton, cancelButton);
    container.append(confirmation);
    this.setCandidateStatus(container, "Confirm Apply to continue");
  }

  async applyCandidate(item, candidate, reviewPayload, container) {
    if (!this.reviewBridge || typeof this.reviewBridge.applyCandidate !== "function") {
      this.setCandidateStatus(container, "Candidate apply unavailable");
      return;
    }

    this.setCandidateBusy(container, true);
    const snapshot = await this.reviewBridge.applyCandidate(
      this.currentScriptText,
      item,
      candidate,
      false,
      reviewPayload.nodeMapPath || ""
    );
    this.setCandidateBusy(container, false);
    if (snapshot.provider !== "node-map-apply" || !snapshot.apply) {
      this.setCandidateStatus(container, snapshot.error || "Candidate apply failed");
      return;
    }

    reviewPayload.nodeMap = snapshot.apply.nodeMap;
    reviewPayload.nodeMapPath = snapshot.apply.nodeMapPath || reviewPayload.nodeMapPath;
    reviewPayload.nodeMapText = snapshot.apply.nodeMapText || reviewPayload.nodeMapText;
    this.currentReviewPayload = reviewPayload;

    const label = this.formatApplyPreview(snapshot.apply.changePreview) || snapshot.apply.candidateStableId || candidate.stableId || "candidate";
    if (!snapshot.apply.result?.writesNodeMap) {
      this.setCandidateStatus(container, `Download ready for ${label}; apply did not report a sidecar write`);
      return;
    }

    if (!this.reviewBridge || typeof this.reviewBridge.writeBackNodeMap !== "function") {
      this.setCandidateStatus(container, `Download ready for ${label}; workspace write-back unavailable${this.formatRecoveryHint(snapshot.apply)}`);
      return;
    }

    this.setCandidateBusy(container, true);
    const writeBackSnapshot = await this.reviewBridge.writeBackNodeMap(snapshot.apply);
    this.setCandidateBusy(container, false);
    if (writeBackSnapshot.provider === "node-map-write-back" && writeBackSnapshot.writeBack?.ok) {
      this.setCandidateStatus(container, `Applied ${label} to workspace node map; backup copied${this.formatWriteBackBackupSuffix(writeBackSnapshot.writeBack)}${this.formatRecoveryHint(snapshot.apply)}`);
      return;
    }

    const reason = writeBackSnapshot.writeBack?.reason || writeBackSnapshot.error || "workspace write-back failed";
    this.setCandidateStatus(container, `Download ready for ${label}; workspace write-back failed: ${reason}${this.formatRecoveryHint(snapshot.apply)}`);
  }

  setCandidateBusy(container, isBusy) {
    if (!container) {
      return;
    }

    for (const button of container.querySelectorAll("button")) {
      button.disabled = isBusy;
    }
  }

  setCandidateStatus(container, message) {
    if (!container) {
      return;
    }

    let status = container.querySelector(".node-map-review-candidate-status");
    if (!status) {
      status = document.createElement("small");
      status.className = "node-map-review-candidate-status";
      container.append(status);
    }

    status.textContent = message;
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

  formatApplyPreview(preview) {
    if (!preview || typeof preview !== "object") {
      return "";
    }

    const removedStableId = preview.removedStableId || preview.currentStableId || "";
    const appliedStableId = preview.appliedStableId || preview.candidateStableId || "";
    if (!removedStableId || !appliedStableId) {
      return "";
    }

    return `${removedStableId} -> ${appliedStableId}`;
  }

  formatWriteBackBackupSuffix(writeBack) {
    const copiedCount = Number(writeBack?.backup?.copiedCount || 0);
    if (copiedCount > 0) {
      return ` (${copiedCount})`;
    }

    return "";
  }

  formatRecoveryHint(applyPayload) {
    const hint = applyPayload?.recoveryHint || applyPayload?.result?.recoveryHint || "";
    return hint ? `; ${hint}` : "";
  }

  downloadNodeMap(reviewPayload) {
    if (!reviewPayload?.nodeMapText || typeof Blob === "undefined" || typeof URL === "undefined") {
      return;
    }

    this.downloadNodeMapText(reviewPayload.nodeMapText, this.fileNameFromPath(reviewPayload.nodeMapPath || "inscape.node-map.json"));
  }

  downloadNodeMapText(nodeMapText, fileName) {
    if (!nodeMapText || typeof Blob === "undefined" || typeof URL === "undefined") {
      return;
    }

    const blob = new Blob([nodeMapText], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "inscape.node-map.json";
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

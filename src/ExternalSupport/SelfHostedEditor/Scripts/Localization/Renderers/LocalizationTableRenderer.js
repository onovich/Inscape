export class LocalizationTableRenderer {
  constructor({
    draftStore,
    getRowKey,
    getRowStatus,
    onReviewAction,
    onSourceLineSelected,
    onTranslationInput,
  }) {
    this.draftStore = draftStore;
    this.getRowKey = getRowKey;
    this.getRowStatus = getRowStatus;
    this.onReviewAction = onReviewAction;
    this.onSourceLineSelected = onSourceLineSelected;
    this.onTranslationInput = onTranslationInput;
  }

  render(rows) {
    const shell = document.createElement("div");
    shell.className = "localization-table-shell";
    const table = document.createElement("table");
    table.className = "localization-table";
    table.append(this.createHeader());
    const body = document.createElement("tbody");

    for (const row of rows) {
      body.append(this.createRow(row));
    }

    table.append(body);
    const filterEmptyState = document.createElement("div");
    filterEmptyState.className = "localization-filter-empty is-hidden";
    filterEmptyState.textContent = "No rows match the current filter.";
    shell.append(table, filterEmptyState);
    return {
      filterEmptyStateElement: filterEmptyState,
      shell,
      tableBodyElement: body,
    };
  }

  createHeader() {
    const head = document.createElement("thead");
    const row = document.createElement("tr");
    for (const label of ["Status", "Review", "Node", "Line", "Kind", "Source text", "Translation draft"]) {
      const cell = document.createElement("th");
      cell.textContent = label;
      row.append(cell);
    }
    head.append(row);
    return head;
  }

  createRow(item) {
    const row = document.createElement("tr");
    row.dataset.sourceLine = String(item.sourceLine);
    row.dataset.sourcePath = item.sourcePath || "";
    this.updateRowStatusState(row, item);

    const status = document.createElement("td");
    status.append(this.createStatusPill(item));

    const review = this.createReviewCell(item);

    const node = document.createElement("td");
    node.textContent = item.nodeTitle;

    const line = document.createElement("td");
    line.textContent = String(item.sourceLine);

    const kind = document.createElement("td");
    kind.textContent = item.kind;

    const text = document.createElement("td");
    text.className = "localization-source-text";
    text.textContent = item.speaker ? `${item.speaker}：${item.text}` : item.text;

    const translation = document.createElement("td");
    translation.append(this.createTranslationInput(item, row));

    row.append(status, review, node, line, kind, text, translation);
    return row;
  }

  createReviewCell(item) {
    const review = document.createElement("td");
    review.className = "localization-review-summary";

    const summary = document.createElement("div");
    summary.className = "localization-review-text";
    summary.textContent = item.reviewSummary || item.review || "draft";
    if (item.reviewDetail) {
      summary.title = item.reviewDetail;
    }
    review.append(summary);
    const audit = this.createReviewAudit(item);
    if (audit) {
      review.append(audit);
    }

    if (Array.isArray(item.actions) && item.actions.length > 0) {
      const actions = document.createElement("div");
      actions.className = "localization-review-actions";
      const detail = document.createElement("div");
      detail.className = "localization-review-action-detail is-hidden";

      for (const action of item.actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `localization-review-action localization-review-action-${this.getReviewActionClass(action)}`;
        button.textContent = this.createReviewActionLabel(action);
        button.title = this.createReviewActionTitle(action, button.textContent);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.onReviewAction(action, item, detail);
        });
        actions.append(button);
      }

      review.append(actions, detail);
    }

    return review;
  }

  createReviewAudit(item) {
    const audit = document.createElement("div");
    audit.className = "localization-review-audit";
    const itemSignals = this.createItemAuditSignals(item);
    if (itemSignals.length > 0) {
      audit.append(this.createSignalList(itemSignals, "localization-review-item-signals"));
    }

    const candidateAudit = this.createCandidateAudit(item.actions);
    if (candidateAudit) {
      audit.append(candidateAudit);
    }

    return audit.children.length > 0 ? audit : null;
  }

  createItemAuditSignals(item) {
    const signals = Array.isArray(item.signals) ? [...item.signals] : [];
    if (!signals.some((signal) => signal.key === "current-line-identity")) {
      const lineSignal = this.createLineIdentitySignal(item);
      if (lineSignal) {
        signals.push(lineSignal);
      }
    }

    return signals;
  }

  createLineIdentitySignal(item) {
    const parts = [];
    if (item.lineId) {
      parts.push(`line ${item.lineId}`);
    }
    if (item.lineIdentityStatus) {
      parts.push(item.lineIdentityStatus);
    }
    if (item.lineFingerprint) {
      parts.push(`fp ${String(item.lineFingerprint).slice(0, 12)}`);
    }

    if (parts.length === 0) {
      return null;
    }

    return {
      key: "current-line-identity",
      severity: "info",
      value: parts.join(" "),
    };
  }

  createCandidateAudit(actions) {
    const candidateActions = Array.isArray(actions)
      ? actions.filter((action) => action.actionKey === "open-candidate")
      : [];
    const candidateGroups = candidateActions
      .map((action) => ({
        action,
        signals: this.filterCandidateAuditSignals(action.signals),
      }))
      .filter((group) => group.signals.length > 0);

    if (candidateGroups.length === 0) {
      return null;
    }

    const audit = document.createElement("div");
    audit.className = "localization-review-candidate-audit";
    for (const group of candidateGroups) {
      const groupElement = document.createElement("div");
      groupElement.className = "localization-review-candidate-group";
      const label = document.createElement("span");
      label.className = "localization-review-candidate-label";
      label.textContent = `Candidate ${Number(group.action.actionIndex || 0) + 1}`;
      groupElement.append(label, this.createSignalList(group.signals, "localization-review-candidate-signals"));
      audit.append(groupElement);
    }

    return audit;
  }

  filterCandidateAuditSignals(signals) {
    if (!Array.isArray(signals)) {
      return [];
    }

    return signals.filter((signal) => {
      if (!signal?.key || !signal?.value) {
        return false;
      }

      if (signal.severity && signal.severity !== "info") {
        return true;
      }

      if (signal.key === "similarity") {
        return signal.value !== "1.000";
      }

      if (signal.key === "rank-penalty") {
        return signal.value !== "0";
      }

      return signal.key === "reason";
    });
  }

  createSignalList(signals, className) {
    const list = document.createElement("div");
    list.className = `localization-review-signals ${className}`;
    for (const signal of signals) {
      list.append(this.createSignalChip(signal));
    }

    return list;
  }

  createSignalChip(signal) {
    const severity = this.normalizeSignalSeverity(signal.severity);
    const chip = document.createElement("span");
    chip.className = `localization-review-signal localization-review-signal-${severity}`;
    chip.dataset.signalKey = signal.key || "";
    chip.dataset.signalSeverity = severity;
    const label = this.createSignalLabel(signal.key);
    const value = this.createSignalDisplayValue(signal);
    chip.textContent = `${label} ${value}`;
    chip.title = `${label}: ${value}`;
    return chip;
  }

  createSignalDisplayValue(signal) {
    const value = String(signal.value || "");
    if ((signal.key === "current-line-identity" || signal.key === "candidate-line-identity") && value.startsWith("line ")) {
      return value.slice(5);
    }

    return value;
  }

  createSignalLabel(key) {
    switch (key) {
      case "review-status":
        return "Review";
      case "candidate-count":
        return "Candidates";
      case "current-line-identity":
        return "Current";
      case "candidate-line-identity":
        return "Candidate";
      case "similarity":
        return "Match";
      case "rank-penalty":
        return "Rank";
      case "reason":
        return "Reason";
      default:
        return key;
    }
  }

  normalizeSignalSeverity(severity) {
    return ["risk", "warning", "info"].includes(severity) ? severity : "info";
  }

  createReviewActionTitle(action, fallback) {
    return [this.createSignalSummary(action.signals), action.actionStatus, action.detail, action.summary]
      .filter((value) => String(value || "").trim())
      .join(" | ") || fallback;
  }

  createSignalSummary(signals) {
    if (!Array.isArray(signals) || signals.length === 0) {
      return "";
    }

    return signals
      .map((signal) => `${signal.key}: ${signal.value}`)
      .join(" | ");
  }

  getReviewActionClass(action) {
    switch (action.actionKey) {
      case "open-current":
        return "current";
      case "open-candidate":
        return "candidate";
      case "show-candidate-diff":
        return "diff";
      default:
        return "generic";
    }
  }

  createReviewActionLabel(action) {
    if (action.title) {
      return action.title;
    }

    if (action.actionKey === "open-current") {
      return "Current";
    }

    if (action.actionKey === "open-candidate") {
      return `Candidate ${Number(action.actionIndex || 0) + 1}`;
    }

    if (action.actionKey === "show-candidate-diff") {
      return `Diff ${Number(action.actionIndex || 0) + 1}`;
    }

    return "Review";
  }

  createStatusPill(item) {
    const pill = document.createElement("span");
    const status = this.getRowStatus(item);
    pill.className = `status-pill status-pill-${status}`;
    pill.textContent = status;
    return pill;
  }

  createTranslationInput(item, rowElement) {
    const input = document.createElement("input");
    input.className = "localization-translation-input";
    input.placeholder = "Translation draft";
    input.type = "text";
    input.value = this.draftStore.hasDraft(item)
      ? this.draftStore.getTranslation(item)
      : (item.translation || "");

    input.addEventListener("input", () => {
      this.onTranslationInput(item, input.value.trim(), rowElement);
    });

    input.addEventListener("focus", () => this.onSourceLineSelected(item.sourceLine));
    return input;
  }

  updateRowStatusCell(rowElement, item) {
    const statusCell = rowElement?.children?.[0] || null;
    if (statusCell) {
      statusCell.replaceChildren(this.createStatusPill(item));
    }

    if (rowElement) {
      this.updateRowStatusState(rowElement, item);
    }
  }

  updateRowStatusState(rowElement, item) {
    const status = this.getRowStatus(item);
    rowElement.dataset.rowKey = this.getRowKey(item);
    rowElement.dataset.status = status;
  }
}

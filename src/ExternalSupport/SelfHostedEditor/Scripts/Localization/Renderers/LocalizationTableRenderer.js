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

  createReviewActionTitle(action, fallback) {
    return [action.actionStatus, action.detail, action.summary]
      .filter((value) => String(value || "").trim())
      .join(" | ") || fallback;
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

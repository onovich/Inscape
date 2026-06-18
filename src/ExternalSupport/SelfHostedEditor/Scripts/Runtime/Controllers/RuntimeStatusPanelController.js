export class RuntimeStatusPanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.lastStatusModel = null;
  }

  render(statusModel) {
    this.lastStatusModel = statusModel || null;
    if (!this.panelElement) {
      return this.lastStatusModel;
    }

    this.panelElement.replaceChildren(this.createPanel(this.lastStatusModel));
    this.panelElement.dataset.runtimeStatusState = this.lastStatusModel?.state || "runtime-unavailable";
    return this.lastStatusModel;
  }

  getStatusModel() {
    return this.lastStatusModel;
  }

  createPanel(statusModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-status-shell workspace-runtime-panel";
    shell.append(
      this.createHeader(statusModel),
      this.createStatusGrid(statusModel)
    );
    return shell;
  }

  createHeader(statusModel) {
    const header = document.createElement("div");
    header.className = "workspace-session-item";

    const title = document.createElement("span");
    title.className = "workspace-session-key";
    title.textContent = "Runtime";

    const status = document.createElement("span");
    status.className = "workspace-session-value";
    status.dataset.state = statusModel?.state || "runtime-unavailable";
    status.textContent = this.getRuntimeStateLabel(statusModel?.state);

    header.append(title, status);
    return header;
  }

  createStatusGrid(statusModel) {
    const grid = document.createElement("div");
    grid.className = "runtime-status-grid workspace-runtime-panel";
    grid.append(
      this.createStateItem("Provider", statusModel?.provider || "unavailable"),
      this.createStateItem("Node", statusModel?.currentNodeName || "none"),
      this.createStateItem("Choices", String(statusModel?.visibleChoiceCount ?? 0)),
      this.createStateItem("Steps", this.formatStepLabel(statusModel)),
      this.createStateItem("Query", this.formatQueryProvider(statusModel?.queryProvider)),
      this.createStateItem("Pending", this.formatPendingAction(statusModel?.pendingAction)),
      this.createStateItem("Error", this.formatRuntimeError(statusModel?.runtimeError))
    );
    return grid;
  }

  createStateItem(label, value) {
    const item = document.createElement("div");
    item.className = "workspace-session-item";

    const key = document.createElement("span");
    key.className = "workspace-session-key";
    key.textContent = label;

    const content = document.createElement("span");
    content.className = "workspace-session-value";
    content.textContent = value;

    item.append(key, content);
    return item;
  }

  formatStepLabel(statusModel) {
    const progress = statusModel?.readingProgress || {};
    const visibleStepCount = progress.visibleStepCount ?? 0;
    const contentStepCount = progress.contentStepCount ?? 0;
    return `${visibleStepCount}/${contentStepCount}`;
  }

  formatQueryProvider(queryProvider) {
    if (!queryProvider) {
      return "unavailable";
    }

    if (queryProvider.source === "mock" && queryProvider.mockValueCount > 0) {
      return `${queryProvider.label} (${queryProvider.mockValueCount})`;
    }

    if (queryProvider.source === "recorded" && queryProvider.recordedValueCount > 0) {
      return `${queryProvider.label} (${queryProvider.recordedValueCount})`;
    }

    return queryProvider.label || queryProvider.source || "unavailable";
  }

  formatPendingAction(pendingAction) {
    if (!pendingAction?.available) {
      return "none";
    }

    return [
      pendingAction.name || "pending",
      pendingAction.mode,
      pendingAction.status,
    ].filter(Boolean).join(" ");
  }

  formatRuntimeError(runtimeError) {
    if (!runtimeError?.hasError) {
      return "none";
    }

    return runtimeError.code || "runtime-error";
  }

  getRuntimeStateLabel(state) {
    if (state === "runtime-ready") {
      return "ready";
    }

    if (state === "runtime-error") {
      return "error";
    }

    if (state === "runtime-stale") {
      return "stale";
    }

    return "unavailable";
  }
}

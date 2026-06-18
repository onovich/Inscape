export class RuntimeLogBacklogPanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.lastBacklogModel = null;
    this.sourceLineHandlers = [];
  }

  onSourceLineSelected(handler) {
    this.sourceLineHandlers.push(handler);
  }

  render(backlogModel) {
    this.lastBacklogModel = backlogModel || null;
    if (!this.panelElement) {
      return this.lastBacklogModel;
    }

    this.panelElement.replaceChildren(this.createPanel(this.lastBacklogModel));
    this.panelElement.dataset.runtimeLogState = this.lastBacklogModel?.state || "runtime-unavailable";
    return this.lastBacklogModel;
  }

  getBacklogModel() {
    return this.lastBacklogModel;
  }

  createPanel(backlogModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-log-backlog-shell";
    shell.append(
      this.createHeader(backlogModel),
      this.createStatus(backlogModel),
      this.createEntries(backlogModel)
    );
    return shell;
  }

  createHeader(backlogModel) {
    const header = document.createElement("div");
    header.className = "runtime-log-backlog-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "runtime-log-backlog-title";

    const title = document.createElement("h2");
    title.textContent = "Runtime Log";

    const status = document.createElement("span");
    status.className = "runtime-log-backlog-runtime-status";
    status.dataset.runtimeState = backlogModel?.state || "runtime-unavailable";
    status.textContent = this.getRuntimeStateLabel(backlogModel?.state);

    titleGroup.append(title, status);

    const count = document.createElement("span");
    count.className = "runtime-log-backlog-count";
    count.textContent = `Entries ${backlogModel?.entryCount ?? 0}`;

    header.append(titleGroup, count);
    return header;
  }

  createStatus(backlogModel) {
    const status = document.createElement("p");
    status.className = "runtime-log-backlog-status";
    status.dataset.statusState = backlogModel?.state || "runtime-unavailable";
    status.textContent = this.getStatusText(backlogModel);
    return status;
  }

  createEntries(backlogModel) {
    const list = document.createElement("div");
    list.className = "runtime-log-backlog-list";

    if (!Array.isArray(backlogModel?.entries) || backlogModel.entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-log-backlog-empty";
      empty.textContent = this.getEmptyText(backlogModel);
      list.append(empty);
      return list;
    }

    for (const entry of backlogModel.entries) {
      list.append(this.createEntry(entry));
    }

    return list;
  }

  createEntry(entry) {
    const item = document.createElement("article");
    item.className = "runtime-log-backlog-entry";
    item.dataset.sourceAvailable = String(Boolean(entry.hasSource));

    const summary = document.createElement("div");
    summary.className = "runtime-log-backlog-entry-summary";

    const meta = document.createElement("span");
    meta.className = "runtime-log-backlog-entry-meta";
    meta.textContent = [
      entry.sequence > 0 ? `#${entry.sequence}` : "",
      entry.nodeId,
      entry.lineId,
    ].filter(Boolean).join(" | ");

    const sourceButton = document.createElement("button");
    sourceButton.type = "button";
    sourceButton.className = "runtime-log-backlog-source-button";
    sourceButton.disabled = !entry.hasSource;
    sourceButton.textContent = "Source";
    sourceButton.addEventListener("click", () => {
      this.selectSourceLine(entry);
    });

    summary.append(meta, sourceButton);

    const body = document.createElement("p");
    body.className = "runtime-log-backlog-entry-text";
    body.textContent = entry.speaker
      ? `${entry.speaker}: ${entry.text}`
      : entry.text;

    item.append(summary, body);
    return item;
  }

  selectSourceLine(entry) {
    if (!entry?.hasSource || entry.source?.lineNumber <= 0) {
      return;
    }

    const selection = {
      lineNumber: entry.source.lineNumber,
      sourcePath: entry.source.sourcePath || "",
    };
    for (const handler of this.sourceLineHandlers) {
      handler(selection);
    }
  }

  getStatusText(backlogModel) {
    if (backlogModel?.state === "runtime-ready") {
      return "Runtime log entries from the latest snapshot.";
    }

    if (backlogModel?.state === "runtime-empty") {
      return "No Runtime log entries in the latest snapshot.";
    }

    if (backlogModel?.state === "runtime-error") {
      return "Runtime error. Backlog waits for the next valid Runtime snapshot.";
    }

    return "Runtime unavailable. Backlog appears when Runtime returns logEntries.";
  }

  getEmptyText(backlogModel) {
    if (backlogModel?.state === "runtime-error") {
      return "Runtime log unavailable.";
    }

    if (backlogModel?.state === "runtime-unavailable") {
      return "Runtime is unavailable.";
    }

    return "No Runtime log entries yet.";
  }

  getRuntimeStateLabel(state) {
    if (state === "runtime-ready") {
      return "Runtime ready";
    }

    if (state === "runtime-empty") {
      return "Empty";
    }

    if (state === "runtime-error") {
      return "Runtime error";
    }

    return "Runtime unavailable";
  }
}

export class RuntimeBranchEvidencePanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.lastEvidenceModel = null;
    this.sourceLineHandlers = [];
  }

  onSourceLineSelected(handler) {
    this.sourceLineHandlers.push(handler);
  }

  render(evidenceModel) {
    this.lastEvidenceModel = evidenceModel || null;
    if (!this.panelElement) {
      return this.lastEvidenceModel;
    }

    this.panelElement.replaceChildren(this.createPanel(this.lastEvidenceModel));
    this.panelElement.dataset.runtimeBranchState = this.lastEvidenceModel?.state || "runtime-unavailable";
    return this.lastEvidenceModel;
  }

  getEvidenceModel() {
    return this.lastEvidenceModel;
  }

  createPanel(evidenceModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-branch-evidence-shell";
    shell.append(
      this.createHeader(evidenceModel),
      this.createStatus(evidenceModel),
      this.createEntries(evidenceModel)
    );
    return shell;
  }

  createHeader(evidenceModel) {
    const header = document.createElement("div");
    header.className = "runtime-branch-evidence-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "runtime-branch-evidence-title";

    const title = document.createElement("h2");
    title.textContent = "Branch Receipts";

    const status = document.createElement("span");
    status.className = "runtime-branch-evidence-runtime-status";
    status.dataset.runtimeState = evidenceModel?.state || "runtime-unavailable";
    status.textContent = this.getRuntimeStateLabel(evidenceModel?.state);

    titleGroup.append(title, status);

    const count = document.createElement("span");
    count.className = "runtime-branch-evidence-count";
    count.textContent = `Entries ${evidenceModel?.entryCount ?? 0}`;

    header.append(titleGroup, count);
    return header;
  }

  createStatus(evidenceModel) {
    const status = document.createElement("p");
    status.className = "runtime-branch-evidence-status";
    status.dataset.statusState = evidenceModel?.state || "runtime-unavailable";
    status.textContent = this.getStatusText(evidenceModel);
    return status;
  }

  createEntries(evidenceModel) {
    const list = document.createElement("div");
    list.className = "runtime-branch-evidence-list";

    if (!Array.isArray(evidenceModel?.entries) || evidenceModel.entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-branch-evidence-empty";
      empty.textContent = this.getEmptyText(evidenceModel);
      list.append(empty);
      return list;
    }

    for (const entry of evidenceModel.entries) {
      list.append(this.createEntry(entry));
    }

    return list;
  }

  createEntry(entry) {
    const item = document.createElement("article");
    item.className = "runtime-branch-evidence-entry";
    item.dataset.sourceAvailable = String(Boolean(entry.hasSource));
    item.dataset.context = entry.context || "";

    const summary = document.createElement("div");
    summary.className = "runtime-branch-evidence-entry-summary";

    const nameGroup = document.createElement("div");
    nameGroup.className = "runtime-branch-evidence-entry-name";

    const name = document.createElement("strong");
    name.textContent = entry.queryName || "Unnamed query";

    const context = document.createElement("span");
    context.textContent = entry.contextLabel;

    nameGroup.append(name, context);

    const sourceButton = document.createElement("button");
    sourceButton.type = "button";
    sourceButton.className = "runtime-branch-evidence-source-button";
    sourceButton.disabled = !entry.hasSource;
    sourceButton.textContent = "Source";
    sourceButton.addEventListener("click", () => {
      this.selectSourceLine(entry);
    });

    summary.append(nameGroup, sourceButton);

    const explanation = document.createElement("p");
    explanation.className = "runtime-branch-evidence-entry-explanation";
    explanation.textContent = entry.explanation;

    const meta = document.createElement("p");
    meta.className = "runtime-branch-evidence-entry-meta";
    meta.textContent = [
      `result ${formatValue(entry.resultLabel)}`,
      `source ${entry.sourceKind}`,
      entry.deterministic ? "deterministic" : "non-deterministic",
    ].join(" | ");

    const details = document.createElement("p");
    details.className = "runtime-branch-evidence-entry-details";
    details.textContent = [
      entry.nodeId ? `node ${entry.nodeId}` : "",
      entry.branchPath,
      formatChoiceContext(entry),
      entry.argumentLabels.length > 0 ? `args ${entry.argumentLabels.map(formatValue).join(", ")}` : "args none",
    ].filter(Boolean).join(" | ");

    item.append(summary, explanation, meta, details);
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

  getStatusText(evidenceModel) {
    if (evidenceModel?.state === "runtime-ready") {
      return "Runtime branch evidence from the latest snapshot.";
    }

    if (evidenceModel?.state === "runtime-empty") {
      return "No branch evidence in the latest Runtime snapshot.";
    }

    if (evidenceModel?.state === "runtime-error") {
      return "Runtime error. Branch evidence waits for the next valid snapshot.";
    }

    return "Runtime unavailable. Branch evidence appears when Runtime returns condition data.";
  }

  getEmptyText(evidenceModel) {
    if (evidenceModel?.state === "runtime-error") {
      return "Runtime branch evidence unavailable.";
    }

    if (evidenceModel?.state === "runtime-unavailable") {
      return "Runtime is unavailable.";
    }

    return "No branch evidence yet.";
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

function formatChoiceContext(entry) {
  if (entry.choiceOptionIndex >= 0) {
    return `choice ${entry.choiceGroupIndex}:${entry.choiceOptionIndex}`;
  }

  if (entry.conditionalJumpIndex >= 0) {
    return `jump ${entry.conditionalJumpIndex}`;
  }

  return "";
}

function formatValue(value) {
  if (!value || typeof value !== "object") {
    return "unknown";
  }

  return value.kind ? `${value.kind}:${value.value}` : String(value.value || "");
}

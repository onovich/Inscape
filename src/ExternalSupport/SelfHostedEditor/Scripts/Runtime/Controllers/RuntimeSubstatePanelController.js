export class RuntimeSubstatePanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.exportHandlers = [];
    this.importHandlers = [];
    this.validateHandlers = [];
    this.lastAuthoringModel = null;
    this.lastOperation = null;
    this.substateText = "";
  }

  onExportRequested(handler) {
    this.exportHandlers.push(handler);
  }

  onValidateRequested(handler) {
    this.validateHandlers.push(handler);
  }

  onImportRequested(handler) {
    this.importHandlers.push(handler);
  }

  render(authoringModel) {
    this.lastAuthoringModel = authoringModel || null;
    if (!this.panelElement) {
      return this.lastAuthoringModel;
    }

    this.panelElement.replaceChildren(this.createPanel(this.lastAuthoringModel));
    this.panelElement.dataset.runtimeSubstateState = this.getPanelState();
    return this.lastAuthoringModel;
  }

  getAuthoringModel() {
    return this.lastAuthoringModel;
  }

  getLastOperation() {
    return this.lastOperation;
  }

  getSubstateText() {
    return this.substateText;
  }

  createPanel(authoringModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-substate-shell";
    shell.append(
      this.createHeader(authoringModel),
      this.createToolbar(authoringModel),
      this.createArtifactSummary(authoringModel),
      this.createEditor(authoringModel)
    );
    return shell;
  }

  createHeader(authoringModel) {
    const header = document.createElement("div");
    header.className = "runtime-substate-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "runtime-substate-title";

    const title = document.createElement("h2");
    title.textContent = "Runtime Substate";

    const status = document.createElement("span");
    status.className = "runtime-substate-runtime-status";
    status.dataset.runtimeState = authoringModel?.runtime?.state || "runtime-unavailable";
    status.textContent = getRuntimeStateLabel(authoringModel?.runtime?.state);

    titleGroup.append(title, status);

    const validation = document.createElement("span");
    validation.className = "runtime-substate-validation";
    validation.dataset.validationStatus = this.getValidationStatus(authoringModel);
    validation.textContent = getValidationLabel(this.getValidationStatus(authoringModel));

    header.append(titleGroup, validation);
    return header;
  }

  createToolbar(authoringModel) {
    const toolbar = document.createElement("div");
    toolbar.className = "runtime-substate-toolbar";

    const status = document.createElement("p");
    status.className = "runtime-substate-status";
    status.dataset.statusState = this.getValidationStatus(authoringModel);
    status.textContent = this.getStatusText(authoringModel);

    const actions = document.createElement("div");
    actions.className = "runtime-substate-actions";
    actions.append(
      this.createButton("Export", !authoringModel?.canExport, () => this.substateExport()),
      this.createButton("Validate", !this.substateText.trim(), () => this.substateValidate()),
      this.createButton("Import", !this.canImport(authoringModel), () => this.substateImport())
    );

    toolbar.append(status, actions);
    return toolbar;
  }

  createButton(label, disabled, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "runtime-substate-button";
    button.disabled = Boolean(disabled);
    button.textContent = label;
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      void handler();
    });
    return button;
  }

  createArtifactSummary(authoringModel) {
    const summary = document.createElement("div");
    summary.className = "runtime-substate-summary";
    const artifact = this.getArtifactSummary(authoringModel);
    const rows = [
      ["Format", artifact.format || "None"],
      ["Format Version", artifact.formatVersion ? String(artifact.formatVersion) : "0"],
      ["Runtime Version", artifact.runtimeVersion || "None"],
      ["Script Version", artifact.scriptVersion || "None"],
      ["Node", artifact.currentNodeId || authoringModel?.runtime?.currentNodeId || "None"],
      ["Command", String(artifact.commandIndex ?? authoringModel?.runtime?.commandIndex ?? 0)],
      ["Flow Depth", String(artifact.flowStackDepth ?? authoringModel?.runtime?.flowStackDepth ?? 0)],
      ["Branch Receipts", String(artifact.branchReceiptCount ?? authoringModel?.runtime?.branchReceiptCount ?? 0)],
      ["Host Checkpoint", artifact.hostCheckpointPresent ? "Present" : "None"],
      ["Pending", formatPendingAction(artifact.pendingAction || authoringModel?.runtime?.pendingAction)],
    ];

    for (const [label, value] of rows) {
      const item = document.createElement("p");
      item.className = "runtime-substate-summary-item";
      item.textContent = `${label}: ${value}`;
      summary.append(item);
    }

    return summary;
  }

  createEditor(authoringModel) {
    const section = document.createElement("section");
    section.className = "runtime-substate-editor";

    const label = document.createElement("label");
    label.className = "runtime-substate-editor-label";
    label.textContent = "Artifact JSON";

    const textarea = document.createElement("textarea");
    textarea.className = "runtime-substate-textarea";
    textarea.value = this.substateText;
    textarea.placeholder = "Export or paste an inscape.runtime-substate JSON artifact.";
    textarea.spellcheck = false;
    textarea.addEventListener("input", (event) => {
      this.substateText = String(event?.target?.value || textarea.value || "");
      this.lastOperation = null;
      this.render(authoringModel);
    });

    const safety = document.createElement("p");
    safety.className = "runtime-substate-safety";
    safety.textContent = "Preview-only Runtime substate. Not a full host save.";

    section.append(label, textarea, safety);
    return section;
  }

  async substateExport() {
    let result = null;
    for (const handler of this.exportHandlers) {
      result = await handler();
    }

    this.lastOperation = result || null;
    if (result?.substateText) {
      this.substateText = result.substateText;
    } else if (result?.substate) {
      this.substateText = JSON.stringify(result.substate, null, 2);
    }

    this.render(this.lastAuthoringModel);
  }

  async substateValidate() {
    let result = null;
    for (const handler of this.validateHandlers) {
      result = await handler(this.substateText);
    }

    this.lastOperation = result || null;
    this.render(this.lastAuthoringModel);
  }

  async substateImport() {
    if (!this.canImport(this.lastAuthoringModel)) {
      return;
    }

    let result = null;
    for (const handler of this.importHandlers) {
      result = await handler(this.substateText);
    }

    this.lastOperation = result || null;
    this.render(this.lastAuthoringModel);
  }

  getArtifactSummary(authoringModel) {
    return this.lastOperation?.substateSummary || authoringModel?.artifact || {};
  }

  getValidationStatus(authoringModel) {
    return this.lastOperation?.validationStatus || authoringModel?.validation?.status || "unknown";
  }

  canImport(authoringModel) {
    return this.getValidationStatus(authoringModel) === "compatible";
  }

  getPanelState() {
    const status = this.getValidationStatus(this.lastAuthoringModel);
    if (status === "compatible") {
      return "import-ready";
    }

    if (status === "error" || status === "unavailable") {
      return "error";
    }

    return this.lastAuthoringModel?.runtime?.state || "runtime-unavailable";
  }

  getStatusText(authoringModel) {
    const status = this.getValidationStatus(authoringModel);
    if (status === "compatible") {
      return this.lastOperation?.imported ? "Compatible substate imported into Runtime preview." : "Compatible substate can be imported into Runtime preview.";
    }

    if (status === "migratable") {
      return "Substate is migratable and requires an explicit migration step before import.";
    }

    if (status === "incompatible") {
      return "Substate is incompatible with the current script and cannot be imported.";
    }

    if (status === "error") {
      return this.lastOperation?.error || "Substate validation failed before Runtime could import it.";
    }

    if (status === "unavailable") {
      return this.lastOperation?.error || "Runtime substate backend is unavailable.";
    }

    return authoringModel?.runtime?.ready
      ? "Export current preview state or paste a substate JSON artifact to validate."
      : "Runtime preview is unavailable. Substate export waits for a Runtime snapshot.";
  }
}

function getRuntimeStateLabel(state) {
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

function getValidationLabel(status) {
  if (status === "compatible") {
    return "Compatible";
  }

  if (status === "migratable") {
    return "Migratable";
  }

  if (status === "incompatible") {
    return "Incompatible";
  }

  if (status === "error") {
    return "Error";
  }

  if (status === "unavailable") {
    return "Unavailable";
  }

  return "Not validated";
}

function formatPendingAction(pendingAction) {
  if (!pendingAction) {
    return "None";
  }

  return [
    pendingAction.name || "pending",
    pendingAction.mode || "",
    pendingAction.status || "",
    `${pendingAction.argumentCount || 0} args`,
  ].filter(Boolean).join(" | ");
}

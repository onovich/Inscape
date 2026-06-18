import { RuntimeMockQueryModelBuilder } from "../Models/RuntimeMockQueryModelBuilder.js";

export class RuntimeMockQueryPanelController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.applyRuntimeHandlers = [];
    this.resetRuntimeHandlers = [];
    this.hostSchemaCatalog = null;
    this.mockEntries = [];
    this.lastAuthoringModel = RuntimeMockQueryModelBuilder.build();
    this.runtimeStatus = {
      label: "Runtime unavailable",
      provider: "unavailable",
      state: "unavailable",
    };
    this.applyStatus = {
      detail: "Mock values are session-only.",
      state: "idle",
    };
  }

  onApplyRuntimeRequested(handler) {
    this.applyRuntimeHandlers.push(handler);
  }

  onResetRuntimeRequested(handler) {
    this.resetRuntimeHandlers.push(handler);
  }

  render(hostSchemaCatalog, options = {}) {
    if (!this.panelElement) {
      return RuntimeMockQueryModelBuilder.build({
        hostSchemaCatalog,
        mockEntries: this.mockEntries,
        sessionId: options.sessionId || "",
        workspaceRevision: options.workspaceRevision ?? null,
      });
    }

    this.hostSchemaCatalog = hostSchemaCatalog || null;
    if (Object.prototype.hasOwnProperty.call(options, "runtimeSnapshot")) {
      this.runtimeStatus = this.buildRuntimeStatus(options.runtimeSnapshot || null);
    }
    this.lastAuthoringModel = this.buildAuthoringModel(options);
    this.panelElement.replaceChildren(this.createPanel(this.lastAuthoringModel));
    this.panelElement.dataset.mockQueryState = this.lastAuthoringModel.hostSchema.loaded
      ? this.runtimeStatus.state
      : "schema-unavailable";
    return this.lastAuthoringModel;
  }

  getAuthoringModel() {
    return this.lastAuthoringModel;
  }

  setMockEntries(mockEntries) {
    this.mockEntries = normalizeMockEntries(mockEntries);
    this.render(this.hostSchemaCatalog);
  }

  resetMockEntries() {
    this.mockEntries = [];
    this.applyStatus = {
      detail: "Mock values reset for this session.",
      state: "reset",
    };
    this.render(this.hostSchemaCatalog);
  }

  buildAuthoringModel(options = {}) {
    return RuntimeMockQueryModelBuilder.build({
      hostSchemaCatalog: this.hostSchemaCatalog,
      mockEntries: this.mockEntries,
      sessionId: options.sessionId || "",
      workspaceRevision: options.workspaceRevision ?? null,
    });
  }

  createPanel(authoringModel) {
    const shell = document.createElement("section");
    shell.className = "runtime-mock-query-shell";
    shell.append(
      this.createHeader(authoringModel),
      this.createToolbar(authoringModel),
      this.createRows(authoringModel),
      this.createUnknownRows(authoringModel),
      this.createDiagnostics(authoringModel)
    );
    return shell;
  }

  createHeader(authoringModel) {
    const header = document.createElement("div");
    header.className = "runtime-mock-query-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "runtime-mock-query-title";

    const title = document.createElement("h2");
    title.textContent = "Mock Queries";

    const status = document.createElement("span");
    status.className = "runtime-mock-query-runtime-status";
    status.dataset.runtimeState = this.runtimeStatus.state;
    status.textContent = this.runtimeStatus.label;

    titleGroup.append(title, status);

    const counts = document.createElement("div");
    counts.className = "runtime-mock-query-counts";
    counts.append(
      this.createCountPill("Ready", authoringModel.readyCount, "ready"),
      this.createCountPill("Missing", authoringModel.missingCount, "missing"),
      this.createCountPill("Invalid", authoringModel.invalidCount, "invalid"),
      this.createCountPill("Unknown", authoringModel.unknownCount, "unknown")
    );

    header.append(titleGroup, counts);
    return header;
  }

  createCountPill(label, value, state) {
    const pill = document.createElement("span");
    pill.className = "runtime-mock-query-count";
    pill.dataset.state = state;
    pill.textContent = `${label} ${value}`;
    return pill;
  }

  createToolbar(authoringModel) {
    const toolbar = document.createElement("div");
    toolbar.className = "runtime-mock-query-toolbar";

    const detail = document.createElement("p");
    detail.className = "runtime-mock-query-status";
    detail.dataset.statusState = this.applyStatus.state;
    detail.textContent = this.getToolbarStatusText(authoringModel);

    const actions = document.createElement("div");
    actions.className = "runtime-mock-query-actions";

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "runtime-mock-query-button";
    resetButton.textContent = "Reset";
    resetButton.disabled = this.mockEntries.length === 0;
    resetButton.addEventListener("click", () => {
      void this.resetAndNotify();
    });

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = "runtime-mock-query-button is-primary";
    applyButton.textContent = "Apply";
    applyButton.disabled = !authoringModel.hostSchema.loaded || this.runtimeStatus.state !== "runtime-ready";
    applyButton.addEventListener("click", () => {
      void this.applyToRuntime(authoringModel);
    });

    actions.append(resetButton, applyButton);
    toolbar.append(detail, actions);
    return toolbar;
  }

  getToolbarStatusText(authoringModel) {
    if (!authoringModel.hostSchema.loaded) {
      return "Host Schema unavailable. Mock rows will appear when queries are loaded.";
    }

    if (this.runtimeStatus.state !== "runtime-ready") {
      return "Runtime unavailable. Mock values stay as session test input until Runtime preview is available.";
    }

    if (this.applyStatus.state === "applied") {
      return this.applyStatus.detail;
    }

    if (this.applyStatus.state === "error") {
      return this.applyStatus.detail;
    }

    return `${authoringModel.runtimeQueryProvider.mockValues.length} ready mock value(s) will be sent to Runtime preview.`;
  }

  createRows(authoringModel) {
    const list = document.createElement("div");
    list.className = "runtime-mock-query-list";

    if (authoringModel.rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "runtime-mock-query-empty";
      empty.textContent = "No Host Schema queries found.";
      list.append(empty);
      return list;
    }

    for (const row of authoringModel.rows) {
      list.append(this.createRow(row));
    }

    return list;
  }

  createRow(row) {
    const rowElement = document.createElement("article");
    rowElement.className = "runtime-mock-query-row";
    rowElement.dataset.rowState = row.state;

    const summary = document.createElement("div");
    summary.className = "runtime-mock-query-row-summary";

    const nameGroup = document.createElement("div");
    nameGroup.className = "runtime-mock-query-row-name";

    const name = document.createElement("strong");
    name.textContent = row.name;

    const type = document.createElement("span");
    type.textContent = `${row.valueKind} / ${row.returnType || "unspecified"}`;

    nameGroup.append(name, type);

    const state = document.createElement("span");
    state.className = "runtime-mock-query-row-state";
    state.textContent = formatStateLabel(row.state);

    summary.append(nameGroup, state);
    rowElement.append(summary);

    if (row.arguments.length > 0) {
      const argumentsElement = document.createElement("div");
      argumentsElement.className = "runtime-mock-query-arguments";
      for (const argument of row.arguments) {
        argumentsElement.append(this.createArgumentInput(row, argument));
      }
      rowElement.append(argumentsElement);
    }

    rowElement.append(this.createValueInput(row));

    if (row.diagnostics.length > 0) {
      const diagnostics = document.createElement("div");
      diagnostics.className = "runtime-mock-query-row-diagnostics";
      for (const diagnostic of row.diagnostics) {
        const item = document.createElement("span");
        item.textContent = diagnostic.code;
        diagnostics.append(item);
      }
      rowElement.append(diagnostics);
    }

    return rowElement;
  }

  createArgumentInput(row, argument) {
    const label = document.createElement("label");
    label.className = "runtime-mock-query-field";

    const caption = document.createElement("span");
    caption.textContent = `${argument.name} (${argument.valueKind})`;

    const input = this.createInputForValueKind(argument.valueKind, argument.valueLabel);
    input.dataset.queryName = row.name;
    input.dataset.argumentIndex = String(argument.index);
    input.addEventListener("change", () => {
      this.updateMockArgument(row.name, argument.index, readInputValue(input, argument.valueKind));
    });

    label.append(caption, input);
    return label;
  }

  createValueInput(row) {
    const label = document.createElement("label");
    label.className = "runtime-mock-query-field is-value";

    const caption = document.createElement("span");
    caption.textContent = `Value (${row.valueKind})`;

    const input = this.createInputForValueKind(row.valueKind, row.valueLabel);
    input.dataset.queryName = row.name;
    input.addEventListener("change", () => {
      this.updateMockValue(row.name, readInputValue(input, row.valueKind));
    });

    label.append(caption, input);
    return label;
  }

  createInputForValueKind(valueKind, valueLabel) {
    if (valueKind === "Bool") {
      const select = document.createElement("select");
      select.append(
        this.createOption("", "Unset"),
        this.createOption("true", "true"),
        this.createOption("false", "false")
      );
      select.value = normalizeBoolSelectValue(valueLabel);
      return select;
    }

    const input = document.createElement("input");
    input.type = valueKind === "Number" ? "number" : "text";
    input.value = valueLabel || "";
    input.disabled = valueKind === "Unsupported";
    if (valueKind === "Unsupported") {
      input.placeholder = "Unsupported";
    }
    return input;
  }

  createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  createUnknownRows(authoringModel) {
    const section = document.createElement("section");
    section.className = "runtime-mock-query-unknowns";

    if (authoringModel.unknownQueries.length === 0) {
      return section;
    }

    const title = document.createElement("h3");
    title.textContent = "Unknown Queries";
    section.append(title);

    for (const unknownQuery of authoringModel.unknownQueries) {
      const item = document.createElement("span");
      item.textContent = unknownQuery.name;
      section.append(item);
    }

    return section;
  }

  createDiagnostics(authoringModel) {
    const diagnostics = document.createElement("div");
    diagnostics.className = "runtime-mock-query-diagnostics";
    diagnostics.dataset.diagnosticCount = String(authoringModel.diagnostics.length);
    if (authoringModel.diagnostics.length === 0) {
      diagnostics.textContent = "No mock query diagnostics.";
      return diagnostics;
    }

    diagnostics.textContent = authoringModel.diagnostics
      .map((diagnostic) => `${diagnostic.queryName}: ${diagnostic.code}`)
      .join(" | ");
    return diagnostics;
  }

  updateMockArgument(queryName, argumentIndex, value) {
    const entry = this.ensureMockEntry(queryName);
    while (entry.arguments.length <= argumentIndex) {
      entry.arguments.push(null);
    }
    entry.arguments[argumentIndex] = value;
    this.applyStatus = {
      detail: "Mock query draft changed. Apply to refresh Runtime preview.",
      state: "dirty",
    };
    this.render(this.hostSchemaCatalog);
  }

  updateMockValue(queryName, value) {
    const entry = this.ensureMockEntry(queryName);
    entry.value = value;
    this.applyStatus = {
      detail: "Mock query draft changed. Apply to refresh Runtime preview.",
      state: "dirty",
    };
    this.render(this.hostSchemaCatalog);
  }

  ensureMockEntry(queryName) {
    let entry = this.mockEntries.find((candidate) => candidate.name === queryName);
    if (!entry) {
      const row = (this.lastAuthoringModel.rows || []).find((candidate) => candidate.name === queryName);
      entry = {
        arguments: row?.arguments.map(() => null) || [],
        enabled: true,
        name: queryName,
        value: null,
      };
      this.mockEntries.push(entry);
    }

    return entry;
  }

  async resetAndNotify() {
    this.resetMockEntries();
    for (const handler of this.resetRuntimeHandlers) {
      await handler();
    }
  }

  async applyToRuntime(authoringModel) {
    try {
      let result = null;
      for (const handler of this.applyRuntimeHandlers) {
        result = await handler(authoringModel);
      }

      const runtimeProvider = result?.provider || "";
      if (runtimeProvider === "runtime-project") {
        this.applyStatus = {
          detail: `${authoringModel.runtimeQueryProvider.mockValues.length} ready mock value(s) applied to Runtime preview.`,
          state: "applied",
        };
      } else {
        this.applyStatus = {
          detail: result?.error || "Runtime preview did not accept mock query values.",
          state: "error",
        };
      }
    } catch (error) {
      this.applyStatus = {
        detail: error instanceof Error ? error.message : String(error),
        state: "error",
      };
    }

    this.render(this.hostSchemaCatalog);
  }

  buildRuntimeStatus(runtimeSnapshot) {
    if (runtimeSnapshot?.provider === "runtime-project") {
      return {
        label: "Runtime ready",
        provider: "runtime-project",
        state: "runtime-ready",
      };
    }

    return {
      label: "Runtime unavailable",
      provider: runtimeSnapshot?.provider || "unavailable",
      state: "unavailable",
    };
  }
}

function normalizeMockEntries(mockEntries) {
  if (!Array.isArray(mockEntries)) {
    return [];
  }

  return mockEntries
    .filter((entry) => entry && typeof entry.name === "string")
    .map((entry) => ({
      arguments: Array.isArray(entry.arguments) ? [...entry.arguments] : [],
      enabled: entry.enabled !== false,
      name: entry.name.trim(),
      value: entry.value,
    }))
    .filter((entry) => entry.name);
}

function normalizeBoolSelectValue(valueLabel) {
  const normalized = String(valueLabel || "").trim().toLowerCase();
  if (normalized === "true" || normalized === "false") {
    return normalized;
  }

  return "";
}

function readInputValue(input, valueKind) {
  if (valueKind === "Bool") {
    if (input.value === "true") {
      return true;
    }

    if (input.value === "false") {
      return false;
    }

    return null;
  }

  return input.value;
}

function formatStateLabel(state) {
  return String(state || "")
    .split("-")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

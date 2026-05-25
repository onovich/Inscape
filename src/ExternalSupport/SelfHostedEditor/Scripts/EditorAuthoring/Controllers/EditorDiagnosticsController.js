export class EditorDiagnosticsController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.activeLineNumber = 1;
    this.selectedSeverity = "all";
    this.sourceLineSelectedHandlers = [];
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  setActiveLine(lineNumber) {
    this.activeLineNumber = lineNumber || 1;
  }

  render(diagnosticSnapshot) {
    this.lastSnapshot = diagnosticSnapshot || {
      diagnostics: [],
      provider: "draft-fallback",
    };

    const diagnostics = diagnosticSnapshot?.diagnostics || [];
    const provider = diagnosticSnapshot?.provider || "draft-fallback";
    const filteredDiagnostics = this.filterDiagnostics(diagnostics);

    const content = [];
    content.push(this.createHeader(provider, diagnostics));

    if (filteredDiagnostics.length === 0) {
      content.push(this.createCleanState());
      this.panelElement.replaceChildren(...content);
      return;
    }

    const list = document.createElement("div");
    list.className = "diagnostics-list";
    for (const diagnostic of filteredDiagnostics) {
      list.append(this.createDiagnosticItem(diagnostic));
    }
    content.push(list);
    this.panelElement.replaceChildren(...content);
  }

  createHeader(provider, diagnostics) {
    const header = document.createElement("div");
    header.className = "diagnostics-header";

    const status = document.createElement("div");
    status.className = "diagnostics-provider-status";
    status.textContent = provider === "language-server"
      ? `Problems · LanguageServer · ${diagnostics.length}`
      : `Problems · Draft fallback · ${diagnostics.length}`;

    const filters = document.createElement("div");
    filters.className = "diagnostics-filters";
    for (const filter of this.createFilterDescriptors(diagnostics)) {
      filters.append(this.createFilterButton(filter));
    }

    header.append(status, filters);
    return header;
  }

  createCleanState() {
    const cleanState = document.createElement("button");
    cleanState.type = "button";
    cleanState.className = "diagnostic-clean-state";
    cleanState.textContent = this.selectedSeverity === "all"
      ? "No diagnostics"
      : `No ${this.selectedSeverity} diagnostics`;
    return cleanState;
  }

  createDiagnosticItem(diagnostic) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `diagnostic-item diagnostic-item-${diagnostic.severity}`;
    if (diagnostic.sourceLine === this.activeLineNumber) {
      item.classList.add("is-active");
    }
    item.addEventListener("click", () => this.notifySourceLineSelected(diagnostic.sourceLine));

    const severity = document.createElement("span");
    severity.className = "diagnostic-severity";
    severity.textContent = diagnostic.severity;

    const message = document.createElement("span");
    message.className = "diagnostic-message";
    message.textContent = diagnostic.message;

    const line = document.createElement("span");
    line.className = "diagnostic-line";
    line.textContent = `line ${diagnostic.sourceLine}`;

    item.append(severity, message, line);
    return item;
  }

  createFilterButton(filter) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "diagnostics-filter-button";
    if (filter.key === this.selectedSeverity) {
      button.classList.add("is-active");
    }

    button.textContent = `${filter.label} ${filter.count}`;
    button.addEventListener("click", () => {
      this.selectedSeverity = filter.key;
      const snapshot = this.lastSnapshot || {
        diagnostics: [],
        provider: "draft-fallback",
      };
      this.render(snapshot);
    });
    return button;
  }

  createFilterDescriptors(diagnostics) {
    return [
      {
        key: "all",
        label: "All",
        count: diagnostics.length,
      },
      {
        key: "error",
        label: "Errors",
        count: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
      },
      {
        key: "warning",
        label: "Warnings",
        count: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
      },
      {
        key: "info",
        label: "Info",
        count: diagnostics.filter((diagnostic) => diagnostic.severity === "info").length,
      },
    ];
  }

  filterDiagnostics(diagnostics) {
    if (this.selectedSeverity === "all") {
      return diagnostics;
    }

    return diagnostics.filter((diagnostic) => diagnostic.severity === this.selectedSeverity);
  }

  notifySourceLineSelected(lineNumber) {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler(lineNumber);
    }
  }
}

export class EditorStatusController {
  constructor(statusBarElement) {
    this.statusBarElement = statusBarElement;
    this.currentLineNumber = 1;
    this.diagnosticSnapshot = {
      diagnostics: [],
      provider: "draft-fallback",
    };
    this.sourceLineSelectedHandlers = [];
    this.previousButtonElement = this.statusBarElement.querySelector("[data-diagnostic-nav='previous']");
    this.nextButtonElement = this.statusBarElement.querySelector("[data-diagnostic-nav='next']");
    this.noteElement = this.statusBarElement.querySelector(".status-bar-note");

    this.previousButtonElement?.addEventListener("click", () => {
      this.navigateToDiagnostic("previous");
    });
    this.nextButtonElement?.addEventListener("click", () => {
      this.navigateToDiagnostic("next");
    });
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  setActiveLine(lineNumber) {
    this.currentLineNumber = lineNumber || 1;
    this.renderNote();
  }

  renderDiagnosticSnapshot(diagnosticSnapshot) {
    this.diagnosticSnapshot = diagnosticSnapshot || {
      diagnostics: [],
      provider: "draft-fallback",
    };
    this.renderNote();
    this.renderButtons();
  }

  navigateToDiagnostic(direction) {
    const targetDiagnostic = this.findTargetDiagnostic(direction);
    if (!targetDiagnostic) {
      return;
    }

    for (const handler of this.sourceLineSelectedHandlers) {
      handler(targetDiagnostic.sourceLine);
    }
  }

  findTargetDiagnostic(direction) {
    const diagnostics = this.diagnosticSnapshot.diagnostics || [];
    if (diagnostics.length === 0) {
      return null;
    }

    const sortedDiagnostics = diagnostics
      .slice()
      .sort((left, right) => left.sourceLine - right.sourceLine);

    if (direction === "previous") {
      for (let index = sortedDiagnostics.length - 1; index >= 0; index -= 1) {
        if (sortedDiagnostics[index].sourceLine < this.currentLineNumber) {
          return sortedDiagnostics[index];
        }
      }

      return sortedDiagnostics[sortedDiagnostics.length - 1];
    }

    for (const diagnostic of sortedDiagnostics) {
      if (diagnostic.sourceLine > this.currentLineNumber) {
        return diagnostic;
      }
    }

    return sortedDiagnostics[0];
  }

  renderButtons() {
    const hasDiagnostics = (this.diagnosticSnapshot.diagnostics || []).length > 0;
    if (this.previousButtonElement) {
      this.previousButtonElement.disabled = !hasDiagnostics;
    }

    if (this.nextButtonElement) {
      this.nextButtonElement.disabled = !hasDiagnostics;
    }
  }

  renderNote() {
    if (!this.noteElement) {
      return;
    }

    const diagnostics = this.diagnosticSnapshot.diagnostics || [];
    const providerLabel = this.diagnosticSnapshot.provider === "language-server"
      ? "live"
      : "fallback";
    const countLabel = diagnostics.length === 1
      ? "1 issue"
      : `${diagnostics.length} issues`;

    this.noteElement.textContent = `L${this.currentLineNumber} · ${providerLabel} · ${countLabel}`;
  }
}

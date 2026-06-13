export class DocumentOutlineController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.sourceLineSelectedHandlers = [];
    this.activeLineNumber = 1;
    this.referenceCountsByLine = new Map();
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  setActiveLine(lineNumber) {
    this.activeLineNumber = lineNumber;
    for (const item of this.panelElement.querySelectorAll("[data-source-line]")) {
      item.classList.toggle("is-active", Number(item.dataset.sourceLine) === lineNumber);
    }
  }

  render(symbolSnapshot, documentModel = null) {
    const symbols = symbolSnapshot?.symbols || [];
    const providerStatus = this.createProviderStatus(symbolSnapshot?.provider || "unavailable");
    this.referenceCountsByLine = new Map(
      (documentModel?.nodes || []).map((node) => [node.sourceLine, node.incomingReferenceCount || 0])
    );

    if (symbols.length === 0) {
      const empty = document.createElement("div");
      empty.className = "document-outline-empty";
      empty.textContent = "No symbols yet.";
      this.panelElement.replaceChildren(providerStatus, empty);
      return;
    }

    this.panelElement.replaceChildren(
      providerStatus,
      ...symbols.map((symbol) => this.createSymbolItem(symbol))
    );
    this.setActiveLine(this.activeLineNumber);
  }

  createSymbolItem(symbol) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "document-outline-item";
    item.dataset.sourceLine = String(symbol.sourceLine);
    item.addEventListener("click", () => {
      this.notifySourceLineSelected(symbol.sourceLine);
    });

    const title = document.createElement("span");
    title.className = "document-outline-title";
    title.textContent = symbol.name || "Untitled";

    const meta = document.createElement("small");
    const referenceCount = this.referenceCountsByLine.get(symbol.sourceLine) || 0;
    meta.textContent = referenceCount > 0
      ? `${symbol.kind || "symbol"} · ${referenceCount} refs`
      : (symbol.kind || "symbol");

    item.append(title, meta);
    return item;
  }

  createProviderStatus(provider) {
    const status = document.createElement("div");
    status.className = "document-outline-provider";
    status.dataset.provider = provider;
    status.textContent = provider === "language-server"
      ? "LanguageServer outline"
      : "Draft outline";
    return status;
  }

  notifySourceLineSelected(lineNumber) {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler(lineNumber);
    }
  }
}

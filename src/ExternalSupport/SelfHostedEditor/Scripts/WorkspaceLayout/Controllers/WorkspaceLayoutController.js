export class WorkspaceLayoutController {
  constructor(shellElement) {
    this.shellElement = shellElement;
    this.activeViewLabelElement = document.querySelector("[data-active-view-label]");
    this.activeViewName = "editor";
    this.layoutButtons = Array.from(document.querySelectorAll("[data-layout-mode]"));
    this.layoutMode = this.shellElement.dataset.layout || "write-preview";
    this.stateChangedHandlers = [];
    this.viewTabs = Array.from(document.querySelectorAll("[data-view]"));
    this.viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
    this.shellElement.dataset.view = this.activeViewName;

    for (const button of this.layoutButtons) {
      button.addEventListener("click", () => this.setLayout(button.dataset.layoutMode));
    }

    for (const tab of this.viewTabs) {
      tab.addEventListener("click", () => this.setView(tab.dataset.view));
    }
  }

  setLayout(layoutMode) {
    this.layoutMode = layoutMode;
    this.shellElement.dataset.layout = layoutMode;
    for (const button of this.layoutButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.layoutMode === layoutMode));
    }

    this.notifyStateChanged();
  }

  ensureEditorVisible() {
    if (this.shellElement.dataset.layout === "preview-only") {
      this.setLayout("write-preview");
    }

    this.setView("editor");
  }

  setView(viewName) {
    this.activeViewName = viewName;
    this.shellElement.dataset.view = viewName;
    for (const tab of this.viewTabs) {
      tab.classList.toggle("is-active", tab.dataset.view === viewName);
      if (tab.dataset.view === viewName && this.activeViewLabelElement) {
        this.activeViewLabelElement.textContent = tab.textContent || "Editor";
      }
    }

    for (const panel of this.viewPanels) {
      panel.classList.toggle("is-hidden", panel.dataset.viewPanel !== viewName);
    }

    this.notifyStateChanged();
  }

  onStateChanged(handler) {
    this.stateChangedHandlers.push(handler);
  }

  getState() {
    return {
      layoutLabel: this.mapLayoutLabel(this.layoutMode),
      layoutMode: this.layoutMode,
      viewLabel: this.mapViewLabel(this.activeViewName),
      viewName: this.activeViewName,
    };
  }

  mapLayoutLabel(layoutMode) {
    if (layoutMode === "write-only") {
      return "Write";
    }

    if (layoutMode === "preview-only") {
      return "Preview";
    }

    return "Split";
  }

  mapViewLabel(viewName) {
    if (viewName === "localization") {
      return "Localization";
    }

    if (viewName === "graph") {
      return "Node Graph";
    }

    return "Editor";
  }

  notifyStateChanged() {
    const state = this.getState();
    for (const handler of this.stateChangedHandlers) {
      handler(state);
    }
  }
}

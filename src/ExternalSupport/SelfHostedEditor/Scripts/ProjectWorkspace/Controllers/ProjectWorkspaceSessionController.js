export class ProjectWorkspaceSessionController {
  constructor(sessionPanelElement, runtimePanelElement) {
    this.sessionPanelElement = sessionPanelElement;
    this.runtimePanelElement = runtimePanelElement;
  }

  render(sessionState) {
    const sessionItems = [
      this.createStateItem("Workspace", sessionState.workspaceName || "sample-workspace"),
      this.createStateItem("File", sessionState.fileName || "No script"),
      this.createStateItem("Files", String(sessionState.workspaceFileCount ?? 0)),
      this.createStateItem("Revision", sessionState.workspaceRevisionLabel || "1"),
      this.createStateItem("Draft", sessionState.isDirty ? "edited" : "saved"),
      this.createStateItem("Source", sessionState.sourceLabel || "loaded"),
      this.createStateItem("Recovery", sessionState.recoveryLabel || "none"),
      this.createStateItem("Recoverable", sessionState.recoveryFileLabel || "none"),
    ];
    const runtimeItems = [
      this.createStateItem("View", sessionState.viewLabel || "editor"),
      this.createStateItem("Layout", sessionState.layoutLabel || "split"),
      this.createStateItem("Backend", sessionState.backendModeLabel || "dev-host"),
      this.createStateItem("Session", sessionState.backendSessionLabel || "default"),
      this.createStateItem("Diagnostics", sessionState.diagnosticsLabel || "fallback"),
      this.createStateItem("Language", sessionState.languageLabel || "unknown"),
      this.createStateItem("Runtime", sessionState.runtimeLabel || "unavailable"),
      this.createStateItem("Runtime Store", sessionState.runtimeSessionLabel || "unavailable"),
      this.createStateItem("Line IDs", sessionState.lineIdentityLabel || "unknown"),
      this.createStateItem("L10N", sessionState.localizationLabel || "unknown"),
    ];

    this.sessionPanelElement?.replaceChildren(...sessionItems);
    this.runtimePanelElement?.replaceChildren(...runtimeItems);
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
}

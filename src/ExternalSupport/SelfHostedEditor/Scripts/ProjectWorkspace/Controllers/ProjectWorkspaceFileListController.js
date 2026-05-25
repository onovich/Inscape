export class ProjectWorkspaceFileListController {
  constructor(panelElement) {
    this.panelElement = panelElement;
    this.sourceFileSelectedHandlers = [];
  }

  onSourceFileSelected(handler) {
    this.sourceFileSelectedHandlers.push(handler);
  }

  render(workspaceState) {
    const files = workspaceState.workspaceFiles || [];
    if (files.length === 0) {
      this.panelElement?.replaceChildren(this.createEmptyState());
      return;
    }

    this.panelElement?.replaceChildren(
      ...files.map((filePath) => this.createFileButton(filePath, workspaceState))
    );
  }

  createFileButton(filePath, workspaceState) {
    const button = document.createElement("button");
    button.className = "workspace-file-item";
    button.type = "button";
    button.title = filePath;
    if (filePath === workspaceState.filePath) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "true");
    }

    const label = document.createElement("span");
    label.className = "workspace-file-name";
    label.textContent = this.getFileName(filePath);

    const path = document.createElement("small");
    path.className = "workspace-file-path";
    path.textContent = this.getParentPath(filePath) || workspaceState.workspaceName || "workspace";

    button.append(label, path);
    button.addEventListener("click", () => this.notifySourceFileSelected(filePath));
    return button;
  }

  createEmptyState() {
    const empty = document.createElement("div");
    empty.className = "workspace-file-empty";
    empty.textContent = "No files";
    return empty;
  }

  getFileName(filePath) {
    const segments = filePath.split("/").filter(Boolean);
    return segments[segments.length - 1] || filePath;
  }

  getParentPath(filePath) {
    const segments = filePath.split("/").filter(Boolean);
    segments.pop();
    return segments.join("/");
  }

  notifySourceFileSelected(filePath) {
    for (const handler of this.sourceFileSelectedHandlers) {
      handler(filePath);
    }
  }
}

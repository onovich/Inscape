export class ProjectWorkspaceController {
  constructor(options) {
    this.fileInputElement = options.fileInputElement;
    this.scriptSourceLabelElement = options.scriptSourceLabelElement;
    this.workspaceStatusElement = options.workspaceStatusElement;
    this.scriptLoadedHandlers = [];
    this.stateChangedHandlers = [];
    this.currentFilePath = "";
    this.currentFileName = "";
    this.currentWorkspaceName = "";
    this.workspaceFiles = [];
    this.workspaceDocuments = [];
    this.isDirty = false;

    this.fileInputElement.addEventListener("change", () => {
      this.loadSelectedWorkspace();
    });
  }

  setSampleWorkspace(scriptText = "", relativePath = "samples/court-loop.inscape") {
    this.currentWorkspaceName = this.getWorkspaceName(relativePath);
    this.currentFilePath = relativePath;
    this.currentFileName = this.getFileNameFromPath(relativePath);
    this.workspaceFiles = [relativePath];
    this.workspaceDocuments = [{
      relativePath,
      text: scriptText,
    }];
    this.isDirty = false;
    this.renderStatus();
  }

  onScriptLoaded(handler) {
    this.scriptLoadedHandlers.push(handler);
  }

  onStateChanged(handler) {
    this.stateChangedHandlers.push(handler);
  }

  getState() {
    return {
      fileName: this.currentFileName,
      filePath: this.currentFilePath,
      isDirty: this.isDirty,
      workspaceFileCount: this.workspaceFiles.length,
      workspaceFiles: this.workspaceFiles.slice(),
      workspaceName: this.currentWorkspaceName,
      sourceLabel: this.isDirty
        ? "Local draft"
        : "Loaded script",
    };
  }

  getWorkspaceContext() {
    return {
      currentFilePath: this.currentFilePath,
      workspaceName: this.currentWorkspaceName,
      documents: this.workspaceDocuments.map((document) => ({
        relativePath: document.relativePath,
        text: document.text,
      })),
    };
  }

  markDirty() {
    if (this.isDirty) {
      return;
    }

    this.isDirty = true;
    this.renderStatus();
  }

  updateCurrentDraft(text) {
    const currentDocument = this.workspaceDocuments.find((document) => document.relativePath === this.currentFilePath);
    if (currentDocument) {
      currentDocument.text = text;
      return;
    }

    if (!this.currentFilePath) {
      return;
    }

    this.workspaceDocuments.push({
      relativePath: this.currentFilePath,
      text,
    });
  }

  async loadSelectedWorkspace() {
    const selectedEntries = Array.from(this.fileInputElement.files || [])
      .filter((file) => this.isWorkspaceContextFile(file))
      .map((file) => ({
        file,
        relativePath: this.getRelativePath(file),
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const scriptEntries = selectedEntries.filter((entry) => entry.relativePath.toLowerCase().endsWith(".inscape"));
    if (scriptEntries.length === 0) {
      return;
    }

    const activeFile = scriptEntries[0];
    const text = await activeFile.file.text();

    this.currentWorkspaceName = this.getWorkspaceName(activeFile.relativePath);
    this.currentFileName = activeFile.file.name;
    this.currentFilePath = activeFile.relativePath;
    this.workspaceFiles = scriptEntries.map((entry) => entry.relativePath);
    this.workspaceDocuments = await Promise.all(
      selectedEntries.map(async (entry) => ({
        relativePath: entry.relativePath,
        text: await entry.file.text(),
      }))
    );
    this.isDirty = false;
    this.renderStatus();
    this.notifyScriptLoaded({
      fileName: activeFile.file.name,
      filePath: activeFile.relativePath,
      text,
      workspaceFiles: this.workspaceFiles.slice(),
      workspaceName: this.currentWorkspaceName,
    });
  }

  openWorkspaceFile(relativePath) {
    const document = this.workspaceDocuments.find((item) => item.relativePath === relativePath);
    if (!document) {
      return null;
    }

    this.currentFilePath = document.relativePath;
    this.currentFileName = this.getFileNameFromPath(document.relativePath);
    this.renderStatus();
    return {
      fileName: this.currentFileName,
      filePath: this.currentFilePath,
      text: document.text,
      workspaceFiles: this.workspaceFiles.slice(),
      workspaceName: this.currentWorkspaceName,
    };
  }

  renderStatus() {
    const dirtyMarker = this.isDirty ? " - edited" : "";
    const workspaceLabel = this.currentWorkspaceName || this.currentFileName;
    const fileCountLabel = this.workspaceFiles.length > 1
      ? ` - ${this.workspaceFiles.length} files`
      : "";
    this.workspaceStatusElement.textContent = `${workspaceLabel}${fileCountLabel}${dirtyMarker}`;
    this.scriptSourceLabelElement.textContent = this.isDirty
      ? "Local draft"
      : this.workspaceFiles.length > 1
        ? "Workspace draft"
        : "Loaded script";
    this.notifyStateChanged();
  }

  getRelativePath(file) {
    if (file.webkitRelativePath) {
      return file.webkitRelativePath.replace(/\\/g, "/");
    }

    return file.name;
  }

  isWorkspaceContextFile(file) {
    const relativePath = this.getRelativePath(file).toLowerCase();
    return relativePath.endsWith(".inscape")
      || relativePath.endsWith("inscape.config.json")
      || relativePath.endsWith(".host.schema.json")
      || relativePath.endsWith(".host.bridge.json");
  }

  getWorkspaceName(relativePath) {
    const segments = relativePath.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return segments[0];
    }

    return segments[0]?.replace(/\.inscape$/i, "") || "workspace";
  }

  getFileNameFromPath(relativePath) {
    const segments = relativePath.split("/").filter(Boolean);
    return segments[segments.length - 1] || relativePath;
  }

  notifyScriptLoaded(script) {
    for (const handler of this.scriptLoadedHandlers) {
      handler(script);
    }
  }

  notifyStateChanged() {
    const state = this.getState();
    for (const handler of this.stateChangedHandlers) {
      handler(state);
    }
  }
}

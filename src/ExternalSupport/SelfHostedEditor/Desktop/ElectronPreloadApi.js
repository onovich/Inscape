export const SelfHostedEditorPreloadApiName = "inscapeSelfHostedEditor";

export const SelfHostedEditorPreloadCapabilities = Object.freeze({
  embeddedBackend: false,
  shell: "electron",
  workspaceFileSystem: false,
});

export const SelfHostedEditorPreloadEditorCommand = Object.freeze({
  DocumentBufferList: "document-buffer.list",
  DocumentBufferRead: "document-buffer.read",
  DocumentBufferSave: "document-buffer.save",
  DocumentBufferUpdateDraft: "document-buffer.update-draft",
  ProjectSessionStatus: "project-session.status",
  WorkspaceListFiles: "workspace.list-files",
  WorkspaceOpenFolder: "workspace.open-folder",
});

export function listSelfHostedEditorPreloadCommands() {
  return Object.values(SelfHostedEditorPreloadEditorCommand);
}

export function createSelfHostedEditorPreloadApi() {
  return Object.freeze({
    capabilities: SelfHostedEditorPreloadCapabilities,
    editorCommands: SelfHostedEditorPreloadEditorCommand,
  });
}

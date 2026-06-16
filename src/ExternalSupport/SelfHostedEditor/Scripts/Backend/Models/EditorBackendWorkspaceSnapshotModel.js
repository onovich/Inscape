import { EditorBackendDocumentBufferStoreModel } from "./EditorBackendDocumentBufferStoreModel.js";

export const EditorBackendWorkspaceSnapshotFormat = "inscape.self-hosted-editor.workspace-snapshot";
export const EditorBackendWorkspaceSnapshotFormatVersion = 1;

export class EditorBackendWorkspaceSnapshotModel {
  static buildSnapshot({
    activeRelativePath = "",
    store = {},
  } = {}) {
    const normalizedStore = EditorBackendDocumentBufferStoreModel.buildStore(store);
    const activePath = resolveActiveRelativePath(activeRelativePath, normalizedStore);
    const activeDocument = normalizedStore.documents.find((document) => document.relativePath === activePath) || null;

    return {
      activeRelativePath: activePath,
      currentFilePath: activePath,
      documentCount: normalizedStore.documentCount,
      documentRevision: activeDocument?.revision || normalizedStore.revision,
      documents: normalizedStore.documents.map((document) => ({
        active: document.relativePath === activePath,
        dirty: Boolean(document.dirty),
        existsOnDisk: Boolean(document.existsOnDisk),
        lastLoadedUtc: document.lastLoadedUtc || "",
        relativePath: document.relativePath,
        revision: document.revision,
        text: document.text,
      })),
      format: EditorBackendWorkspaceSnapshotFormat,
      formatVersion: EditorBackendWorkspaceSnapshotFormatVersion,
      payloadContentExposed: true,
      revision: normalizedStore.revision,
      sessionId: normalizedStore.sessionId,
      source: "backend-buffer-store",
      workspaceName: normalizedStore.workspaceName,
    };
  }

  static buildActiveDocumentRequest(snapshot = {}) {
    const normalizedSnapshot = snapshot.format === EditorBackendWorkspaceSnapshotFormat
      ? snapshot
      : this.buildSnapshot({ store: snapshot });
    const activeDocument = normalizedSnapshot.documents.find((document) => document.relativePath === normalizedSnapshot.activeRelativePath)
      || normalizedSnapshot.documents[0]
      || null;

    return {
      activeRelativePath: normalizedSnapshot.activeRelativePath,
      documentRevision: activeDocument?.revision || normalizedSnapshot.revision,
      scriptText: activeDocument?.text || "",
      workspace: normalizedSnapshot,
    };
  }
}

function resolveActiveRelativePath(activeRelativePath, store) {
  const explicitPath = normalizeRelativePath(activeRelativePath);
  if (explicitPath && store.documents.some((document) => document.relativePath === explicitPath)) {
    return explicitPath;
  }

  return store.activeRelativePath;
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

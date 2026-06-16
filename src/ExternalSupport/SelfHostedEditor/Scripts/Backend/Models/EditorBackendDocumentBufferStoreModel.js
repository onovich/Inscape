import { EditorBackendDocumentBufferModel } from "./EditorBackendDocumentBufferModel.js";

export const EditorBackendDocumentBufferStoreFormat = "inscape.self-hosted-editor.document-buffer-store";
export const EditorBackendDocumentBufferListFormat = "inscape.self-hosted-editor.document-buffer-list";
export const EditorBackendDocumentBufferStoreModelFormatVersion = 1;

export class EditorBackendDocumentBufferStoreModel {
  static buildStore({
    activeRelativePath = "",
    documents = [],
    revision = 1,
    sessionId = "default",
    workspaceName = "workspace",
  } = {}) {
    const documentBuffers = normalizeDocuments(documents);
    const activePath = resolveActiveRelativePath(activeRelativePath, documentBuffers);
    const normalizedDocuments = documentBuffers.map((document) => EditorBackendDocumentBufferModel.buildBuffer({
      ...document,
      active: document.relativePath === activePath,
    }));
    const storeRevision = normalizeRevision(
      Math.max(
        normalizeRevision(revision),
        ...normalizedDocuments.map((document) => document.revision)
      )
    );

    return {
      activeRelativePath: activePath,
      documentCount: normalizedDocuments.length,
      documents: normalizedDocuments,
      format: EditorBackendDocumentBufferStoreFormat,
      formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
      revision: storeRevision,
      sessionId: normalizeSessionId(sessionId),
      workspaceName: normalizeWorkspaceName(workspaceName),
    };
  }

  static listDocuments(store = {}) {
    const normalizedStore = this.buildStore(store);
    return {
      activeRelativePath: normalizedStore.activeRelativePath,
      documentCount: normalizedStore.documentCount,
      documents: normalizedStore.documents.map((document) => EditorBackendDocumentBufferModel.buildSummary(document)),
      format: EditorBackendDocumentBufferListFormat,
      formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
      payloadContentExposed: false,
      revision: normalizedStore.revision,
      sessionId: normalizedStore.sessionId,
      workspaceName: normalizedStore.workspaceName,
    };
  }

  static getDocument(store = {}, request = {}) {
    const normalizedStore = this.buildStore(store);
    const relativePath = normalizeRelativePath(request.relativePath);
    const document = normalizedStore.documents.find((item) => item.relativePath === relativePath);
    if (!document) {
      return {
        document: null,
        ok: false,
        reason: "document-not-found",
        relativePath,
      };
    }

    return {
      document,
      ok: true,
      reason: "",
      relativePath,
    };
  }

  static updateDocument(store = {}, request = {}) {
    const normalizedStore = this.buildStore(store);
    const relativePath = normalizeRelativePath(request.relativePath);
    const currentDocument = normalizedStore.documents.find((item) => item.relativePath === relativePath);
    if (!currentDocument) {
      return {
        document: null,
        ok: false,
        reason: "document-not-found",
        relativePath,
        store: normalizedStore,
      };
    }

    const nextRevision = normalizeRevision(Math.max(
      normalizedStore.revision + 1,
      currentDocument.revision + 1,
      request.revision ?? 1
    ));
    const nextDocument = EditorBackendDocumentBufferModel.buildBuffer({
      ...currentDocument,
      dirty: request.dirty ?? true,
      diskTextHash: request.diskTextHash ?? currentDocument.diskTextHash,
      existsOnDisk: request.existsOnDisk ?? currentDocument.existsOnDisk,
      lastLoadedUtc: request.lastLoadedUtc ?? currentDocument.lastLoadedUtc,
      revision: nextRevision,
      text: request.text,
    });
    const nextStore = this.buildStore({
      ...normalizedStore,
      documents: normalizedStore.documents.map((document) => (
        document.relativePath === relativePath ? nextDocument : document
      )),
      revision: nextRevision,
    });

    return {
      document: nextDocument,
      ok: true,
      reason: "",
      relativePath,
      store: nextStore,
    };
  }

  static setActiveDocument(store = {}, request = {}) {
    const normalizedStore = this.buildStore(store);
    const relativePath = normalizeRelativePath(request.relativePath);
    const document = normalizedStore.documents.find((item) => item.relativePath === relativePath);
    if (!document) {
      return {
        document: null,
        ok: false,
        reason: "document-not-found",
        relativePath,
        store: normalizedStore,
      };
    }

    const nextStore = this.buildStore({
      ...normalizedStore,
      activeRelativePath: relativePath,
    });
    return {
      document: nextStore.documents.find((item) => item.relativePath === relativePath) || null,
      ok: true,
      reason: "",
      relativePath,
      store: nextStore,
    };
  }
}

function normalizeDocuments(documents) {
  const source = Array.isArray(documents) ? documents : [];
  const seen = new Set();
  const normalized = [];
  for (const document of source) {
    const buffer = EditorBackendDocumentBufferModel.buildBuffer(document);
    if (!buffer.relativePath || seen.has(buffer.relativePath)) {
      continue;
    }

    seen.add(buffer.relativePath);
    normalized.push(buffer);
  }

  return normalized;
}

function resolveActiveRelativePath(activeRelativePath, documents) {
  const explicitPath = normalizeRelativePath(activeRelativePath);
  if (explicitPath && documents.some((document) => document.relativePath === explicitPath)) {
    return explicitPath;
  }

  return documents.find((document) => document.active)?.relativePath
    || documents[0]?.relativePath
    || "";
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

function normalizeRevision(revision, fallback = 1) {
  const value = Number(revision ?? fallback);
  if (!Number.isFinite(value) || value < fallback) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeSessionId(sessionId) {
  const normalized = String(sessionId || "default").trim();
  if (!normalized) {
    return "default";
  }

  return normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120) || "default";
}

function normalizeWorkspaceName(workspaceName) {
  return String(workspaceName || "workspace").trim() || "workspace";
}

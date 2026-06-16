import { EditorBackendDocumentBufferModel } from "./EditorBackendDocumentBufferModel.js";
import { EditorBackendDesktopSessionModel } from "./EditorBackendDesktopSessionModel.js";

export const EditorBackendDocumentBufferStoreFormat = "inscape.self-hosted-editor.document-buffer-store";
export const EditorBackendDocumentBufferListFormat = "inscape.self-hosted-editor.document-buffer-list";
export const EditorBackendDocumentBufferSaveResultFormat = "inscape.self-hosted-editor.document-buffer-save-result";
export const EditorBackendDocumentBufferSaveAllResultFormat = "inscape.self-hosted-editor.document-buffer-save-all-result";
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

    const baseRevision = normalizeOptionalRevision(request.baseRevision);
    if (baseRevision !== null && baseRevision !== currentDocument.revision) {
      return {
        baseRevision,
        currentRevision: currentDocument.revision,
        document: EditorBackendDocumentBufferModel.buildSummary(currentDocument),
        ok: false,
        reason: "stale-document-revision",
        relativePath,
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
      lastSavedRevision: currentDocument.lastSavedRevision,
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

  static saveDocument(store = {}, request = {}) {
    return buildSaveDocumentOutcome(this.buildStore(store), request).result;
  }

  static saveAll(store = {}, request = {}) {
    let nextStore = this.buildStore(store);
    const requestedPaths = normalizeRelativePathList(request.relativePaths);
    const candidateDocuments = nextStore.documents.filter((document) => (
      document.dirty
      && (
        requestedPaths.length === 0
        || requestedPaths.includes(document.relativePath)
      )
    ));
    const results = [];

    for (const document of candidateDocuments) {
      const outcome = buildSaveDocumentOutcome(nextStore, {
        ...request,
        baseRevision: document.revision,
        relativePath: document.relativePath,
      });
      results.push(omitStoreSummary(outcome.result));
      nextStore = outcome.nextStore;
    }

    const firstFailedResult = results.find((result) => !result.ok) || null;
    const activeDocument = nextStore.documents.find((document) => document.relativePath === nextStore.activeRelativePath)
      || nextStore.documents[0]
      || null;
    const saveStatus = firstFailedResult?.saveStatus || EditorBackendDesktopSessionModel.buildSaveStatus({
      dirty: nextStore.documents.some((document) => document.dirty),
      lastSavedRevision: results.length > 0
        ? Math.max(...results.filter((result) => result.ok).map((result) => result.savedRevision || 0), 0)
        : activeDocument?.revision || nextStore.revision,
      relativePath: activeDocument?.relativePath || "",
      revision: activeDocument?.revision || nextStore.revision,
      state: firstFailedResult ? "error" : "saved",
    });

    return {
      failedCount: results.filter((result) => !result.ok).length,
      format: EditorBackendDocumentBufferSaveAllResultFormat,
      formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
      ok: !firstFailedResult,
      operation: "save-all",
      payloadContentExposed: false,
      reason: firstFailedResult ? "one-or-more-documents-failed" : "",
      results,
      saveStatus,
      savedCount: results.filter((result) => result.ok).length,
      sessionId: nextStore.sessionId,
      storeSummary: this.listDocuments(nextStore),
      workspaceName: nextStore.workspaceName,
    };
  }
}

function buildSaveDocumentOutcome(store, request = {}) {
  const normalizedStore = EditorBackendDocumentBufferStoreModel.buildStore(store);
  const relativePath = normalizeRelativePath(request.relativePath || normalizedStore.activeRelativePath);
  const currentDocument = normalizedStore.documents.find((item) => item.relativePath === relativePath);
  if (!currentDocument) {
    const result = buildSaveDocumentFailureResult({
      currentDocument: null,
      normalizedStore,
      reason: "document-not-found",
      relativePath,
    });
    return {
      nextStore: normalizedStore,
      result,
    };
  }

  const baseRevision = normalizeOptionalRevision(request.baseRevision);
  if (baseRevision !== null && baseRevision !== currentDocument.revision) {
    const result = buildSaveDocumentFailureResult({
      baseRevision,
      currentDocument,
      normalizedStore,
      reason: "stale-document-revision",
      relativePath,
    });
    return {
      nextStore: normalizedStore,
      result,
    };
  }

  const diskConflict = buildDiskConflict(currentDocument, request);
  if (diskConflict) {
    const result = buildSaveDocumentFailureResult({
      baseRevision,
      currentDocument,
      diskConflict,
      normalizedStore,
      reason: "disk-conflict",
      relativePath,
    });
    return {
      nextStore: normalizedStore,
      result,
    };
  }

  const workspaceBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
    operation: "write",
    relativePath,
    workspaceRoot: request.workspaceRoot,
  });
  if (!workspaceBoundary.allowed) {
    const result = buildSaveDocumentFailureResult({
      baseRevision,
      currentDocument,
      normalizedStore,
      reason: workspaceBoundary.reason || "workspace-boundary-rejected",
      relativePath,
      workspaceBoundary,
    });
    return {
      nextStore: normalizedStore,
      result,
    };
  }

  const savedDocument = EditorBackendDocumentBufferModel.buildBuffer({
    ...currentDocument,
    dirty: false,
    diskTextHash: resolveSavedDiskTextHash(currentDocument, request),
    lastSavedRevision: currentDocument.revision,
  });
  const nextStore = EditorBackendDocumentBufferStoreModel.buildStore({
    ...normalizedStore,
    documents: normalizedStore.documents.map((document) => (
      document.relativePath === relativePath ? savedDocument : document
    )),
  });
  const result = buildSaveDocumentSuccessResult({
    baseRevision,
    currentDocument: savedDocument,
    nextStore,
    normalizedStore,
    relativePath,
    workspaceBoundary,
  });
  return {
    nextStore,
    result,
  };
}

function buildSaveDocumentSuccessResult({
  baseRevision,
  currentDocument,
  nextStore,
  normalizedStore,
  relativePath,
  workspaceBoundary,
}) {
  return {
    baseRevision,
    currentRevision: currentDocument.revision,
    document: EditorBackendDocumentBufferModel.buildSummary(currentDocument),
    format: EditorBackendDocumentBufferSaveResultFormat,
    formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
    ok: true,
    operation: "save-document",
    payloadContentExposed: false,
    reason: "",
    relativePath,
    saveStatus: EditorBackendDesktopSessionModel.buildSaveStatus({
      dirty: false,
      lastSavedRevision: currentDocument.revision,
      relativePath,
      revision: currentDocument.revision,
      state: "saved",
    }),
    savedRevision: currentDocument.revision,
    sessionId: normalizedStore.sessionId,
    storeSummary: EditorBackendDocumentBufferStoreModel.listDocuments(nextStore),
    workspaceBoundary,
    workspaceName: normalizedStore.workspaceName,
    writeTarget: workspaceBoundary.writeTarget || null,
  };
}

function buildSaveDocumentFailureResult({
  baseRevision = null,
  currentDocument,
  diskConflict = null,
  normalizedStore,
  reason,
  relativePath,
  workspaceBoundary = null,
}) {
  const currentRevision = currentDocument?.revision || 0;
  return {
    baseRevision,
    currentRevision,
    document: currentDocument ? EditorBackendDocumentBufferModel.buildSummary(currentDocument) : null,
    diskConflict,
    format: EditorBackendDocumentBufferSaveResultFormat,
    formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
    ok: false,
    operation: "save-document",
    payloadContentExposed: false,
    reason,
    relativePath,
    saveStatus: EditorBackendDesktopSessionModel.buildSaveStatus({
      dirty: Boolean(currentDocument?.dirty),
      lastError: {
        code: reason,
        message: `Document save rejected: ${reason}`,
      },
      relativePath,
      revision: currentRevision || normalizedStore.revision,
      state: "error",
    }),
    savedRevision: 0,
    sessionId: normalizedStore.sessionId,
    storeSummary: EditorBackendDocumentBufferStoreModel.listDocuments(normalizedStore),
    workspaceBoundary,
    workspaceName: normalizedStore.workspaceName,
    writeTarget: workspaceBoundary?.writeTarget || null,
  };
}

function buildDiskConflict(currentDocument, request = {}) {
  const expectedDiskTextHash = normalizeTextHash(currentDocument.diskTextHash);
  const observedDiskTextHash = normalizeTextHash(
    request.observedDiskTextHash
      ?? request.currentDiskTextHash
      ?? ""
  );
  if (!expectedDiskTextHash || !observedDiskTextHash || expectedDiskTextHash === observedDiskTextHash) {
    return null;
  }

  return {
    expectedDiskTextHash,
    observedDiskTextHash,
    reason: "disk-conflict",
  };
}

function resolveSavedDiskTextHash(currentDocument, request = {}) {
  return normalizeTextHash(
    request.nextDiskTextHash
      ?? request.diskTextHash
      ?? request.observedDiskTextHash
      ?? request.currentDiskTextHash
      ?? currentDocument.diskTextHash
  );
}

function omitStoreSummary(result) {
  const {
    storeSummary,
    ...summary
  } = result;
  return summary;
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

function normalizeRelativePathList(relativePaths) {
  if (!Array.isArray(relativePaths)) {
    return [];
  }

  return [...new Set(relativePaths.map(normalizeRelativePath).filter(Boolean))];
}

function normalizeTextHash(textHash) {
  return String(textHash || "").trim();
}

function normalizeRevision(revision, fallback = 1) {
  const value = Number(revision ?? fallback);
  if (!Number.isFinite(value) || value < fallback) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeOptionalRevision(revision) {
  if (revision === null || typeof revision === "undefined") {
    return null;
  }

  return normalizeRevision(revision);
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

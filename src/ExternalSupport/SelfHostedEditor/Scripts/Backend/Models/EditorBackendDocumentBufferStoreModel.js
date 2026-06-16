import { EditorBackendDocumentBufferModel } from "./EditorBackendDocumentBufferModel.js";
import { EditorBackendDesktopSessionModel } from "./EditorBackendDesktopSessionModel.js";

export const EditorBackendDocumentBufferStoreFormat = "inscape.self-hosted-editor.document-buffer-store";
export const EditorBackendDocumentBufferListFormat = "inscape.self-hosted-editor.document-buffer-list";
export const EditorBackendDocumentBufferAutosavePlanFormat = "inscape.self-hosted-editor.document-buffer-autosave-plan";
export const EditorBackendDocumentBufferFlushPlanFormat = "inscape.self-hosted-editor.document-buffer-flush-plan";
export const EditorBackendDocumentBufferRecoverySnapshotFormat = "inscape.self-hosted-editor.document-buffer-recovery-snapshot";
export const EditorBackendDocumentBufferRecoverySnapshotPlanFormat = "inscape.self-hosted-editor.document-buffer-recovery-snapshot-plan";
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

  static buildAutosavePlan(store = {}, request = {}) {
    const normalizedStore = this.buildStore(store);
    const autosaveEnabled = request.autosaveEnabled !== false;
    const debounceMs = normalizeNonNegativeInteger(request.debounceMs, 1500);
    const idleElapsedMs = normalizeNonNegativeInteger(request.idleElapsedMs, 0);
    const ready = autosaveEnabled && idleElapsedMs >= debounceMs;
    const pendingWrites = normalizePendingWrites(request.pendingWrites);
    const dirtyDocuments = normalizedStore.documents.filter((document) => document.dirty);
    const saveRequests = [];
    const skippedWrites = [];

    for (const document of dirtyDocuments) {
      const documentPendingWrites = pendingWrites.filter((pendingWrite) => pendingWrite.relativePath === document.relativePath);
      for (const pendingWrite of documentPendingWrites) {
        if (pendingWrite.documentRevision < document.revision) {
          skippedWrites.push({
            documentRevision: pendingWrite.documentRevision,
            latestRevision: document.revision,
            reason: "stale-autosave-revision",
            relativePath: document.relativePath,
          });
        }
      }

      if (!autosaveEnabled) {
        skippedWrites.push(buildAutosaveSkip(document, "autosave-disabled"));
        continue;
      }

      if (!isInscapeDocumentPath(document.relativePath)) {
        skippedWrites.push(buildAutosaveSkip(document, "autosave-target-not-supported"));
        continue;
      }

      if (!ready) {
        skippedWrites.push(buildAutosaveSkip(document, "debounce-waiting"));
        continue;
      }

      saveRequests.push({
        baseRevision: document.revision,
        documentRevision: document.revision,
        lastSavedRevision: document.lastSavedRevision,
        reason: "idle-debounce-ready",
        relativePath: document.relativePath,
      });
    }

    return {
      autosaveEnabled,
      debounceMs,
      dirtyCount: dirtyDocuments.length,
      format: EditorBackendDocumentBufferAutosavePlanFormat,
      formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
      idleElapsedMs,
      payloadContentExposed: false,
      ready,
      saveRequests,
      skippedWrites,
      storeRevision: normalizedStore.revision,
      storeSummary: this.listDocuments(normalizedStore),
      workspaceName: normalizedStore.workspaceName,
    };
  }

  static buildFlushPlan(store = {}, request = {}) {
    const normalizedStore = this.buildStore(store);
    const trigger = normalizeFlushTrigger(request.trigger || request.operation);
    const requestedPaths = normalizeRelativePathList(request.relativePaths);
    const dirtyDocuments = normalizedStore.documents.filter((document) => (
      document.dirty
      && (
        requestedPaths.length === 0
        || requestedPaths.includes(document.relativePath)
      )
    ));
    const flushRequests = [];
    const blockingIssues = [];

    for (const document of dirtyDocuments) {
      const workspaceBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
        operation: "write",
        relativePath: document.relativePath,
        workspaceRoot: request.workspaceRoot,
      });
      if (!workspaceBoundary.allowed) {
        blockingIssues.push(buildFlushBlockingIssue({
          document,
          reason: workspaceBoundary.reason || "workspace-boundary-rejected",
          workspaceBoundary,
        }));
        continue;
      }

      flushRequests.push({
        baseRevision: document.revision,
        documentRevision: document.revision,
        lastSavedRevision: document.lastSavedRevision,
        reason: "flush-latest-revision",
        relativePath: document.relativePath,
        required: true,
        trigger,
        workspaceBoundary,
        writeTarget: workspaceBoundary.writeTarget || null,
      });
    }

    const visibleFailures = buildFlushVisibleFailures(normalizedStore, request.saveResults ?? request.results);
    const continuationBlocked = flushRequests.length > 0
      || blockingIssues.length > 0
      || visibleFailures.length > 0;

    return {
      blockingIssues,
      continuationBlocked,
      dirtyCount: dirtyDocuments.length,
      failedCount: visibleFailures.length,
      flushRequestCount: flushRequests.length,
      flushRequests,
      format: EditorBackendDocumentBufferFlushPlanFormat,
      formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
      payloadContentExposed: false,
      storeRevision: normalizedStore.revision,
      storeSummary: this.listDocuments(normalizedStore),
      trigger,
      uiVisibility: buildFlushUiVisibility({
        blockingIssues,
        flushRequests,
        visibleFailures,
      }),
      visibleFailures,
      workspaceName: normalizedStore.workspaceName,
    };
  }

  static buildRecoverySnapshotPlan(store = {}, request = {}) {
    const normalizedStore = this.buildStore(store);
    const requestedPaths = normalizeRelativePathList(request.relativePaths);
    const dirtyDocuments = normalizedStore.documents.filter((document) => (
      document.dirty
      && (
        requestedPaths.length === 0
        || requestedPaths.includes(document.relativePath)
      )
    ));
    const snapshotModifiedUtc = normalizeTimestamp(request.snapshotModifiedUtc || request.nowUtc);
    const snapshotWrites = [];
    const skippedDocuments = [];

    for (const document of dirtyDocuments) {
      const snapshotRelativePath = buildRecoverySnapshotRelativePath(document.relativePath);
      const workspaceBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
        operation: "write",
        relativePath: snapshotRelativePath,
        workspaceRoot: request.workspaceRoot,
      });
      if (!workspaceBoundary.allowed) {
        skippedDocuments.push({
          documentRevision: document.revision,
          reason: workspaceBoundary.reason || "workspace-boundary-rejected",
          relativePath: document.relativePath,
          snapshotRelativePath,
          workspaceBoundary,
        });
        continue;
      }

      const text = String(document.text || "");
      snapshotWrites.push({
        contentHash: buildTextContentHash(text),
        diskModifiedUtc: resolveRecoveryDiskModifiedUtc(document, request),
        documentRevision: document.revision,
        format: EditorBackendDocumentBufferRecoverySnapshotFormat,
        formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
        lastSavedRevision: document.lastSavedRevision,
        payloadContentExposed: true,
        reason: "dirty-buffer-recovery-snapshot",
        relativePath: document.relativePath,
        snapshotModifiedUtc,
        snapshotRelativePath,
        text,
        workspaceBoundary,
        writeTarget: workspaceBoundary.writeTarget || null,
      });
    }

    const cleanupRequests = buildRecoveryCleanupRequests(normalizedStore, request);
    const recoveryStatus = EditorBackendDesktopSessionModel.buildRecoveryStatus({
      items: snapshotWrites.map((snapshot) => ({
        contentHash: snapshot.contentHash,
        diskModifiedUtc: snapshot.diskModifiedUtc,
        relativePath: snapshot.relativePath,
        revision: snapshot.documentRevision,
        snapshotModifiedUtc: snapshot.snapshotModifiedUtc,
      })),
    });

    return {
      cleanupRequests,
      dirtyCount: dirtyDocuments.length,
      format: EditorBackendDocumentBufferRecoverySnapshotPlanFormat,
      formatVersion: EditorBackendDocumentBufferStoreModelFormatVersion,
      payloadContentExposed: snapshotWrites.length > 0,
      recoveryStatus,
      skippedDocuments,
      snapshotWriteCount: snapshotWrites.length,
      snapshotWrites,
      storeRevision: normalizedStore.revision,
      storeSummary: this.listDocuments(normalizedStore),
      workspaceName: normalizedStore.workspaceName,
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

function buildAutosaveSkip(document, reason) {
  return {
    documentRevision: document.revision,
    latestRevision: document.revision,
    reason,
    relativePath: document.relativePath,
  };
}

function isInscapeDocumentPath(relativePath) {
  return normalizeRelativePath(relativePath).toLowerCase().endsWith(".inscape");
}

function buildFlushBlockingIssue({
  document,
  reason,
  workspaceBoundary = null,
}) {
  return {
    documentRevision: document.revision,
    latestRevision: document.revision,
    reason: normalizeReasonToken(reason, "flush-blocked"),
    relativePath: document.relativePath,
    workspaceBoundary,
    writeTarget: workspaceBoundary?.writeTarget || null,
  };
}

function buildFlushVisibleFailures(store, saveResults) {
  if (!Array.isArray(saveResults)) {
    return [];
  }

  return saveResults
    .filter((result) => result && result.ok === false)
    .map((result) => {
      const relativePath = normalizeRelativePath(
        result.relativePath
          ?? result.document?.relativePath
          ?? result.saveStatus?.relativePath
      );
      const document = store.documents.find((item) => item.relativePath === relativePath) || null;
      const reason = normalizeReasonToken(
        result.reason
          || result.saveStatus?.lastError?.code
          || "flush-failed",
        "flush-failed"
      );
      const documentRevision = normalizeRevision(
        result.currentRevision
          ?? result.document?.revision
          ?? document?.revision
          ?? result.saveStatus?.revision,
        0
      );

      return {
        documentRevision,
        latestRevision: document?.revision || documentRevision,
        reason,
        relativePath,
        saveStatus: EditorBackendDesktopSessionModel.buildSaveStatus({
          dirty: true,
          lastError: {
            code: reason,
            message: `Flush failed: ${reason}`,
          },
          lastSavedRevision: document?.lastSavedRevision ?? 0,
          relativePath,
          revision: documentRevision || document?.revision || store.revision,
          state: "error",
        }),
      };
    })
    .filter((failure) => failure.relativePath);
}

function buildFlushUiVisibility({
  blockingIssues = [],
  flushRequests = [],
  visibleFailures = [],
} = {}) {
  if (visibleFailures.length > 0) {
    return {
      messageKey: "save-error-visible",
      requiresUserAction: true,
      state: "save-error-visible",
    };
  }

  if (blockingIssues.length > 0) {
    return {
      messageKey: "flush-blocked-visible",
      requiresUserAction: true,
      state: "flush-blocked-visible",
    };
  }

  if (flushRequests.length > 0) {
    return {
      messageKey: "flush-required",
      requiresUserAction: false,
      state: "flush-required",
    };
  }

  return {
    messageKey: "clean",
    requiresUserAction: false,
    state: "clean",
  };
}

function normalizeFlushTrigger(trigger) {
  const normalizedTrigger = normalizeReasonToken(trigger, "manual-save");
  if ([
    "manual-save",
    "close-window",
    "switch-workspace",
    "app-exit",
  ].includes(normalizedTrigger)) {
    return normalizedTrigger;
  }

  return "manual-save";
}

function normalizeReasonToken(reason, fallback) {
  const normalizedReason = String(reason || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return normalizedReason || fallback;
}

function buildRecoveryCleanupRequests(store, request = {}) {
  const savedRelativePaths = new Set(normalizeRelativePathList(request.savedRelativePaths));
  const saveResults = Array.isArray(request.saveResults ?? request.results)
    ? request.saveResults ?? request.results
    : [];
  for (const result of saveResults) {
    if (result?.ok === true) {
      const relativePath = normalizeRelativePath(
        result.relativePath
          ?? result.document?.relativePath
          ?? result.saveStatus?.relativePath
      );
      if (relativePath) {
        savedRelativePaths.add(relativePath);
      }
    }
  }

  return [...savedRelativePaths].map((relativePath) => {
    const document = store.documents.find((item) => item.relativePath === relativePath) || null;
    const snapshotRelativePath = buildRecoverySnapshotRelativePath(relativePath);
    const workspaceBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
      operation: "delete",
      relativePath: snapshotRelativePath,
      workspaceRoot: request.workspaceRoot,
    });

    return {
      documentRevision: document?.revision || 0,
      payloadContentExposed: false,
      reason: "saved-document-recovery-cleanup",
      relativePath,
      snapshotRelativePath,
      workspaceBoundary,
      writeTarget: workspaceBoundary.writeTarget || null,
    };
  });
}

function buildRecoverySnapshotRelativePath(relativePath) {
  return `.inscape-workspace/recovery/${normalizeRelativePath(relativePath)}.snapshot.json`;
}

function resolveRecoveryDiskModifiedUtc(document, request = {}) {
  const relativePath = document.relativePath;
  const diskModifiedUtcByPath = request.diskModifiedUtcByPath || {};
  if (diskModifiedUtcByPath && typeof diskModifiedUtcByPath === "object") {
    const perPathTimestamp = diskModifiedUtcByPath[relativePath];
    if (perPathTimestamp) {
      return normalizeTimestamp(perPathTimestamp);
    }
  }

  return normalizeTimestamp(request.diskModifiedUtc || document.lastLoadedUtc);
}

function buildTextContentHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeTimestamp(timestamp) {
  const source = String(timestamp || "").trim();
  if (!source) {
    return "";
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return source;
  }

  return parsed.toISOString();
}

function normalizePendingWrites(pendingWrites) {
  if (!Array.isArray(pendingWrites)) {
    return [];
  }

  return pendingWrites
    .map((pendingWrite) => ({
      documentRevision: normalizeRevision(pendingWrite?.documentRevision ?? pendingWrite?.revision, 0),
      relativePath: normalizeRelativePath(pendingWrite?.relativePath),
    }))
    .filter((pendingWrite) => pendingWrite.relativePath);
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
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

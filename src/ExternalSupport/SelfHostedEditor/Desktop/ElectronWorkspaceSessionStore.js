import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { EditorBackendDesktopSessionModel } from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import {
  EditorBackendDocumentBufferSaveAllResultFormat,
  EditorBackendDocumentBufferSaveResultFormat,
  EditorBackendDocumentBufferStoreModel,
} from "../Scripts/Backend/Models/EditorBackendDocumentBufferStoreModel.js";
import { EditorBackendLanguageSessionRequestModel } from "../Scripts/Backend/Models/EditorBackendLanguageSessionRequestModel.js";
import { EditorBackendWorkspaceFolderModel } from "../Scripts/Backend/Models/EditorBackendWorkspaceFolderModel.js";
import { EditorBackendWorkspacePathModel } from "../Scripts/Backend/Models/EditorBackendWorkspacePathModel.js";
import { EditorBackendWorkspaceSnapshotModel } from "../Scripts/Backend/Models/EditorBackendWorkspaceSnapshotModel.js";

export const SelfHostedEditorElectronWorkspaceOpenResultFormat = "inscape.self-hosted-editor.electron-workspace-open-result";
export const SelfHostedEditorElectronWorkspaceReadResultFormat = "inscape.self-hosted-editor.electron-workspace-read-result";
export const SelfHostedEditorElectronAutosaveResultFormat = "inscape.self-hosted-editor.electron-autosave-result";
export const SelfHostedEditorElectronFlushResultFormat = "inscape.self-hosted-editor.electron-flush-result";
export const SelfHostedEditorElectronRecoveryActionResultFormat = "inscape.self-hosted-editor.electron-recovery-action-result";
export const SelfHostedEditorElectronWorkspaceFormatVersion = 1;

const defaultExcludedDirectoryNames = Object.freeze([
  ".git",
  ".inscape-workspace",
  "bin",
  "dist",
  "node_modules",
  "obj",
]);

export class SelfHostedEditorElectronWorkspaceSessionStore {
  #activeWorkspace = null;
  #fs;
  #lastDraftUpdatedAtMs = 0;
  #languageSessionHandlers;
  #maxDocuments;
  #now;
  #selectWorkspaceRoot;
  #sessionId;

  constructor(options = {}) {
    this.#fs = options.fsImpl || fs.promises;
    this.#languageSessionHandlers = options.languageSessionHandlers || {};
    this.#now = typeof options.now === "function" ? options.now : Date.now;
    this.#maxDocuments = normalizePositiveInteger(options.maxDocuments, 500);
    this.#selectWorkspaceRoot = options.selectWorkspaceRoot || buildStaticWorkspaceSelector(options.workspaceRoot);
    this.#sessionId = normalizeSessionId(options.sessionId || "desktop-main");
  }

  async openFolder(payload = {}) {
    let switchFlush = null;
    if (this.#activeWorkspace) {
      switchFlush = await this.flushDirtyDocuments({
        ...payload,
        trigger: "switch-workspace",
      });
      if (!canContinueAfterFlush(switchFlush)) {
        return this.#buildOpenResult({
          ok: false,
          reason: "workspace-switch-flush-blocked",
          selectedPathKind: "directory",
          switchFlush,
          workspaceRoot: this.#activeWorkspace.workspaceRoot,
        });
      }
    }

    const selectedWorkspaceRoot = await this.#selectWorkspaceRoot(payload || {});
    const workspaceRoot = normalizeWorkspaceRoot(selectedWorkspaceRoot);
    if (!workspaceRoot) {
      return this.#buildOpenResult({
        ok: false,
        reason: "workspace-open-canceled",
        selectedPathKind: "directory",
        workspaceRoot: "",
      });
    }

    const selectedPathKind = await this.#getSelectedPathKind(workspaceRoot);
    if (selectedPathKind !== "directory") {
      return this.#buildOpenResult({
        ok: false,
        reason: selectedPathKind === "file" ? "single-file-mode-rejected" : "workspace-root-unavailable",
        selectedPathKind,
        workspaceRoot,
      });
    }

    const documents = await discoverInscapeDocuments({
      fsImpl: this.#fs,
      maxDocuments: this.#maxDocuments,
      workspaceRoot,
    });
    const workspaceFolder = EditorBackendWorkspaceFolderModel.buildWorkspaceFolder({
      activeRelativePath: payload.activeRelativePath,
      documents,
      selectedPathKind,
      workspaceName: deriveWorkspaceName(workspaceRoot),
      workspaceRoot,
    });
    if (!workspaceFolder.openDecision.allowed) {
      return this.#buildOpenResult({
        ok: false,
        reason: workspaceFolder.openDecision.reason,
        selectedPathKind,
        workspaceFolder,
        workspaceRoot,
      });
    }

    const documentBuffers = await readDocumentBuffers({
      documents: workspaceFolder.documents,
      fsImpl: this.#fs,
      workspaceRoot,
    });
    const documentStore = EditorBackendDocumentBufferStoreModel.buildStore({
      activeRelativePath: workspaceFolder.activeRelativePath,
      documents: documentBuffers,
      sessionId: this.#sessionId,
      workspaceName: workspaceFolder.workspaceName,
    });
    const recoveryStatus = await scanRecoveryStatus({
      fsImpl: this.#fs,
      workspaceRoot,
    });
    this.#activeWorkspace = {
      documentStore,
      recoveryStatus,
      workspaceFolder,
      workspaceRoot,
    };
    this.#lastDraftUpdatedAtMs = 0;

    return this.#buildOpenResult({
      documentStore,
      ok: true,
      reason: "",
      selectedPathKind,
      switchFlush,
      workspaceFolder,
      workspaceRoot,
    });
  }

  listFiles() {
    if (!this.#activeWorkspace) {
      return this.#buildNotOpenWorkspaceFolder();
    }

    return this.#activeWorkspace.workspaceFolder;
  }

  listDocumentBuffers() {
    if (!this.#activeWorkspace) {
      return EditorBackendDocumentBufferStoreModel.listDocuments({
        sessionId: this.#sessionId,
      });
    }

    return EditorBackendDocumentBufferStoreModel.listDocuments(this.#activeWorkspace.documentStore);
  }

  readDocument(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildReadFailure({
        reason: "workspace-not-open",
        relativePath: payload.relativePath,
      });
    }

    const boundary = EditorBackendWorkspacePathModel.buildBoundary({
      relativePath: payload.relativePath,
      workspaceRoot: this.#activeWorkspace.workspaceRoot,
    });
    if (!boundary.allowed) {
      return buildReadFailure({
        pathBoundary: boundary,
        reason: boundary.reason,
        relativePath: boundary.relativePath,
      });
    }

    const result = EditorBackendDocumentBufferStoreModel.getDocument(
      this.#activeWorkspace.documentStore,
      {
        relativePath: boundary.relativePath,
      }
    );
    return {
      ...result,
      format: SelfHostedEditorElectronWorkspaceReadResultFormat,
      formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
      pathBoundary: boundary,
      payloadContentExposed: Boolean(result.ok),
      sessionId: this.#sessionId,
    };
  }

  async updateDraft(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildMutationFailure({
        reason: "workspace-not-open",
        relativePath: payload.relativePath,
      });
    }

    const boundary = EditorBackendWorkspacePathModel.buildBoundary({
      relativePath: payload.relativePath,
      workspaceRoot: this.#activeWorkspace.workspaceRoot,
    });
    if (!boundary.allowed) {
      return buildMutationFailure({
        pathBoundary: boundary,
        reason: boundary.reason,
        relativePath: boundary.relativePath,
      });
    }

    const result = EditorBackendDocumentBufferStoreModel.updateDocument(
      this.#activeWorkspace.documentStore,
      {
        ...payload,
        relativePath: boundary.relativePath,
      }
    );
    let recoveryWrite = null;
    if (result.ok && result.store) {
      this.#activeWorkspace = {
        ...this.#activeWorkspace,
        documentStore: result.store,
      };
      this.#lastDraftUpdatedAtMs = this.#now();
      recoveryWrite = await this.#writeRecoverySnapshot(result.document);
      this.#activeWorkspace = {
        ...this.#activeWorkspace,
        recoveryStatus: await scanRecoveryStatus({
          fsImpl: this.#fs,
          workspaceRoot: this.#activeWorkspace.workspaceRoot,
        }),
      };
    }

    return {
      ...summarizeDocumentMutationResult(
        result,
        result.store || this.#activeWorkspace.documentStore,
        this.#sessionId
      ),
      recoveryWrite,
    };
  }

  async saveDocument(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildSaveFailure({
        reason: "workspace-not-open",
        relativePath: payload.relativePath,
        sessionId: this.#sessionId,
      });
    }

    const currentStore = this.#activeWorkspace.documentStore;
    const relativePath = normalizeRelativePath(payload.relativePath || currentStore.activeRelativePath);
    const currentDocument = currentStore.documents.find((document) => document.relativePath === relativePath) || null;
    if (!currentDocument) {
      return buildSaveFailure({
        reason: "document-not-found",
        relativePath,
        sessionId: this.#sessionId,
        store: currentStore,
      });
    }

    let observedDiskTextHash = "";
    try {
      observedDiskTextHash = buildTextHash(await this.#readDocumentText(relativePath));
    } catch (error) {
      return buildSaveFailure({
        currentDocument,
        reason: "disk-read-failed",
        relativePath,
        sessionId: this.#sessionId,
        store: currentStore,
        writeError: error,
      });
    }

    const nextDiskTextHash = buildTextHash(currentDocument.text);
    const plannedSave = EditorBackendDocumentBufferStoreModel.saveDocument(currentStore, {
      ...payload,
      nextDiskTextHash,
      observedDiskTextHash,
      relativePath,
      workspaceRoot: this.#activeWorkspace.workspaceRoot,
    });
    if (!plannedSave.ok) {
      return plannedSave;
    }

    try {
      await this.#writeDocumentText(relativePath, currentDocument.text);
    } catch (error) {
      return buildSaveFailure({
        currentDocument,
        reason: "disk-write-failed",
        relativePath,
        sessionId: this.#sessionId,
        store: currentStore,
        workspaceBoundary: plannedSave.workspaceBoundary,
        writeError: error,
      });
    }

    const nextStore = EditorBackendDocumentBufferStoreModel.buildStore({
      ...currentStore,
      documents: currentStore.documents.map((document) => document.relativePath === relativePath
        ? {
          ...document,
          dirty: false,
          diskTextHash: nextDiskTextHash,
          existsOnDisk: true,
          lastLoadedUtc: new Date(this.#now()).toISOString(),
          lastSavedRevision: document.revision,
        }
        : document),
    });
    this.#resetDirtyTimestampIfClean(nextStore);
    this.#activeWorkspace = {
      ...this.#activeWorkspace,
      documentStore: nextStore,
    };
    const recoveryCleanup = await this.#cleanupRecoverySnapshot(relativePath);
    this.#activeWorkspace = {
      ...this.#activeWorkspace,
      recoveryStatus: await scanRecoveryStatus({
        fsImpl: this.#fs,
        workspaceRoot: this.#activeWorkspace.workspaceRoot,
      }),
    };

    return {
      ...plannedSave,
      document: EditorBackendDesktopSessionModel.buildDocumentBufferSummary(
        nextStore.documents.find((document) => document.relativePath === relativePath) || currentDocument
      ),
      recoveryCleanup,
      storeSummary: EditorBackendDocumentBufferStoreModel.listDocuments(nextStore),
    };
  }

  async saveAll(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildSaveAllResult({
        failedResults: [
          buildSaveFailure({
            reason: "workspace-not-open",
            sessionId: this.#sessionId,
          }),
        ],
        sessionId: this.#sessionId,
        store: null,
      });
    }

    const requestedPaths = normalizeRelativePathList(payload.relativePaths);
    const candidateDocuments = this.#activeWorkspace.documentStore.documents.filter((document) => (
      document.dirty
      && (
        requestedPaths.length === 0
        || requestedPaths.includes(document.relativePath)
      )
    ));
    const results = [];
    for (const document of candidateDocuments) {
      const result = await this.saveDocument({
        ...payload,
        baseRevision: document.revision,
        relativePath: document.relativePath,
      });
      results.push(result);
    }

    return buildSaveAllResult({
      results,
      sessionId: this.#sessionId,
      store: this.#activeWorkspace.documentStore,
    });
  }

  async runAutosave(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildAutosaveExecutionResult({
        plan: EditorBackendDocumentBufferStoreModel.buildAutosavePlan({}, payload),
        reason: "workspace-not-open",
        sessionId: this.#sessionId,
      });
    }

    const plan = EditorBackendDocumentBufferStoreModel.buildAutosavePlan(
      this.#activeWorkspace.documentStore,
      {
        ...payload,
        idleElapsedMs: payload.idleElapsedMs ?? this.#resolveDirtyIdleElapsedMs(),
        workspaceRoot: this.#activeWorkspace.workspaceRoot,
      }
    );
    const results = [];
    if (plan.ready) {
      for (const saveRequest of plan.saveRequests) {
        results.push(await this.saveDocument({
          baseRevision: saveRequest.baseRevision,
          relativePath: saveRequest.relativePath,
        }));
      }
    }

    return buildAutosaveExecutionResult({
      plan,
      results,
      sessionId: this.#sessionId,
      store: this.#activeWorkspace.documentStore,
    });
  }

  async flushDirtyDocuments(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildFlushExecutionResult({
        plan: EditorBackendDocumentBufferStoreModel.buildFlushPlan({}, payload),
        reason: "workspace-not-open",
        sessionId: this.#sessionId,
      });
    }

    const trigger = payload.trigger || payload.operation || "manual-save";
    const plan = EditorBackendDocumentBufferStoreModel.buildFlushPlan(
      this.#activeWorkspace.documentStore,
      {
        ...payload,
        trigger,
        workspaceRoot: this.#activeWorkspace.workspaceRoot,
      }
    );
    const results = [];
    for (const flushRequest of plan.flushRequests) {
      results.push(await this.saveDocument({
        baseRevision: flushRequest.baseRevision,
        relativePath: flushRequest.relativePath,
      }));
    }

    const finalPlan = EditorBackendDocumentBufferStoreModel.buildFlushPlan(
      this.#activeWorkspace.documentStore,
      {
        ...payload,
        saveResults: results,
        trigger,
        workspaceRoot: this.#activeWorkspace.workspaceRoot,
      }
    );
    return buildFlushExecutionResult({
      finalPlan,
      plan,
      results,
      sessionId: this.#sessionId,
      store: this.#activeWorkspace.documentStore,
    });
  }

  async restoreRecoverySnapshot(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildRecoveryActionResult({
        action: "restore",
        reason: "workspace-not-open",
        relativePath: payload.relativePath,
        sessionId: this.#sessionId,
      });
    }

    const snapshotResult = await this.#readRecoverySnapshotPayload(payload);
    if (!snapshotResult.ok) {
      return buildRecoveryActionResult({
        ...snapshotResult,
        action: "restore",
        sessionId: this.#sessionId,
      });
    }

    const { relativePath, snapshot } = snapshotResult;
    const restoredText = String(snapshot.text || "");
    await this.#writeDocumentText(relativePath, restoredText);
    const currentStore = this.#activeWorkspace.documentStore;
    const currentDocument = currentStore.documents.find((document) => document.relativePath === relativePath) || null;
    const restoredRevision = Math.max(
      currentDocument?.revision || 0,
      Number(snapshot.documentRevision || snapshot.revision || 0)
    ) + 1;
    const restoredDocument = {
      ...(currentDocument || {}),
      active: currentDocument?.active ?? currentStore.activeRelativePath === relativePath,
      dirty: false,
      diskTextHash: buildTextHash(restoredText),
      existsOnDisk: true,
      lastLoadedUtc: new Date(this.#now()).toISOString(),
      lastSavedRevision: restoredRevision,
      relativePath,
      revision: restoredRevision,
      text: restoredText,
    };
    const nextDocuments = currentStore.documents.some((document) => document.relativePath === relativePath)
      ? currentStore.documents.map((document) => document.relativePath === relativePath ? restoredDocument : document)
      : [...currentStore.documents, restoredDocument];
    const nextStore = EditorBackendDocumentBufferStoreModel.buildStore({
      ...currentStore,
      activeRelativePath: relativePath,
      documents: nextDocuments,
    });
    this.#resetDirtyTimestampIfClean(nextStore);
    this.#activeWorkspace = {
      ...this.#activeWorkspace,
      documentStore: nextStore,
    };
    const recoveryCleanup = await this.#cleanupRecoverySnapshot(relativePath);
    const recoveryStatus = await this.#refreshRecoveryStatus();

    return buildRecoveryActionResult({
      action: "restore",
      document: EditorBackendDesktopSessionModel.buildDocumentBufferSummary(restoredDocument),
      ok: true,
      reason: "recovery-restored",
      recoveryCleanup,
      recoveryStatus,
      relativePath,
      sessionId: this.#sessionId,
      snapshotRelativePath: snapshotResult.snapshotRelativePath,
      store: nextStore,
    });
  }

  async discardRecoverySnapshot(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildRecoveryActionResult({
        action: "discard",
        reason: "workspace-not-open",
        relativePath: payload.relativePath,
        sessionId: this.#sessionId,
      });
    }

    const snapshotResult = await this.#readRecoverySnapshotPayload(payload);
    if (!snapshotResult.ok) {
      return buildRecoveryActionResult({
        ...snapshotResult,
        action: "discard",
        sessionId: this.#sessionId,
      });
    }

    const recoveryCleanup = await this.#cleanupRecoverySnapshot(snapshotResult.relativePath);
    const recoveryStatus = await this.#refreshRecoveryStatus();
    return buildRecoveryActionResult({
      action: "discard",
      ok: true,
      reason: "recovery-discarded",
      recoveryCleanup,
      recoveryStatus,
      relativePath: snapshotResult.relativePath,
      sessionId: this.#sessionId,
      snapshotRelativePath: snapshotResult.snapshotRelativePath,
      store: this.#activeWorkspace.documentStore,
    });
  }

  async markRecoverySnapshotLater(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildRecoveryActionResult({
        action: "later",
        reason: "workspace-not-open",
        relativePath: payload.relativePath,
        sessionId: this.#sessionId,
      });
    }

    const snapshotResult = await this.#readRecoverySnapshotPayload(payload);
    if (!snapshotResult.ok) {
      return buildRecoveryActionResult({
        ...snapshotResult,
        action: "later",
        sessionId: this.#sessionId,
      });
    }

    const recoveryStatus = EditorBackendDesktopSessionModel.buildRecoveryStatus({
      items: this.#activeWorkspace.recoveryStatus.items.map((item) => item.relativePath === snapshotResult.relativePath
        ? {
          ...item,
          actionState: "later",
        }
        : item),
    });
    this.#activeWorkspace = {
      ...this.#activeWorkspace,
      recoveryStatus,
    };
    return buildRecoveryActionResult({
      action: "later",
      ok: true,
      reason: "recovery-kept-for-later",
      recoveryStatus,
      relativePath: snapshotResult.relativePath,
      sessionId: this.#sessionId,
      snapshotRelativePath: snapshotResult.snapshotRelativePath,
      store: this.#activeWorkspace.documentStore,
    });
  }

  getProjectSessionStatus(payload = {}) {
    if (!this.#activeWorkspace) {
      return buildProjectSessionStatusFromPayload(payload, {
        sessionId: this.#sessionId,
      });
    }

    const { documentStore, workspaceFolder, workspaceRoot } = this.#activeWorkspace;
    return EditorBackendDesktopSessionModel.buildProjectSession({
      documents: documentStore.documents,
      recoveryStatus: this.#activeWorkspace.recoveryStatus,
      sessionId: documentStore.sessionId || this.#sessionId,
      workspace: {
        activeRelativePath: documentStore.activeRelativePath,
        revision: documentStore.revision,
        workspaceName: workspaceFolder.workspaceName,
        workspaceRoot,
      },
    });
  }

  async runLanguageSessionCommand(kind, payload = {}) {
    const requestPayload = this.buildLanguageSessionRequest(kind, payload);
    const handler = this.#languageSessionHandlers[kind];
    if (typeof handler !== "function") {
      throw new Error(`SelfHostedEditor Electron language session handler is not configured: ${kind}`);
    }

    return await handler(requestPayload);
  }

  buildLanguageSessionRequest(kind, payload = {}) {
    if (!this.#activeWorkspace) {
      throw new Error("SelfHostedEditor Electron language session requires an open workspace.");
    }

    const workspaceSnapshot = EditorBackendWorkspaceSnapshotModel.buildSnapshot({
      activeRelativePath: payload.activeRelativePath,
      store: this.#activeWorkspace.documentStore,
    });
    const activeDocumentRequest = EditorBackendWorkspaceSnapshotModel.buildActiveDocumentRequest(workspaceSnapshot);
    const languageRequest = EditorBackendLanguageSessionRequestModel.build({
      kind,
      request: {
        ...payload,
        activeRelativePath: activeDocumentRequest.activeRelativePath,
        documentRevision: activeDocumentRequest.documentRevision,
        scriptText: activeDocumentRequest.scriptText,
        workspace: workspaceSnapshot,
      },
      sessionId: payload.sessionId || this.#sessionId,
    });
    return EditorBackendLanguageSessionRequestModel.toDevHostPayload(languageRequest);
  }

  #buildOpenResult({
    documentStore = null,
    ok,
    reason,
    selectedPathKind,
    switchFlush = null,
    workspaceFolder = null,
    workspaceRoot,
  }) {
    const folder = workspaceFolder || EditorBackendWorkspaceFolderModel.buildWorkspaceFolder({
      selectedPathKind,
      workspaceName: deriveWorkspaceName(workspaceRoot),
      workspaceRoot,
    });
    const storeSummary = documentStore
      ? EditorBackendDocumentBufferStoreModel.listDocuments(documentStore)
      : EditorBackendDocumentBufferStoreModel.listDocuments({
        sessionId: this.#sessionId,
        workspaceName: folder.workspaceName,
      });

    return {
      documentBufferList: storeSummary,
      format: SelfHostedEditorElectronWorkspaceOpenResultFormat,
      formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
      ok: Boolean(ok),
      payloadContentExposed: false,
      projectSession: ok ? this.getProjectSessionStatus() : null,
      reason,
      sessionId: this.#sessionId,
      switchFlush,
      workspace: folder,
    };
  }

  #buildNotOpenWorkspaceFolder() {
    return EditorBackendWorkspaceFolderModel.buildWorkspaceFolder({
      selectedPathKind: "directory",
      workspaceRoot: "",
    });
  }

  async #getSelectedPathKind(workspaceRoot) {
    try {
      const stats = await this.#fs.stat(workspaceRoot);
      if (stats.isDirectory()) {
        return "directory";
      }

      if (stats.isFile()) {
        return "file";
      }
    } catch {
      return "missing";
    }

    return "unsupported";
  }

  async #readDocumentText(relativePath) {
    const absolutePath = resolveWorkspacePath(this.#activeWorkspace.workspaceRoot, relativePath);
    return stripUtf8Bom(await this.#fs.readFile(absolutePath, "utf8"));
  }

  async #writeDocumentText(relativePath, text) {
    const absolutePath = resolveWorkspacePath(this.#activeWorkspace.workspaceRoot, relativePath);
    await this.#fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await this.#fs.writeFile(absolutePath, String(text || ""), "utf8");
  }

  async #writeRecoverySnapshot(document) {
    if (!document) {
      return null;
    }

    const recoveryPlan = EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan(
      this.#activeWorkspace.documentStore,
      {
        relativePaths: [document.relativePath],
        snapshotModifiedUtc: new Date(this.#now()).toISOString(),
        workspaceRoot: this.#activeWorkspace.workspaceRoot,
      }
    );
    const snapshot = recoveryPlan.snapshotWrites.find((item) => item.relativePath === document.relativePath) || null;
    if (!snapshot) {
      return {
        ok: false,
        reason: recoveryPlan.skippedDocuments[0]?.reason || "recovery-snapshot-not-created",
        relativePath: document.relativePath,
      };
    }

    const absolutePath = resolveWorkspacePath(this.#activeWorkspace.workspaceRoot, snapshot.snapshotRelativePath);
    await this.#fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await this.#fs.writeFile(absolutePath, JSON.stringify(snapshot, null, 2), "utf8");

    return {
      contentHash: snapshot.contentHash,
      documentRevision: snapshot.documentRevision,
      ok: true,
      payloadContentExposed: false,
      reason: "dirty-buffer-recovery-snapshot",
      relativePath: snapshot.relativePath,
      snapshotModifiedUtc: snapshot.snapshotModifiedUtc,
      snapshotRelativePath: snapshot.snapshotRelativePath,
    };
  }

  async #cleanupRecoverySnapshot(relativePath) {
    const snapshotRelativePath = buildRecoverySnapshotRelativePath(relativePath);
    const absolutePath = resolveWorkspacePath(this.#activeWorkspace.workspaceRoot, snapshotRelativePath);
    await this.#fs.rm(absolutePath, { force: true });
    return {
      ok: true,
      payloadContentExposed: false,
      reason: "saved-document-recovery-cleanup",
      relativePath: normalizeRelativePath(relativePath),
      snapshotRelativePath,
    };
  }

  async #readRecoverySnapshotPayload(payload = {}) {
    const boundary = EditorBackendWorkspacePathModel.buildBoundary({
      relativePath: payload.relativePath,
      workspaceRoot: this.#activeWorkspace.workspaceRoot,
    });
    if (!boundary.allowed) {
      return {
        ok: false,
        pathBoundary: boundary,
        reason: boundary.reason,
        relativePath: boundary.relativePath,
      };
    }

    const relativePath = boundary.relativePath;
    const snapshotRelativePath = buildRecoverySnapshotRelativePath(relativePath);
    const absolutePath = resolveWorkspacePath(this.#activeWorkspace.workspaceRoot, snapshotRelativePath);
    let snapshot = null;
    try {
      snapshot = JSON.parse(await this.#fs.readFile(absolutePath, "utf8"));
    } catch {
      return {
        ok: false,
        reason: "recovery-snapshot-not-found",
        relativePath,
        snapshotRelativePath,
      };
    }

    if (normalizeRelativePath(snapshot.relativePath) !== relativePath) {
      return {
        ok: false,
        reason: "recovery-snapshot-path-mismatch",
        relativePath,
        snapshotRelativePath,
      };
    }

    const contentHash = String(snapshot.contentHash || "");
    if (payload.contentHash && String(payload.contentHash) !== contentHash) {
      return {
        contentHash,
        ok: false,
        reason: "recovery-snapshot-hash-mismatch",
        relativePath,
        snapshotRelativePath,
      };
    }

    if (typeof snapshot.text !== "string") {
      return {
        ok: false,
        reason: "recovery-snapshot-text-missing",
        relativePath,
        snapshotRelativePath,
      };
    }

    return {
      contentHash,
      ok: true,
      reason: "",
      relativePath,
      snapshot,
      snapshotRelativePath,
    };
  }

  async #refreshRecoveryStatus() {
    const recoveryStatus = await scanRecoveryStatus({
      fsImpl: this.#fs,
      workspaceRoot: this.#activeWorkspace.workspaceRoot,
    });
    this.#activeWorkspace = {
      ...this.#activeWorkspace,
      recoveryStatus,
    };
    return recoveryStatus;
  }

  #resolveDirtyIdleElapsedMs() {
    if (!this.#activeWorkspace || this.#lastDraftUpdatedAtMs <= 0) {
      return 0;
    }

    return Math.max(0, this.#now() - this.#lastDraftUpdatedAtMs);
  }

  #resetDirtyTimestampIfClean(store) {
    if (!store?.documents?.some((document) => document.dirty)) {
      this.#lastDraftUpdatedAtMs = 0;
    }
  }
}

export function createSelfHostedEditorElectronWorkspaceSessionStore(options = {}) {
  return new SelfHostedEditorElectronWorkspaceSessionStore(options);
}

export function buildProjectSessionStatusFromPayload(payload = {}, options = {}) {
  const workspace = payload.workspace || {};
  const documents = normalizeWorkspaceDocuments(workspace);
  return EditorBackendDesktopSessionModel.buildProjectSession({
    documents,
    sessionId: payload.sessionId || options.sessionId || "desktop-main",
    workspace: {
      activeRelativePath: workspace.activeRelativePath
        || workspace.currentFilePath
        || workspace.filePath
        || documents.find((document) => document.active)?.relativePath
        || documents[0]?.relativePath
        || "",
      revision: workspace.revision || workspace.documentRevision || workspace.workspaceRevision || 1,
      workspaceName: workspace.workspaceName || workspace.name || "workspace",
      workspaceRoot: workspace.workspaceRoot || workspace.rootPath || workspace.root || "",
    },
  });
}

async function discoverInscapeDocuments({
  fsImpl,
  maxDocuments,
  workspaceRoot,
}) {
  const documents = [];

  async function walk(relativeDirectory = "") {
    if (documents.length >= maxDocuments) {
      return;
    }

    const absoluteDirectory = resolveWorkspacePath(workspaceRoot, relativeDirectory);
    const entries = await fsImpl.readdir(absoluteDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

    for (const entry of entries) {
      if (documents.length >= maxDocuments) {
        return;
      }

      const relativePath = joinRelativePath(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        if (!isExcludedWorkspaceDirectory(relativePath, entry.name)) {
          await walk(relativePath);
        }
        continue;
      }

      if (entry.isFile() && relativePath.toLowerCase().endsWith(".inscape")) {
        documents.push({
          existsOnDisk: true,
          relativePath,
        });
      }
    }
  }

  await walk();
  return documents;
}

async function readDocumentBuffers({
  documents,
  fsImpl,
  workspaceRoot,
}) {
  const buffers = [];
  for (const document of documents) {
    const boundary = EditorBackendWorkspacePathModel.buildBoundary({
      relativePath: document.relativePath,
      workspaceRoot,
    });
    if (!boundary.allowed) {
      continue;
    }

    const absolutePath = resolveWorkspacePath(workspaceRoot, boundary.relativePath);
    const [text, stats] = await Promise.all([
      fsImpl.readFile(absolutePath, "utf8"),
      fsImpl.stat(absolutePath),
    ]);
    buffers.push({
      active: Boolean(document.active),
      dirty: false,
      diskTextHash: buildTextHash(stripUtf8Bom(text)),
      existsOnDisk: true,
      lastLoadedUtc: stats.mtime instanceof Date ? stats.mtime.toISOString() : "",
      relativePath: boundary.relativePath,
      revision: 1,
      text: stripUtf8Bom(text),
    });
  }

  return buffers;
}

function buildOpenFailureCommon({
  pathBoundary = null,
  reason,
  relativePath = "",
}) {
  return {
    document: null,
    format: SelfHostedEditorElectronWorkspaceReadResultFormat,
    formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
    ok: false,
    pathBoundary,
    payloadContentExposed: false,
    reason,
    relativePath: normalizeRelativePath(relativePath),
  };
}

function buildReadFailure(failure = {}) {
  return buildOpenFailureCommon(failure);
}

function buildMutationFailure({
  pathBoundary = null,
  reason,
  relativePath = "",
}) {
  return {
    document: null,
    ok: false,
    pathBoundary,
    reason,
    relativePath: normalizeRelativePath(relativePath),
  };
}

function buildSaveFailure({
  currentDocument = null,
  reason,
  relativePath = "",
  sessionId,
  store = null,
  workspaceBoundary = null,
  writeError = null,
}) {
  const normalizedRelativePath = normalizeRelativePath(relativePath || currentDocument?.relativePath);
  const revision = currentDocument?.revision || store?.revision || 1;
  const saveStatus = EditorBackendDesktopSessionModel.buildSaveStatus({
    dirty: Boolean(currentDocument?.dirty),
    lastError: {
      code: reason,
      message: writeError ? `${reason}: ${String(writeError.message || writeError).slice(0, 160)}` : `Document save rejected: ${reason}`,
    },
    lastSavedRevision: currentDocument?.lastSavedRevision || 0,
    relativePath: normalizedRelativePath,
    revision,
    state: "error",
  });
  return {
    currentRevision: revision,
    document: currentDocument
      ? EditorBackendDesktopSessionModel.buildDocumentBufferSummary(currentDocument)
      : null,
    format: EditorBackendDocumentBufferSaveResultFormat,
    formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
    ok: false,
    operation: "save-document",
    payloadContentExposed: false,
    reason,
    relativePath: normalizedRelativePath,
    saveStatus,
    savedRevision: 0,
    sessionId,
    storeSummary: store ? EditorBackendDocumentBufferStoreModel.listDocuments(store) : null,
    workspaceBoundary,
    workspaceName: store?.workspaceName || "workspace",
    writeTarget: workspaceBoundary?.writeTarget || null,
  };
}

function buildSaveAllResult({
  failedResults = [],
  results = [],
  sessionId,
  store,
}) {
  const allResults = [...results, ...failedResults];
  const failed = allResults.filter((result) => !result.ok);
  const saved = allResults.filter((result) => result.ok);
  const storeSummary = store ? EditorBackendDocumentBufferStoreModel.listDocuments(store) : null;
  const activeDocument = store?.documents?.find((document) => document.relativePath === store.activeRelativePath)
    || store?.documents?.[0]
    || null;
  return {
    failedCount: failed.length,
    format: EditorBackendDocumentBufferSaveAllResultFormat,
    formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
    ok: failed.length === 0,
    operation: "save-all",
    payloadContentExposed: false,
    reason: failed.length > 0 ? "one-or-more-documents-failed" : "",
    results: allResults.map(omitStoreSummary),
    saveStatus: failed[0]?.saveStatus || EditorBackendDesktopSessionModel.buildSaveStatus({
      dirty: Boolean(store?.documents?.some((document) => document.dirty)),
      lastSavedRevision: saved.length > 0
        ? Math.max(...saved.map((result) => result.savedRevision || 0))
        : activeDocument?.lastSavedRevision || activeDocument?.revision || store?.revision || 1,
      relativePath: activeDocument?.relativePath || "",
      revision: activeDocument?.revision || store?.revision || 1,
      state: "saved",
    }),
    savedCount: saved.length,
    sessionId,
    storeSummary,
    workspaceName: store?.workspaceName || "workspace",
  };
}

function buildAutosaveExecutionResult({
  plan,
  reason = "",
  results = [],
  sessionId,
  store = null,
}) {
  const failed = results.filter((result) => !result.ok);
  const saved = results.filter((result) => result.ok);
  return {
    autosavePlan: plan,
    failedCount: failed.length,
    format: SelfHostedEditorElectronAutosaveResultFormat,
    formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
    ok: failed.length === 0 && reason !== "workspace-not-open",
    operation: "autosave",
    payloadContentExposed: false,
    reason: reason || (failed.length > 0 ? "one-or-more-documents-failed" : ""),
    results: results.map(omitStoreSummary),
    savedCount: saved.length,
    sessionId,
    storeSummary: store ? EditorBackendDocumentBufferStoreModel.listDocuments(store) : null,
  };
}

function buildFlushExecutionResult({
  finalPlan = null,
  plan,
  reason = "",
  results = [],
  sessionId,
  store = null,
}) {
  const failed = results.filter((result) => !result.ok);
  const saved = results.filter((result) => result.ok);
  const effectiveFinalPlan = finalPlan || plan;
  return {
    failedCount: failed.length,
    finalPlan: effectiveFinalPlan,
    flushPlan: plan,
    format: SelfHostedEditorElectronFlushResultFormat,
    formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
    ok: failed.length === 0
      && reason !== "workspace-not-open"
      && effectiveFinalPlan.blockingIssues.length === 0
      && effectiveFinalPlan.visibleFailures.length === 0,
    operation: "flush",
    payloadContentExposed: false,
    reason: reason || (failed.length > 0 ? "one-or-more-documents-failed" : ""),
    results: results.map(omitStoreSummary),
    savedCount: saved.length,
    sessionId,
    storeSummary: store ? EditorBackendDocumentBufferStoreModel.listDocuments(store) : null,
    trigger: effectiveFinalPlan.trigger,
  };
}

function buildRecoveryActionResult({
  action,
  contentHash = "",
  document = null,
  ok = false,
  pathBoundary = null,
  reason = "",
  recoveryCleanup = null,
  recoveryStatus = null,
  relativePath = "",
  sessionId,
  snapshotRelativePath = "",
  store = null,
}) {
  return {
    action,
    contentHash,
    document,
    format: SelfHostedEditorElectronRecoveryActionResultFormat,
    formatVersion: SelfHostedEditorElectronWorkspaceFormatVersion,
    ok: Boolean(ok),
    operation: `recovery.${action || "unknown"}`,
    pathBoundary,
    payloadContentExposed: false,
    reason,
    recoveryCleanup,
    recoveryStatus,
    relativePath: normalizeRelativePath(relativePath),
    sessionId,
    snapshotRelativePath,
    storeSummary: store ? EditorBackendDocumentBufferStoreModel.listDocuments(store) : null,
  };
}

async function scanRecoveryStatus({
  fsImpl,
  workspaceRoot,
}) {
  const recoveryRoot = resolveWorkspacePath(workspaceRoot, ".inscape-workspace/recovery");
  const items = [];

  async function walk(relativeDirectory = "") {
    const absoluteDirectory = path.join(recoveryRoot, ...normalizeRelativePath(relativeDirectory).split("/").filter(Boolean));
    let entries = [];
    try {
      entries = await fsImpl.readdir(absoluteDirectory, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath = joinRelativePath(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        await walk(relativePath);
        continue;
      }

      if (!entry.isFile() || !relativePath.endsWith(".snapshot.json")) {
        continue;
      }

      const snapshot = await readRecoverySnapshot({
        absolutePath: path.join(absoluteDirectory, entry.name),
        fsImpl,
        workspaceRoot,
      });
      if (snapshot) {
        items.push(snapshot);
      }
    }
  }

  await walk();
  return EditorBackendDesktopSessionModel.buildRecoveryStatus({
    items,
  });
}

async function readRecoverySnapshot({
  absolutePath,
  fsImpl,
  workspaceRoot,
}) {
  try {
    const snapshot = JSON.parse(await fsImpl.readFile(absolutePath, "utf8"));
    const relativePath = normalizeRelativePath(snapshot.relativePath);
    const boundary = EditorBackendWorkspacePathModel.buildBoundary({
      relativePath,
      workspaceRoot,
    });
    if (!boundary.allowed) {
      return null;
    }

    const expectedAbsolutePath = resolveWorkspacePath(
      workspaceRoot,
      buildRecoverySnapshotRelativePath(relativePath)
    );
    if (path.resolve(absolutePath) !== path.resolve(expectedAbsolutePath)) {
      return null;
    }

    return {
      contentHash: snapshot.contentHash,
      diskModifiedUtc: snapshot.diskModifiedUtc,
      relativePath,
      revision: snapshot.documentRevision || snapshot.revision,
      snapshotModifiedUtc: snapshot.snapshotModifiedUtc,
    };
  } catch {
    return null;
  }
}

function summarizeDocumentMutationResult(result, store, sessionId) {
  const storeSummary = EditorBackendDocumentBufferStoreModel.listDocuments({
    ...store,
    sessionId: store?.sessionId || sessionId,
  });
  return {
    baseRevision: result.baseRevision,
    currentRevision: result.currentRevision || result.document?.revision || 0,
    document: result.document
      ? EditorBackendDesktopSessionModel.buildDocumentBufferSummary(result.document)
      : null,
    ok: Boolean(result.ok),
    payloadContentExposed: false,
    reason: result.reason || "",
    relativePath: result.relativePath || result.document?.relativePath || "",
    sessionId,
    storeSummary,
  };
}

function omitStoreSummary(result) {
  const {
    storeSummary,
    ...summary
  } = result;
  return summary;
}

function canContinueAfterFlush(result) {
  if (!result || result.ok !== true) {
    return false;
  }

  const finalPlan = result.finalPlan || result.flushPlan || {};
  return finalPlan.continuationBlocked !== true
    && (finalPlan.blockingIssues || []).length === 0
    && (finalPlan.visibleFailures || []).length === 0;
}

function normalizeWorkspaceDocuments(workspace = {}) {
  const documents = Array.isArray(workspace.documents) ? workspace.documents : [];
  const activeRelativePath = String(
    workspace.activeRelativePath
      || workspace.currentFilePath
      || workspace.filePath
      || documents[0]?.relativePath
      || ""
  ).replace(/\\/g, "/");

  return documents
    .map((document) => ({
      active: String(document.relativePath || "").replace(/\\/g, "/") === activeRelativePath,
      dirty: Boolean(document.dirty),
      existsOnDisk: document.existsOnDisk !== false,
      relativePath: document.relativePath,
      revision: document.revision || workspace.revision || 1,
      text: "",
    }))
    .filter((document) => document.relativePath);
}

function buildStaticWorkspaceSelector(workspaceRoot) {
  return async () => workspaceRoot || "";
}

function buildTextHash(text) {
  return `sha256:${crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex")}`;
}

function deriveWorkspaceName(workspaceRoot) {
  const normalizedRoot = normalizeWorkspaceRoot(workspaceRoot);
  return normalizedRoot.split("/").filter(Boolean).pop() || "workspace";
}

function isExcludedWorkspaceDirectory(relativePath, directoryName) {
  const normalizedName = String(directoryName || "").toLowerCase();
  if (defaultExcludedDirectoryNames.includes(normalizedName)) {
    return true;
  }

  return normalizeRelativePath(relativePath).startsWith(".inscape-workspace/");
}

function joinRelativePath(relativeDirectory, name) {
  return normalizeRelativePath(relativeDirectory ? `${relativeDirectory}/${name}` : name);
}

function buildRecoverySnapshotRelativePath(relativePath) {
  return `.inscape-workspace/recovery/${normalizeRelativePath(relativePath)}.snapshot.json`;
}

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/g, "");
}

function normalizeRelativePathList(relativePaths) {
  if (!Array.isArray(relativePaths)) {
    return [];
  }

  return [...new Set(relativePaths.map(normalizeRelativePath).filter(Boolean))];
}

function normalizeSessionId(sessionId) {
  return String(sessionId || "desktop-main")
    .trim()
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .slice(0, 120) || "desktop-main";
}

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function resolveWorkspacePath(workspaceRoot, relativePath = "") {
  const root = path.resolve(workspaceRoot);
  const segments = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  return path.resolve(root, ...segments);
}

function stripUtf8Bom(text) {
  return String(text || "").replace(/^\uFEFF/, "");
}

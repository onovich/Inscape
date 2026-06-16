import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { EditorBackendDesktopSessionModel } from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import { EditorBackendDocumentBufferStoreModel } from "../Scripts/Backend/Models/EditorBackendDocumentBufferStoreModel.js";
import { EditorBackendWorkspaceFolderModel } from "../Scripts/Backend/Models/EditorBackendWorkspaceFolderModel.js";
import { EditorBackendWorkspacePathModel } from "../Scripts/Backend/Models/EditorBackendWorkspacePathModel.js";

export const SelfHostedEditorElectronWorkspaceOpenResultFormat = "inscape.self-hosted-editor.electron-workspace-open-result";
export const SelfHostedEditorElectronWorkspaceReadResultFormat = "inscape.self-hosted-editor.electron-workspace-read-result";
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
  #maxDocuments;
  #selectWorkspaceRoot;
  #sessionId;

  constructor(options = {}) {
    this.#fs = options.fsImpl || fs.promises;
    this.#maxDocuments = normalizePositiveInteger(options.maxDocuments, 500);
    this.#selectWorkspaceRoot = options.selectWorkspaceRoot || buildStaticWorkspaceSelector(options.workspaceRoot);
    this.#sessionId = normalizeSessionId(options.sessionId || "desktop-main");
  }

  async openFolder(payload = {}) {
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
    this.#activeWorkspace = {
      documentStore,
      workspaceFolder,
      workspaceRoot,
    };

    return this.#buildOpenResult({
      documentStore,
      ok: true,
      reason: "",
      selectedPathKind,
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

  updateDraft(payload = {}) {
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
    if (result.ok && result.store) {
      this.#activeWorkspace = {
        ...this.#activeWorkspace,
        documentStore: result.store,
      };
    }

    return summarizeDocumentMutationResult(
      result,
      result.store || this.#activeWorkspace.documentStore,
      this.#sessionId
    );
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
      sessionId: documentStore.sessionId || this.#sessionId,
      workspace: {
        activeRelativePath: documentStore.activeRelativePath,
        revision: documentStore.revision,
        workspaceName: workspaceFolder.workspaceName,
        workspaceRoot,
      },
    });
  }

  #buildOpenResult({
    documentStore = null,
    ok,
    reason,
    selectedPathKind,
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

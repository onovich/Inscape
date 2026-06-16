import { EditorBackendWorkspacePathModel } from "./EditorBackendWorkspacePathModel.js";

export const EditorBackendWorkspaceFolderFormat = "inscape.self-hosted-editor.workspace-folder";
export const EditorBackendWorkspaceFolderDocumentFormat = "inscape.self-hosted-editor.workspace-folder-document";
export const EditorBackendWorkspaceFolderOpenDecisionFormat = "inscape.self-hosted-editor.workspace-folder-open-decision";
export const EditorBackendWorkspaceFolderFormatVersion = 1;

export class EditorBackendWorkspaceFolderModel {
  static buildOpenDecision({
    selectedPathKind = "directory",
    workspaceKind = "",
    workspaceRoot = "",
  } = {}) {
    const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
    const normalizedPathKind = normalizeSelectedPathKind(selectedPathKind || workspaceKind);
    const reason = getOpenRejectionReason(normalizedWorkspaceRoot, normalizedPathKind);

    return {
      allowed: !reason,
      format: EditorBackendWorkspaceFolderOpenDecisionFormat,
      formatVersion: EditorBackendWorkspaceFolderFormatVersion,
      mode: "directory-workspace",
      reason,
      selectedPathKind: normalizedPathKind,
      workspaceRoot: normalizedWorkspaceRoot,
    };
  }

  static buildWorkspaceFolder({
    activeRelativePath = "",
    documents = [],
    selectedPathKind = "directory",
    workspaceKind = "",
    workspaceName = "",
    workspaceRoot = "",
  } = {}) {
    const openDecision = this.buildOpenDecision({
      selectedPathKind,
      workspaceKind,
      workspaceRoot,
    });
    const sourceDocuments = Array.isArray(documents) ? documents : [];
    const documentDecisions = openDecision.allowed
      ? sourceDocuments.map((document) => buildWorkspaceDocumentDecision(document, openDecision.workspaceRoot))
      : [];
    const acceptedDocuments = documentDecisions
      .filter((document) => document.allowed)
      .map((document) => document.entry);
    const activeDocumentPath = resolveActiveDocumentPath({
      activeRelativePath,
      documents: acceptedDocuments,
      workspaceRoot: openDecision.workspaceRoot,
    });

    return {
      activeRelativePath: activeDocumentPath,
      documentCount: acceptedDocuments.length,
      documents: acceptedDocuments.map((document) => ({
        ...document,
        active: document.relativePath === activeDocumentPath,
      })),
      format: EditorBackendWorkspaceFolderFormat,
      formatVersion: EditorBackendWorkspaceFolderFormatVersion,
      openDecision,
      rejectedDocuments: documentDecisions
        .filter((document) => !document.allowed)
        .map((document) => document.rejection),
      workspaceName: normalizeWorkspaceName(workspaceName || openDecision.workspaceRoot),
      workspaceRoot: openDecision.workspaceRoot,
    };
  }
}

function buildWorkspaceDocumentDecision(document, workspaceRoot) {
  const pathBoundary = EditorBackendWorkspacePathModel.buildBoundary({
    relativePath: document?.relativePath,
    workspaceRoot,
  });
  if (!pathBoundary.allowed) {
    return buildRejectedDocument(pathBoundary, pathBoundary.reason);
  }

  if (!pathBoundary.relativePath.toLowerCase().endsWith(".inscape")) {
    return buildRejectedDocument(pathBoundary, "workspace-document-not-inscape");
  }

  return {
    allowed: true,
    entry: {
      active: false,
      existsOnDisk: document?.existsOnDisk !== false,
      format: EditorBackendWorkspaceFolderDocumentFormat,
      formatVersion: EditorBackendWorkspaceFolderFormatVersion,
      pathBoundary,
      relativePath: pathBoundary.relativePath,
      title: normalizeDocumentTitle(document?.title || deriveDocumentTitle(pathBoundary.relativePath)),
    },
  };
}

function buildRejectedDocument(pathBoundary, reason) {
  return {
    allowed: false,
    rejection: {
      allowed: false,
      pathBoundary,
      reason,
      relativePath: pathBoundary.relativePath,
    },
  };
}

function deriveDocumentTitle(relativePath) {
  const fileName = String(relativePath || "").split("/").pop() || "";
  return fileName.replace(/\.inscape$/i, "") || "Untitled";
}

function getOpenRejectionReason(workspaceRoot, selectedPathKind) {
  if (!workspaceRoot) {
    return "workspace-root-required";
  }

  if (selectedPathKind === "file") {
    return "single-file-mode-rejected";
  }

  if (selectedPathKind !== "directory") {
    return "workspace-folder-required";
  }

  return "";
}

function normalizeDocumentTitle(title) {
  return String(title || "Untitled").trim() || "Untitled";
}

function normalizeSelectedPathKind(selectedPathKind) {
  const normalized = String(selectedPathKind || "directory").trim().toLowerCase();
  return normalized || "directory";
}

function normalizeWorkspaceName(workspaceName) {
  const normalized = String(workspaceName || "workspace").trim();
  if (!normalized) {
    return "workspace";
  }

  return normalized.split(/[\\/]/).filter(Boolean).pop() || normalized;
}

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function resolveActiveDocumentPath({
  activeRelativePath,
  documents,
  workspaceRoot,
}) {
  const activeBoundary = EditorBackendWorkspacePathModel.buildBoundary({
    relativePath: activeRelativePath,
    workspaceRoot,
  });
  if (
    activeBoundary.allowed
    && documents.some((document) => document.relativePath === activeBoundary.relativePath)
  ) {
    return activeBoundary.relativePath;
  }

  return documents[0]?.relativePath || "";
}

import { EditorBackendDesktopSessionModel } from "./EditorBackendDesktopSessionModel.js";
import { EditorBackendSettingsDefaults } from "./EditorBackendSettingsSchemaModel.js";

export const EditorBackendWorkspaceAssetImportPlanFormat = "inscape.self-hosted-editor.workspace-asset-import-plan";
export const EditorBackendWorkspaceAssetImportPlanFormatVersion = 1;

const supportedAssetKindPolicies = Object.freeze([
  Object.freeze({
    directory: "images",
    extensions: Object.freeze([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]),
    kind: "image",
  }),
  Object.freeze({
    directory: "audio",
    extensions: Object.freeze([".mp3", ".wav", ".ogg", ".flac", ".m4a"]),
    kind: "audio",
  }),
  Object.freeze({
    directory: "data",
    extensions: Object.freeze([".csv"]),
    kind: "data",
  }),
]);

export class EditorBackendWorkspaceAssetImportPlanModel {
  static buildPlan({
    existingAssetRelativePaths = [],
    imports = [],
    settingsSummary = null,
    workspaceRoot = "",
  } = {}) {
    const settings = normalizeAssetImportSettings(settingsSummary);
    const importRequests = normalizeImportRequests(imports);
    const existingTargets = new Set(normalizeExistingAssetRelativePaths(existingAssetRelativePaths));
    const copyRequests = [];
    const skippedImports = [];

    for (const request of importRequests) {
      if (settings.resourceImportPolicy !== "copy-into-workspace") {
        skippedImports.push(buildSkippedImport({
          reason: "external-reference-policy-not-supported",
          request,
        }));
        continue;
      }

      const assetKind = classifyAssetKind(request);
      if (!assetKind.supported) {
        skippedImports.push(buildSkippedImport({
          assetKind: assetKind.kind,
          reason: assetKind.reason,
          request,
        }));
        continue;
      }

      const targetRelativePath = buildUniqueAssetTargetRelativePath({
        directory: assetKind.directory,
        existingTargets,
        fileName: request.safeFileName,
        resourceDirectory: settings.resourceDirectory,
      });
      const workspaceBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
        operation: "write",
        relativePath: targetRelativePath,
        workspaceRoot,
      });
      if (!workspaceBoundary.allowed || workspaceBoundary.targetKind !== "asset-copy") {
        skippedImports.push(buildSkippedImport({
          assetKind: assetKind.kind,
          reason: workspaceBoundary.reason || "asset-target-not-whitelisted",
          request,
          targetRelativePath,
          workspaceBoundary,
        }));
        continue;
      }

      existingTargets.add(targetRelativePath.toLowerCase());
      copyRequests.push({
        assetKind: assetKind.kind,
        byteLength: request.byteLength,
        copyRequired: true,
        externalPathPersisted: false,
        payloadContentExposed: false,
        sourceName: request.sourceName,
        sourceReferenceId: request.sourceReferenceId,
        targetKind: workspaceBoundary.targetKind,
        targetRelativePath,
        writeTarget: workspaceBoundary.writeTarget || null,
        workspaceBoundary,
      });
    }

    return {
      copyRequests,
      externalPathPersisted: false,
      format: EditorBackendWorkspaceAssetImportPlanFormat,
      formatVersion: EditorBackendWorkspaceAssetImportPlanFormatVersion,
      importPolicy: settings.resourceImportPolicy,
      payloadContentExposed: false,
      resourceDirectory: settings.resourceDirectory,
      skippedImports,
      sourceCount: importRequests.length,
      supportedAssetKinds: supportedAssetKindPolicies.map((policy) => ({
        directory: policy.directory,
        extensions: [...policy.extensions],
        kind: policy.kind,
      })),
      workspaceRoot: normalizeWorkspaceRoot(workspaceRoot),
    };
  }
}

function buildSkippedImport({
  assetKind = "unsupported",
  reason,
  request,
  targetRelativePath = "",
  workspaceBoundary = null,
}) {
  return {
    assetKind,
    byteLength: request.byteLength,
    externalPathPersisted: false,
    payloadContentExposed: false,
    reason,
    sourceName: request.sourceName,
    sourceReferenceId: request.sourceReferenceId,
    targetKind: "rejected",
    targetRelativePath,
    workspaceBoundary,
  };
}

function classifyAssetKind(request) {
  if (!request.safeFileName) {
    return {
      directory: "",
      kind: "unsupported",
      reason: "asset-file-name-required",
      supported: false,
    };
  }

  const extension = getFileExtension(request.safeFileName);
  const policy = supportedAssetKindPolicies.find((candidate) => candidate.extensions.includes(extension));
  if (!policy) {
    return {
      directory: "",
      kind: "unsupported",
      reason: "asset-extension-not-supported",
      supported: false,
    };
  }

  return {
    directory: policy.directory,
    kind: policy.kind,
    reason: "",
    supported: true,
  };
}

function buildUniqueAssetTargetRelativePath({
  directory,
  existingTargets,
  fileName,
  resourceDirectory,
}) {
  const basePath = `${resourceDirectory}/${directory}`;
  const extension = getFileExtension(fileName);
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  let candidate = `${basePath}/${fileName}`;
  let index = 1;
  while (existingTargets.has(candidate.toLowerCase())) {
    candidate = `${basePath}/${baseName}-${index}${extension}`;
    index += 1;
  }

  return candidate;
}

function normalizeAssetImportSettings(settingsSummary) {
  const resourceDirectory = normalizeResourceDirectory(
    settingsSummary?.workspace?.resourceDirectory
      || settingsSummary?.global?.defaultAssetDirectory
      || EditorBackendSettingsDefaults.workspace.resourceDirectory
  );

  return {
    resourceDirectory,
    resourceImportPolicy: String(
      settingsSummary?.workspace?.resourceImportPolicy
        || EditorBackendSettingsDefaults.workspace.resourceImportPolicy
    ),
  };
}

function normalizeExistingAssetRelativePaths(existingAssetRelativePaths) {
  const source = Array.isArray(existingAssetRelativePaths) ? existingAssetRelativePaths : [];
  return source
    .map((entry) => normalizeRelativePath(typeof entry === "string" ? entry : entry?.relativePath))
    .filter(Boolean)
    .map((relativePath) => relativePath.toLowerCase());
}

function normalizeImportRequests(imports) {
  const source = Array.isArray(imports) ? imports : [];
  return source.map((request, index) => {
    const sourceName = normalizeSourceName(
      request?.sourceName
        || request?.fileName
        || getBaseName(request?.sourcePath || request?.path)
    );

    return {
      byteLength: normalizeNonNegativeInteger(request?.byteLength, 0),
      safeFileName: sanitizeFileName(sourceName),
      sourceName,
      sourceReferenceId: normalizeSourceReferenceId(request?.sourceReferenceId || request?.id, index),
    };
  });
}

function getBaseName(path) {
  const source = String(path || "").replace(/\\/g, "/");
  const segments = source.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function getFileExtension(fileName) {
  const source = String(fileName || "");
  const lastDot = source.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === source.length - 1) {
    return "";
  }

  return source.slice(lastDot).toLowerCase();
}

function normalizeSourceName(sourceName) {
  return getBaseName(sourceName).slice(0, 160);
}

function normalizeSourceReferenceId(sourceReferenceId, index) {
  const normalized = String(sourceReferenceId || "").trim();
  if (!normalized) {
    return `import-${index + 1}`;
  }

  return normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120) || `import-${index + 1}`;
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
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

function normalizeResourceDirectory(resourceDirectory) {
  const fallback = EditorBackendSettingsDefaults.workspace.resourceDirectory;
  const normalized = normalizeRelativePath(resourceDirectory);
  if (
    !normalized
    || normalized.includes("..")
    || normalized.includes(":")
    || normalized.startsWith("/")
    || normalized.startsWith("\\")
  ) {
    return fallback;
  }

  if (normalized !== "assets" && !normalized.startsWith("assets/")) {
    return fallback;
  }

  return normalized;
}

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function sanitizeFileName(fileName) {
  const source = String(fileName || "").trim();
  const extension = getFileExtension(source);
  const sourceBaseName = extension ? source.slice(0, -extension.length) : source;
  const safeBaseName = sourceBaseName
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (!safeBaseName && !extension) {
    return "";
  }

  return `${safeBaseName || "asset"}${extension}`;
}

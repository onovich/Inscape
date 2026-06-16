import { EditorBackendDesktopSessionModel } from "./EditorBackendDesktopSessionModel.js";
import { EditorBackendWorkspaceWriteTargetModel } from "./EditorBackendWorkspaceWriteTargetModel.js";

export const EditorBackendWorkspaceBackupPlanFormat = "inscape.self-hosted-editor.workspace-backup-plan";
export const EditorBackendWorkspaceBackupPlanFormatVersion = 1;

const backupSourceTargetKinds = Object.freeze([
  "localization-csv",
  "node-map-sidecar",
  "line-map-sidecar",
]);

export class EditorBackendWorkspaceBackupPlanModel {
  static buildPlan({
    backupEnabled = null,
    existingBackups = [],
    nowUtc = "",
    retentionDays = null,
    retentionLimit = null,
    settingsSummary = null,
    writeRequests = [],
    workspaceRoot = "",
  } = {}) {
    const settings = normalizeBackupSettings({
      backupEnabled,
      retentionDays,
      retentionLimit,
      settingsSummary,
    });
    const timestamp = normalizeBackupTimestamp(nowUtc);
    const sourceRequests = normalizeWriteRequests(writeRequests);
    const backupRequests = [];
    const skippedWrites = [];

    for (const request of sourceRequests) {
      const sourceBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
        operation: "write",
        relativePath: request.relativePath,
        workspaceRoot,
      });
      if (!sourceBoundary.allowed) {
        skippedWrites.push(buildSkippedBackupWrite({
          reason: sourceBoundary.reason || "workspace-boundary-rejected",
          request,
          sourceBoundary,
        }));
        continue;
      }

      if (!backupSourceTargetKinds.includes(sourceBoundary.targetKind)) {
        skippedWrites.push(buildSkippedBackupWrite({
          reason: "backup-target-not-supported",
          request,
          sourceBoundary,
        }));
        continue;
      }

      if (!settings.backupEnabled) {
        skippedWrites.push(buildSkippedBackupWrite({
          reason: "backup-disabled",
          request,
          sourceBoundary,
        }));
        continue;
      }

      const backupRelativePath = buildBackupRelativePath(request.relativePath, timestamp);
      const backupBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
        operation: "write",
        relativePath: backupRelativePath,
        workspaceRoot,
      });
      if (!backupBoundary.allowed || backupBoundary.targetKind !== "backup-artifact") {
        skippedWrites.push(buildSkippedBackupWrite({
          backupBoundary,
          backupRelativePath,
          reason: backupBoundary.reason || "backup-target-not-whitelisted",
          request,
          sourceBoundary,
        }));
        continue;
      }

      backupRequests.push({
        backupRelativePath,
        backupTargetKind: backupBoundary.targetKind,
        copyRequired: true,
        payloadContentExposed: false,
        reason: "write-back-backup-required",
        sourceBoundary,
        sourceRelativePath: request.relativePath,
        sourceTargetKind: sourceBoundary.targetKind,
        timestampUtc: timestamp,
        writeTarget: backupBoundary.writeTarget || null,
        workspaceBoundary: backupBoundary,
      });
    }

    return {
      backupEnabled: settings.backupEnabled,
      backupRequests,
      cleanupCandidates: buildCleanupCandidates({
        existingBackups,
        nowUtc: timestamp,
        retentionDays: settings.retentionDays,
        retentionLimit: settings.retentionLimit,
      }),
      format: EditorBackendWorkspaceBackupPlanFormat,
      formatVersion: EditorBackendWorkspaceBackupPlanFormatVersion,
      payloadContentExposed: false,
      retentionPolicy: {
        days: settings.retentionDays,
        limit: settings.retentionLimit,
        strategy: "count-and-age",
      },
      skippedWrites,
      sourceCount: sourceRequests.length,
      timestampUtc: timestamp,
      workspaceRoot: normalizeWorkspaceRoot(workspaceRoot),
    };
  }
}

function buildSkippedBackupWrite({
  backupBoundary = null,
  backupRelativePath = "",
  reason,
  request,
  sourceBoundary = null,
}) {
  return {
    backupRelativePath,
    reason,
    sourceBoundary,
    sourceRelativePath: request.relativePath,
    sourceTargetKind: sourceBoundary?.targetKind || "rejected",
    workspaceBoundary: backupBoundary,
  };
}

function buildBackupRelativePath(relativePath, timestampUtc) {
  return `.inscape-workspace/backups/${normalizeRelativePath(relativePath)}.${formatTimestampForPath(timestampUtc)}.bak`;
}

function buildCleanupCandidates({
  existingBackups = [],
  nowUtc,
  retentionDays,
  retentionLimit,
} = {}) {
  const normalizedBackups = normalizeExistingBackups(existingBackups);
  const newestFirst = [...normalizedBackups].sort((left, right) => right.createdAtMs - left.createdAtMs);
  const nowMs = Date.parse(nowUtc);
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const candidates = [];

  for (let index = 0; index < newestFirst.length; index += 1) {
    const backup = newestFirst[index];
    const reasons = [];
    if (index >= retentionLimit) {
      reasons.push("retention-limit-exceeded");
    }

    if (Number.isFinite(nowMs) && Number.isFinite(backup.createdAtMs) && nowMs - backup.createdAtMs > maxAgeMs) {
      reasons.push("retention-days-exceeded");
    }

    if (reasons.length > 0) {
      candidates.push({
        createdUtc: backup.createdUtc,
        payloadContentExposed: false,
        reason: reasons.join("+"),
        relativePath: backup.relativePath,
        sourceRelativePath: backup.sourceRelativePath,
      });
    }
  }

  return candidates;
}

function normalizeExistingBackups(existingBackups) {
  const source = Array.isArray(existingBackups) ? existingBackups : [];
  return source
    .map((backup) => {
      const relativePath = normalizeRelativePath(backup?.relativePath);
      if (!relativePath) {
        return null;
      }

      const createdUtc = normalizeTimestamp(backup?.createdUtc || backup?.createdAtUtc || backup?.modifiedUtc);
      return {
        createdAtMs: Date.parse(createdUtc),
        createdUtc,
        relativePath,
        sourceRelativePath: normalizeRelativePath(backup?.sourceRelativePath),
      };
    })
    .filter(Boolean);
}

function normalizeWriteRequests(writeRequests) {
  const source = Array.isArray(writeRequests) ? writeRequests : [];
  const seen = new Set();
  const normalized = [];
  for (const request of source) {
    const relativePath = normalizeRelativePath(request?.relativePath);
    if (!relativePath || seen.has(relativePath)) {
      continue;
    }

    seen.add(relativePath);
    const writeTarget = EditorBackendWorkspaceWriteTargetModel.resolve({ relativePath });
    normalized.push({
      relativePath,
      targetKind: writeTarget.targetKind,
    });
  }

  return normalized;
}

function normalizeBackupSettings({
  backupEnabled,
  retentionDays,
  retentionLimit,
  settingsSummary,
}) {
  return {
    backupEnabled: backupEnabled ?? settingsSummary?.workspace?.backupEnabled ?? true,
    retentionDays: normalizeNonNegativeInteger(
      retentionDays ?? settingsSummary?.global?.backupRetentionDays,
      30
    ),
    retentionLimit: normalizePositiveInteger(
      retentionLimit ?? settingsSummary?.global?.backupRetentionLimit,
      20
    ),
  };
}

function formatTimestampForPath(timestampUtc) {
  return String(timestampUtc || "unspecified")
    .replace(/[-:.]/g, "")
    .replace(/\+/g, "Z")
    .replace(/[^A-Za-z0-9_]/g, "");
}

function normalizeBackupTimestamp(timestamp) {
  return normalizeTimestamp(timestamp || new Date(0).toISOString());
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

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
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

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

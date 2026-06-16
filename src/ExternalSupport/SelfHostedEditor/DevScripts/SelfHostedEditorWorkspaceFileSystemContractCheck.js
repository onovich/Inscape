import {
  EditorBackendDesktopSessionModel,
  EditorBackendWorkspaceFileBoundaryFormat,
} from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import {
  EditorBackendWorkspacePathBoundaryFormat,
  EditorBackendWorkspacePathModel,
} from "../Scripts/Backend/Models/EditorBackendWorkspacePathModel.js";
import {
  EditorBackendWorkspaceAssetImportPlanFormat,
  EditorBackendWorkspaceAssetImportPlanModel,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceAssetImportPlanModel.js";
import {
  EditorBackendWorkspaceBackupPlanFormat,
  EditorBackendWorkspaceBackupPlanModel,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceBackupPlanModel.js";
import {
  EditorBackendWorkspaceInternalDirectoryPlanFormat,
  EditorBackendWorkspaceFolderFormat,
  EditorBackendWorkspaceFolderModel,
  EditorBackendWorkspaceFolderOpenDecisionFormat,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceFolderModel.js";
import {
  EditorBackendWorkspaceWriteTargetCatalogFormat,
  EditorBackendWorkspaceWriteTargetDecisionFormat,
  EditorBackendWorkspaceWriteTargetModel,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceWriteTargetModel.js";

const workspaceRoot = "C:\\Case Files\\Court Loop";

const pathBoundary = EditorBackendWorkspacePathModel.buildBoundary({
  relativePath: "story\\opening.inscape",
  workspaceRoot,
});
assertEqual(pathBoundary.format, EditorBackendWorkspacePathBoundaryFormat, "workspace path boundary format");
assertEqual(pathBoundary.allowed, true, "workspace path boundary allowed");
assertEqual(pathBoundary.workspaceRoot, "C:/Case Files/Court Loop", "workspace root normalization");
assertEqual(pathBoundary.relativePath, "story/opening.inscape", "workspace relative path normalization");
assertEqual(
  pathBoundary.resolvedWorkspacePath,
  "C:/Case Files/Court Loop/story/opening.inscape",
  "workspace resolved path"
);
assertEqual(pathBoundary.withinWorkspace, true, "workspace resolved path stays inside root");

const rejectedPathBoundaries = [
  ["", "", "empty-relative-path"],
  ["C:/outside/opening.inscape", "", "absolute-path-rejected"],
  ["C:\\outside\\opening.inscape", "", "absolute-path-rejected"],
  ["\\\\server\\share\\opening.inscape", "", "absolute-path-rejected"],
  ["/outside/opening.inscape", "", "absolute-path-rejected"],
  ["\\outside\\opening.inscape", "", "absolute-path-rejected"],
  ["file:///outside/opening.inscape", "", "absolute-path-rejected"],
  ["../outside.inscape", "", "path-traversal-rejected"],
  ["story/../outside.inscape", "", "path-traversal-rejected"],
  ["story/./opening.inscape", "", "invalid-relative-path"],
  ["story\0opening.inscape", "", "invalid-relative-path"],
  ["linked/outside.inscape", "D:/Other Workspace/outside.inscape", "outside-workspace-rejected"],
];
for (const [relativePath, resolvedPath, expectedReason] of rejectedPathBoundaries) {
  const boundary = EditorBackendWorkspacePathModel.buildBoundary({
    relativePath,
    resolvedPath,
    workspaceRoot,
  });
  assertEqual(boundary.allowed, false, `workspace path rejected: ${relativePath}`);
  assertEqual(boundary.reason, expectedReason, `workspace path rejection reason: ${relativePath}`);
}

const fileBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
  operation: "write",
  relativePath: "assets\\images\\cg.png",
  workspaceRoot,
});
assertEqual(fileBoundary.format, EditorBackendWorkspaceFileBoundaryFormat, "workspace file boundary format");
assertEqual(fileBoundary.allowed, true, "workspace file boundary allowed asset");
assertEqual(fileBoundary.workspaceRelative, true, "workspace file boundary workspace relative");
assertEqual(fileBoundary.withinWorkspace, true, "workspace file boundary within root");
assertEqual(fileBoundary.targetKind, "asset-copy", "workspace file boundary target kind");
assertEqual(fileBoundary.pathBoundary.format, EditorBackendWorkspacePathBoundaryFormat, "workspace file boundary embeds path guard");
assertEqual(
  fileBoundary.writeTarget.format,
  EditorBackendWorkspaceWriteTargetDecisionFormat,
  "workspace file boundary embeds write target decision"
);
assertEqual(
  fileBoundary.resolvedWorkspacePath,
  "C:/Case Files/Court Loop/assets/images/cg.png",
  "workspace file boundary resolved path"
);

const outsideFileBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
  operation: "write",
  relativePath: "story/opening.inscape",
  resolvedPath: "D:/Other Workspace/opening.inscape",
  workspaceRoot,
});
assertEqual(outsideFileBoundary.allowed, false, "workspace file boundary rejects resolved outside root");
assertEqual(outsideFileBoundary.reason, "outside-workspace-rejected", "workspace file boundary outside root reason");
assertEqual(outsideFileBoundary.targetKind, "rejected", "workspace file boundary outside root target kind");

const unlistedFileBoundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
  operation: "write",
  relativePath: "story/tool.exe",
  workspaceRoot,
});
assertEqual(unlistedFileBoundary.allowed, false, "workspace file boundary rejects unlisted target");
assertEqual(
  unlistedFileBoundary.reason,
  "write-target-not-whitelisted",
  "workspace file boundary unlisted target reason"
);
assertEqual(unlistedFileBoundary.pathBoundary.allowed, true, "unlisted target still has a valid workspace path");

const writeTargetCatalog = EditorBackendWorkspaceWriteTargetModel.buildCatalog();
assertEqual(writeTargetCatalog.format, EditorBackendWorkspaceWriteTargetCatalogFormat, "write target catalog format");
assertEqual(
  writeTargetCatalog.targets.map((target) => target.targetKind).join(","),
  "recovery-snapshot,backup-artifact,cache-artifact,asset-copy,inscape-document,localization-csv,node-map-sidecar,line-map-sidecar",
  "write target catalog order"
);
assertEqual(
  writeTargetCatalog.targets.map((target) => target.pathRule).join(","),
  ".inscape-workspace/recovery/**,.inscape-workspace/backups/**,.inscape-workspace/cache/**,assets/**,*.inscape,*.csv,**/inscape.node-map.json,**/inscape.line-map.json",
  "write target catalog path rules"
);

const allowedWriteTargets = [
  ["story/opening.inscape", "inscape-document", "*.inscape"],
  ["localization/zh-cn.csv", "localization-csv", "*.csv"],
  ["inscape.node-map.json", "node-map-sidecar", "**/inscape.node-map.json"],
  ["metadata/inscape.line-map.json", "line-map-sidecar", "**/inscape.line-map.json"],
  [".inscape-workspace/recovery/opening.snapshot.json", "recovery-snapshot", ".inscape-workspace/recovery/**"],
  [".inscape-workspace/backups/localization/zh-cn.csv.20260616.bak", "backup-artifact", ".inscape-workspace/backups/**"],
  [".inscape-workspace/cache/preview.json", "cache-artifact", ".inscape-workspace/cache/**"],
  ["assets/images/cg.png", "asset-copy", "assets/**"],
];
for (const [relativePath, expectedKind, expectedPathRule] of allowedWriteTargets) {
  const decision = EditorBackendWorkspaceWriteTargetModel.resolve({ relativePath });
  assertEqual(decision.allowed, true, `write target allowed: ${relativePath}`);
  assertEqual(decision.targetKind, expectedKind, `write target kind: ${relativePath}`);
  assertEqual(decision.pathRule, expectedPathRule, `write target path rule: ${relativePath}`);
}

for (const relativePath of [
  ".inscape-workspace/recovery/",
  ".inscape-workspace/backups/",
  ".inscape-workspace/cache/",
  "assets/",
  ".inscape-workspace/logs/output.json",
  "story/tool.exe",
]) {
  const decision = EditorBackendWorkspaceWriteTargetModel.resolve({ relativePath });
  assertEqual(decision.allowed, false, `write target rejected: ${relativePath}`);
  assertEqual(decision.reason, "write-target-not-whitelisted", `write target rejection reason: ${relativePath}`);
  assertEqual(decision.targetKind, "rejected", `write target rejected kind: ${relativePath}`);
}

const openDecision = EditorBackendWorkspaceFolderModel.buildOpenDecision({
  selectedPathKind: "directory",
  workspaceRoot,
});
assertEqual(openDecision.format, EditorBackendWorkspaceFolderOpenDecisionFormat, "workspace open decision format");
assertEqual(openDecision.allowed, true, "workspace open accepts directory");
assertEqual(openDecision.mode, "directory-workspace", "workspace open mode");
assertEqual(openDecision.workspaceRoot, "C:/Case Files/Court Loop", "workspace open normalizes root");

const fileOpenDecision = EditorBackendWorkspaceFolderModel.buildOpenDecision({
  selectedPathKind: "file",
  workspaceRoot: "C:/Case Files/Court Loop/story/opening.inscape",
});
assertEqual(fileOpenDecision.allowed, false, "workspace open rejects file path kind");
assertEqual(fileOpenDecision.reason, "single-file-mode-rejected", "workspace open file rejection reason");

const missingRootOpenDecision = EditorBackendWorkspaceFolderModel.buildOpenDecision({
  selectedPathKind: "directory",
  workspaceRoot: "",
});
assertEqual(missingRootOpenDecision.allowed, false, "workspace open rejects missing root");
assertEqual(missingRootOpenDecision.reason, "workspace-root-required", "workspace open missing root reason");

const internalWorkspacePlan = EditorBackendWorkspaceFolderModel.buildInternalWorkspacePlan({
  existingRelativePaths: [
    ".inscape-workspace/recovery/",
  ],
  gitIgnoreEntries: [
    "node_modules/",
  ],
  selectedPathKind: "directory",
  workspaceRoot,
});
assertEqual(internalWorkspacePlan.format, EditorBackendWorkspaceInternalDirectoryPlanFormat, "internal workspace plan format");
assertEqual(internalWorkspacePlan.payloadContentExposed, false, "internal workspace plan text-free");
assertEqual(internalWorkspacePlan.internalRootRelativePath, ".inscape-workspace", "internal workspace root path");
assertEqual(internalWorkspacePlan.directories.length, 3, "internal workspace directory count");
assertEqual(internalWorkspacePlan.directories[0].kind, "recovery", "internal workspace recovery kind");
assertEqual(internalWorkspacePlan.directories[0].exists, true, "internal workspace detects existing recovery");
assertEqual(internalWorkspacePlan.directories[0].createRequired, false, "internal workspace recovery does not need create");
assertEqual(internalWorkspacePlan.directories[1].kind, "backups", "internal workspace backups kind");
assertEqual(internalWorkspacePlan.directories[1].createRequired, true, "internal workspace backups create required");
assertEqual(internalWorkspacePlan.directories[2].kind, "cache", "internal workspace cache kind");
assertEqual(internalWorkspacePlan.directories[2].recreatable, true, "internal workspace cache recreatable");
assertEqual(internalWorkspacePlan.directories.every((directory) => directory.projectTruth === false), true, "internal workspace dirs are not project truth");
assertEqual(internalWorkspacePlan.directories.every((directory) => directory.gitIgnored === true), true, "internal workspace dirs git ignored");
assertEqual(internalWorkspacePlan.gitIgnore.relativePath, ".gitignore", "internal workspace gitignore path");
assertEqual(internalWorkspacePlan.gitIgnore.entries.join(","), ".inscape-workspace/", "internal workspace gitignore entry");
assertEqual(internalWorkspacePlan.gitIgnore.action, "append-entry", "internal workspace gitignore append action");
const alreadyIgnoredInternalWorkspacePlan = EditorBackendWorkspaceFolderModel.buildInternalWorkspacePlan({
  gitIgnoreEntries: [
    ".inscape-workspace/",
  ],
  workspaceRoot,
});
assertEqual(alreadyIgnoredInternalWorkspacePlan.gitIgnore.alreadyIgnored, true, "internal workspace already ignored");
assertEqual(alreadyIgnoredInternalWorkspacePlan.gitIgnore.action, "none", "internal workspace no gitignore action when present");

const backupPlan = EditorBackendWorkspaceBackupPlanModel.buildPlan({
  existingBackups: [
    {
      createdUtc: "2026-06-16T00:00:00.000Z",
      relativePath: ".inscape-workspace/backups/localization/zh-cn.csv.20260616T000000000Z.bak",
      sourceRelativePath: "localization/zh-cn.csv",
    },
    {
      createdUtc: "2026-06-10T00:00:00.000Z",
      relativePath: ".inscape-workspace/backups/metadata/inscape.node-map.json.20260610T000000000Z.bak",
      sourceRelativePath: "metadata/inscape.node-map.json",
    },
  ],
  nowUtc: "2026-06-17T01:02:03.000Z",
  retentionDays: 5,
  retentionLimit: 1,
  writeRequests: [
    {
      relativePath: "localization/zh-cn.csv",
    },
    {
      relativePath: "metadata/inscape.node-map.json",
    },
    {
      relativePath: "metadata/inscape.line-map.json",
    },
    {
      relativePath: "story/opening.inscape",
    },
  ],
  workspaceRoot,
});
assertEqual(backupPlan.format, EditorBackendWorkspaceBackupPlanFormat, "backup plan format");
assertEqual(backupPlan.backupEnabled, true, "backup plan enabled by default");
assertEqual(backupPlan.payloadContentExposed, false, "backup plan text-free");
assertEqual(backupPlan.sourceCount, 4, "backup plan source count");
assertEqual(backupPlan.backupRequests.length, 3, "backup plan request count");
assertEqual(
  backupPlan.backupRequests.map((request) => request.sourceTargetKind).join(","),
  "localization-csv,node-map-sidecar,line-map-sidecar",
  "backup plan source target kinds"
);
assertEqual(
  backupPlan.backupRequests[0].backupRelativePath,
  ".inscape-workspace/backups/localization/zh-cn.csv.20260617T010203000Z.bak",
  "backup plan localization backup path"
);
assertEqual(
  backupPlan.backupRequests.every((request) => request.backupTargetKind === "backup-artifact"),
  true,
  "backup plan target kind"
);
assertEqual(backupPlan.skippedWrites.length, 1, "backup plan skipped unsupported count");
assertEqual(backupPlan.skippedWrites[0].reason, "backup-target-not-supported", "backup plan unsupported source reason");
assertEqual(backupPlan.retentionPolicy.strategy, "count-and-age", "backup plan retention strategy");
assertEqual(backupPlan.retentionPolicy.limit, 1, "backup plan retention limit");
assertEqual(backupPlan.retentionPolicy.days, 5, "backup plan retention days");
assertEqual(backupPlan.cleanupCandidates.length, 1, "backup plan cleanup count");
assertEqual(backupPlan.cleanupCandidates[0].reason, "retention-limit-exceeded+retention-days-exceeded", "backup plan cleanup reason");
assertNotIncludes(JSON.stringify(backupPlan), "secret", "backup plan must not expose payload text");
const disabledBackupPlan = EditorBackendWorkspaceBackupPlanModel.buildPlan({
  backupEnabled: false,
  nowUtc: "2026-06-17T01:02:03.000Z",
  writeRequests: [
    {
      relativePath: "localization/zh-cn.csv",
    },
  ],
  workspaceRoot,
});
assertEqual(disabledBackupPlan.backupRequests.length, 0, "disabled backup plan no requests");
assertEqual(disabledBackupPlan.skippedWrites[0].reason, "backup-disabled", "disabled backup reason");

const assetImportPlan = EditorBackendWorkspaceAssetImportPlanModel.buildPlan({
  existingAssetRelativePaths: [
    "assets/images/court-portrait.png",
  ],
  imports: [
    {
      byteLength: 1024,
      sourcePath: "D:/Downloads/court portrait.png",
    },
    {
      byteLength: 2048,
      sourcePath: "D:/Downloads/theme song.wav",
    },
    {
      byteLength: 512,
      sourcePath: "D:/Downloads/dialogue.csv",
    },
    {
      byteLength: 4096,
      sourcePath: "D:/Downloads/tool.exe",
    },
  ],
  settingsSummary: EditorBackendDesktopSessionModel.buildSettingsSummary({
    workspaceSettings: {
      resourceDirectory: "assets",
      resourceImportPolicy: "copy-into-workspace",
    },
  }),
  workspaceRoot,
});
assertEqual(assetImportPlan.format, EditorBackendWorkspaceAssetImportPlanFormat, "asset import plan format");
assertEqual(assetImportPlan.importPolicy, "copy-into-workspace", "asset import plan policy");
assertEqual(assetImportPlan.resourceDirectory, "assets", "asset import plan resource directory");
assertEqual(assetImportPlan.externalPathPersisted, false, "asset import plan does not persist external paths");
assertEqual(assetImportPlan.payloadContentExposed, false, "asset import plan text-free");
assertEqual(assetImportPlan.sourceCount, 4, "asset import plan source count");
assertEqual(assetImportPlan.copyRequests.length, 3, "asset import plan copy request count");
assertEqual(
  assetImportPlan.copyRequests.map((request) => request.assetKind).join(","),
  "image,audio,data",
  "asset import plan asset kinds"
);
assertEqual(
  assetImportPlan.copyRequests.map((request) => request.targetRelativePath).join(","),
  "assets/images/court-portrait-1.png,assets/audio/theme-song.wav,assets/data/dialogue.csv",
  "asset import plan target paths"
);
assertEqual(
  assetImportPlan.copyRequests.every((request) => request.targetKind === "asset-copy"),
  true,
  "asset import plan target kind"
);
assertEqual(
  assetImportPlan.copyRequests.every((request) => request.workspaceBoundary?.targetKind === "asset-copy"),
  true,
  "asset import plan target boundary"
);
assertEqual(assetImportPlan.skippedImports.length, 1, "asset import plan unsupported count");
assertEqual(assetImportPlan.skippedImports[0].reason, "asset-extension-not-supported", "asset import plan unsupported reason");
assertEqual(JSON.stringify(assetImportPlan).includes("D:/Downloads"), false, "asset import plan must not persist external source paths");
const externalReferenceImportPlan = EditorBackendWorkspaceAssetImportPlanModel.buildPlan({
  imports: [
    {
      sourcePath: "D:/Downloads/court portrait.png",
    },
  ],
  settingsSummary: EditorBackendDesktopSessionModel.buildSettingsSummary({
    workspaceSettings: {
      resourceImportPolicy: "reference-external",
    },
  }),
  workspaceRoot,
});
assertEqual(externalReferenceImportPlan.copyRequests.length, 0, "external reference import plan no copy");
assertEqual(
  externalReferenceImportPlan.skippedImports[0].reason,
  "external-reference-policy-not-supported",
  "external reference import plan rejection reason"
);
assertEqual(JSON.stringify(externalReferenceImportPlan).includes("D:/Downloads"), false, "external reference plan must not persist source paths");

const workspaceFolder = EditorBackendWorkspaceFolderModel.buildWorkspaceFolder({
  activeRelativePath: "story/branch.inscape",
  documents: [
    {
      existsOnDisk: true,
      relativePath: "story\\opening.inscape",
      text: "secret opening text",
    },
    {
      existsOnDisk: true,
      relativePath: "story/branch.inscape",
      text: "secret branch text",
    },
    {
      relativePath: "notes/readme.txt",
      text: "secret notes text",
    },
    {
      relativePath: "../escape.inscape",
      text: "secret escape text",
    },
  ],
  selectedPathKind: "directory",
  workspaceName: "Court Loop",
  workspaceRoot,
});
assertEqual(workspaceFolder.format, EditorBackendWorkspaceFolderFormat, "workspace folder format");
assertEqual(workspaceFolder.openDecision.allowed, true, "workspace folder open decision");
assertEqual(workspaceFolder.documentCount, 2, "workspace folder document count");
assertEqual(workspaceFolder.activeRelativePath, "story/branch.inscape", "workspace folder active document");
assertEqual(workspaceFolder.documents[0].relativePath, "story/opening.inscape", "workspace folder first document");
assertEqual(workspaceFolder.documents[0].active, false, "workspace folder first document inactive");
assertEqual(workspaceFolder.documents[1].active, true, "workspace folder second document active");
assertEqual(workspaceFolder.documents[1].title, "branch", "workspace folder derives title");
assertEqual(workspaceFolder.rejectedDocuments.length, 2, "workspace folder rejected documents");
assertEqual(
  workspaceFolder.rejectedDocuments.map((document) => document.reason).join(","),
  "workspace-document-not-inscape,path-traversal-rejected",
  "workspace folder rejected document reasons"
);
assertNotIncludes(JSON.stringify(workspaceFolder), "secret", "workspace folder summary does not expose document text");

const fallbackActiveWorkspaceFolder = EditorBackendWorkspaceFolderModel.buildWorkspaceFolder({
  activeRelativePath: "missing.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
    },
    {
      relativePath: "story/branch.inscape",
    },
  ],
  selectedPathKind: "directory",
  workspaceRoot,
});
assertEqual(
  fallbackActiveWorkspaceFolder.activeRelativePath,
  "story/opening.inscape",
  "workspace folder falls back to first document when active path is missing"
);

console.log("SelfHostedEditor workspace file system contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (String(text).includes(unexpected)) {
    throw new Error(`${label}: did not expect ${unexpected}`);
  }
}

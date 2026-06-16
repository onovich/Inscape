import {
  EditorBackendDesktopSessionModel,
  EditorBackendWorkspaceFileBoundaryFormat,
} from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import {
  EditorBackendWorkspacePathBoundaryFormat,
  EditorBackendWorkspacePathModel,
} from "../Scripts/Backend/Models/EditorBackendWorkspacePathModel.js";
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
  "inscape-document,localization-csv,node-map-sidecar,line-map-sidecar,recovery-snapshot,backup-artifact,cache-artifact,asset-copy",
  "write target catalog order"
);
assertEqual(
  writeTargetCatalog.targets.map((target) => target.pathRule).join(","),
  "*.inscape,*.csv,**/inscape.node-map.json,**/inscape.line-map.json,.inscape-workspace/recovery/**,.inscape-workspace/backups/**,.inscape-workspace/cache/**,assets/**",
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

console.log("SelfHostedEditor workspace file system contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stylesRoot = path.join(moduleRoot, "Resources", "Styles");

const expectedImports = [
  "SelfHostedEditorBase.css",
  "SelfHostedEditorWorkspaceLayout.css",
  "SelfHostedEditorSidebar.css",
  "SelfHostedEditorTopbar.css",
  "SelfHostedEditorLoadingState.css",
  "SelfHostedEditorDiagnosticsStatus.css",
  "SelfHostedEditorEditorAuthoring.css",
  "SelfHostedEditorLineHintRail.css",
  "SelfHostedEditorReferenceOverlay.css",
  "SelfHostedEditorAuthoringDecorations.css",
  "SelfHostedEditorPreview.css",
  "SelfHostedEditorLocalization.css",
  "SelfHostedEditorHostCapability.css",
  "SelfHostedEditorRuntimeAuthoring.css",
  "SelfHostedEditorRuntimeActionAuthoring.css",
  "SelfHostedEditorRuntimeErrorState.css",
  "SelfHostedEditorRuntimeLogBacklog.css",
  "SelfHostedEditorRuntimeBranchEvidence.css",
  "SelfHostedEditorRuntimeSubstateAuthoring.css",
  "SelfHostedEditorNodeMapReview.css",
  "SelfHostedEditorStoryGraph.css",
];

const filePolicies = new Map([
  ["SelfHostedEditorBase.css", { currentMaximum: 200, owner: "base tokens and reset", targetMaximum: 200 }],
  ["SelfHostedEditorAuthoringDecorations.css", { currentMaximum: 80, owner: "editor semantic decorations", targetMaximum: 120 }],
  ["SelfHostedEditorDiagnosticsStatus.css", { currentMaximum: 220, owner: "diagnostics and status", targetMaximum: 220 }],
  ["SelfHostedEditorEditorAuthoring.css", { currentMaximum: 240, owner: "editor frame and Monaco shell", targetMaximum: 260 }],
  ["SelfHostedEditorHostCapability.css", { currentMaximum: 200, owner: "host capability", targetMaximum: 220 }],
  ["SelfHostedEditorLineHintRail.css", { currentMaximum: 280, owner: "editor line hint rail", targetMaximum: 320 }],
  ["SelfHostedEditorLoadingState.css", { currentMaximum: 200, owner: "loading state", targetMaximum: 200 }],
  ["SelfHostedEditorLocalization.css", { currentMaximum: 260, owner: "localization", targetMaximum: 400 }],
  ["SelfHostedEditorNodeMapReview.css", { currentMaximum: 220, owner: "node-map review", targetMaximum: 220 }],
  ["SelfHostedEditorPreview.css", { currentMaximum: 400, owner: "preview", targetMaximum: 400 }],
  ["SelfHostedEditorReferenceOverlay.css", { currentMaximum: 140, owner: "editor references overlay", targetMaximum: 160 }],
  ["SelfHostedEditorRuntimeActionAuthoring.css", { currentMaximum: 180, owner: "runtime action authoring", targetMaximum: 180 }],
  ["SelfHostedEditorRuntimeAuthoring.css", { currentMaximum: 240, owner: "runtime authoring", targetMaximum: 240 }],
  ["SelfHostedEditorRuntimeBranchEvidence.css", { currentMaximum: 140, owner: "runtime branch evidence", targetMaximum: 140 }],
  ["SelfHostedEditorRuntimeErrorState.css", { currentMaximum: 130, owner: "runtime error state", targetMaximum: 130 }],
  ["SelfHostedEditorRuntimeLogBacklog.css", { currentMaximum: 140, owner: "runtime log backlog", targetMaximum: 140 }],
  ["SelfHostedEditorRuntimeSubstateAuthoring.css", { currentMaximum: 140, owner: "runtime substate authoring", targetMaximum: 140 }],
  ["SelfHostedEditorStoryGraph.css", { currentMaximum: 400, owner: "story graph", targetMaximum: 400 }],
  ["SelfHostedEditorSidebar.css", { currentMaximum: 380, owner: "workspace sidebar", targetMaximum: 380 }],
  ["SelfHostedEditorTopbar.css", { currentMaximum: 150, owner: "workspace top bar", targetMaximum: 150 }],
  ["SelfHostedEditorWorkbench.css", { currentMaximum: 22, owner: "style import composition", targetMaximum: 22 }],
  ["SelfHostedEditorWorkspaceLayout.css", { currentMaximum: 260, owner: "workspace shell layout", targetMaximum: 450 }],
]);

let failed = false;

const cssFiles = fs.readdirSync(stylesRoot)
  .filter((name) => name.endsWith(".css"))
  .sort();
const workbenchCss = fs.readFileSync(path.join(stylesRoot, "SelfHostedEditorWorkbench.css"), "utf8").replace(/\r\n/g, "\n");
const importMatches = [...workbenchCss.matchAll(/@import\s+url\("\.\/([^"]+\.css)"\);/g)].map((match) => match[1]);

if (workbenchCss.trim() !== expectedImports.map((name) => `@import url("./${name}");`).join("\n")) {
  console.error("SelfHostedEditorWorkbench.css must only import the expected style modules in order.");
  failed = true;
}

if (new Set(importMatches).size !== importMatches.length) {
  console.error("SelfHostedEditorWorkbench.css must not import a CSS module more than once.");
  failed = true;
}

for (const expectedImport of expectedImports) {
  if (!importMatches.includes(expectedImport)) {
    console.error(`SelfHostedEditorWorkbench.css is missing import: ${expectedImport}`);
    failed = true;
  }
}

for (const cssFile of cssFiles) {
  if (/common|util|utils/i.test(cssFile)) {
    console.error(`SelfHostedEditor style file names must use feature ownership, not Common/Utils naming: ${cssFile}`);
    failed = true;
  }

  const policy = filePolicies.get(cssFile);
  if (!policy) {
    console.error(`SelfHostedEditor CSS file is missing an ownership policy: ${cssFile}`);
    failed = true;
    continue;
  }

  if (cssFile !== "SelfHostedEditorWorkbench.css" && !importMatches.includes(cssFile)) {
    console.error(`SelfHostedEditor CSS file is not imported by Workbench.css: ${cssFile}`);
    failed = true;
  }

  const cssText = fs.readFileSync(path.join(stylesRoot, cssFile), "utf8");
  const lineCount = countLines(cssText);
  if (lineCount > policy.currentMaximum) {
    console.error(`SelfHostedEditor CSS file exceeds current limit (${lineCount}/${policy.currentMaximum}): ${cssFile}`);
    failed = true;
  }

  if (lineCount > policy.targetMaximum) {
    console.warn(`SelfHostedEditor CSS file remains above target ${policy.targetMaximum} lines (${lineCount}): ${cssFile} [owner: ${policy.owner}]`);
  }

  if (cssFile !== "SelfHostedEditorBase.css" && /:root\s*{/.test(cssText)) {
    console.error(`SelfHostedEditor design tokens must stay in SelfHostedEditorBase.css: ${cssFile}`);
    failed = true;
  }

  const hardCodedColorCount = countHardCodedColors(cssText);
  if (cssFile !== "SelfHostedEditorBase.css" && hardCodedColorCount > 24) {
    console.warn(`SelfHostedEditor feature CSS has ${hardCodedColorCount} hard-coded color values; prefer tokens as files are split: ${cssFile}`);
  }
}

for (const cssFile of cssFiles) {
  if (cssFile === "SelfHostedEditorWorkbench.css") {
    continue;
  }

  if (!expectedImports.includes(cssFile)) {
    console.error(`SelfHostedEditor CSS file is not part of the declared import order: ${cssFile}`);
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("SelfHostedEditor style structure ok");
}

function countLines(text) {
  if (!text) {
    return 0;
  }

  return text.replace(/\r\n/g, "\n").split("\n").length;
}

function countHardCodedColors(text) {
  const matches = text.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi);
  return matches ? matches.length : 0;
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredPaths = [
  "README.md",
  "package.json",
  "DevScripts",
  "DevScripts/SelfHostedEditorModelContractCheck.js",
  "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html",
  "Resources/Styles/SelfHostedEditorWorkbench.css",
  "Scripts/Entries/SelfHostedEditorAppEntry.js",
  "Scripts/EditorAuthoring/Bridges/MonacoEditorBridge.js",
  "Scripts/EditorAuthoring/Controllers/EditorCompletionController.js",
  "Scripts/EditorAuthoring/Controllers/EditorDefinitionController.js",
  "Scripts/EditorAuthoring/Controllers/EditorDiagnosticsController.js",
  "Scripts/EditorAuthoring/Controllers/EditorHoverController.js",
  "Scripts/EditorAuthoring/Controllers/EditorRenameController.js",
  "Scripts/EditorAuthoring/Controllers/EditorStatusController.js",
  "Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js",
  "Scripts/EditorAuthoring/Models/EditorCompletionTargetModelBuilder.js",
  "Scripts/EditorAuthoring/Models/EditorHoverTargetModelBuilder.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorDefinitionBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorHoverBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorReferencesBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorStoryGraphBridge.js",
  "Scripts/LanguageServer/Models/LanguageServerCompletionModelMapper.js",
  "Scripts/LanguageServer/Models/LanguageServerDefinitionModelMapper.js",
  "Scripts/LanguageServer/Models/LanguageServerDiagnosticModelMapper.js",
  "Scripts/LanguageServer/Models/LanguageServerDocumentSymbolModelMapper.js",
  "Scripts/LanguageServer/Models/LanguageServerHoverModelMapper.js",
  "Scripts/LanguageServer/Models/LanguageServerReferenceModelMapper.js",
  "Scripts/LanguageServer/Models/LanguageServerStoryGraphModelMapper.js",
  "Scripts/Localization/Controllers/LocalizationEditorController.js",
  "Scripts/Localization/Models/LocalizationDraftCsvBuilder.js",
  "Scripts/Localization/Models/LocalizationDraftStore.js",
  "Scripts/Preview/Controllers/PreviewPanelController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceController.js",
  "Scripts/ProjectWorkspace/Controllers/DocumentOutlineController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceFileListController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSessionController.js",
  "Scripts/ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js",
  "Scripts/StoryGraph/Controllers/StoryGraphPreviewController.js",
  "Scripts/WorkspaceLayout/Controllers/WorkspaceLayoutController.js",
];

const allowedScriptBusinesses = new Set([
  "EditorAuthoring",
  "Entries",
  "HostBinding",
  "HostSchema",
  "LanguageServer",
  "Localization",
  "Preview",
  "ProjectWorkspace",
  "Runtime",
  "StoryGraph",
  "WorkspaceLayout",
]);

let failed = false;

for (const relativePath of requiredPaths) {
  const fullPath = path.join(moduleRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required SelfHostedEditor path: ${relativePath}`);
    failed = true;
  }
}

const scriptsRoot = path.join(moduleRoot, "Scripts");
if (fs.existsSync(scriptsRoot)) {
  for (const entry of fs.readdirSync(scriptsRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowedScriptBusinesses.has(entry.name)) {
      console.error(`Unexpected SelfHostedEditor Scripts business directory: ${entry.name}`);
      failed = true;
    }
  }
}

const htmlPath = path.join(moduleRoot, "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html");
const html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes("/Scripts/Entries/SelfHostedEditorAppEntry.js")) {
  console.error("Workbench document must load /Scripts/Entries/SelfHostedEditorAppEntry.js.");
  failed = true;
}

const packageJson = JSON.parse(fs.readFileSync(path.join(moduleRoot, "package.json"), "utf8"));
if (!packageJson.scripts["check:model"] || !packageJson.scripts["check:structure"] || !packageJson.scripts["check:syntax"]) {
  console.error("SelfHostedEditor package.json must expose check:model, check:structure, and check:syntax.");
  failed = true;
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("SelfHostedEditor structure ok");
}

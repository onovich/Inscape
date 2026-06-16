import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");

const requiredPaths = [
  "README.md",
  "package.json",
  "Desktop",
  "Desktop/ElectronAppEntry.js",
  "Desktop/ElectronMain.js",
  "Desktop/ElectronPreloadApi.js",
  "Desktop/ElectronPreload.js",
  "DevScripts",
  "DevScripts/SelfHostedEditorBackendServiceContractCheck.js",
  "DevScripts/SelfHostedEditorApiHandlerBridge.js",
  "DevScripts/SelfHostedEditorBackendTransportContractCheck.js",
  "DevScripts/SelfHostedEditorDesktopBackendContractCheck.js",
  "DevScripts/SelfHostedEditorElectronBoundaryContractCheck.js",
  "DevScripts/SelfHostedEditorElectronShellContractCheck.js",
  "DevScripts/SelfHostedEditorFakeEmbeddedTransport.js",
  "DevScripts/SelfHostedEditorFakeEmbeddedTransportContractCheck.js",
  "DevScripts/SelfHostedEditorHttpBridge.js",
  "DevScripts/SelfHostedEditorHttpBridgeContractCheck.js",
  "DevScripts/SelfHostedEditorLanguageSessionBridge.js",
  "DevScripts/SelfHostedEditorLanguageSessionBridgeContractCheck.js",
  "DevScripts/SelfHostedEditorModelContractSuite.js",
  "DevScripts/SelfHostedEditorPreloadTransportContractCheck.js",
  "DevScripts/SelfHostedEditorPayloadBridge.js",
  "DevScripts/SelfHostedEditorPayloadBridgeContractCheck.js",
  "DevScripts/ModelContracts",
  "DevScripts/ModelContracts/SelfHostedEditorHostCapabilityContractCheck.js",
  "DevScripts/ModelContracts/SelfHostedEditorLocalizationContractCheck.js",
  "DevScripts/ModelContracts/SelfHostedEditorModelContractHarness.js",
  "DevScripts/ModelContracts/SelfHostedEditorModelShapeContractCheck.js",
  "DevScripts/ModelContracts/SelfHostedEditorNodeMapContractCheck.js",
  "DevScripts/ModelContracts/SelfHostedEditorPreviewRuntimeContractCheck.js",
  "DevScripts/ModelContracts/SelfHostedEditorStoryGraphContractCheck.js",
  "DevScripts/SelfHostedEditorModelContractCheck.js",
  "DevScripts/SelfHostedEditorProcessBridge.js",
  "DevScripts/SelfHostedEditorProcessBridgeContractCheck.js",
  "DevScripts/SelfHostedEditorProjectSessionContractCheck.js",
  "DevScripts/SelfHostedEditorRouteBridge.js",
  "DevScripts/SelfHostedEditorSessionCacheContractCheck.js",
  "DevScripts/SelfHostedEditorSessionCacheHttpSmoke.js",
  "DevScripts/SelfHostedEditorSessionBridge.js",
  "DevScripts/SelfHostedEditorStaticAssetBridge.js",
  "DevScripts/SelfHostedEditorStaticAssetBridgeContractCheck.js",
  "DevScripts/SelfHostedEditorStaticAssetHttpSmoke.js",
  "DevScripts/SelfHostedEditorStyleStructureContractCheck.js",
  "DevScripts/SelfHostedEditorSyntaxContractCheck.js",
  "DevScripts/SelfHostedEditorWorkspaceBridge.js",
  "DevScripts/SelfHostedEditorReferencesHttpSmoke.js",
  "DevScripts/SelfHostedEditorReferencesSmoke.js",
  "DevScripts/SelfHostedEditorSemanticParityHttpSmoke.js",
  "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html",
  "Resources/Styles/SelfHostedEditorBase.css",
  "Resources/Styles/SelfHostedEditorAuthoringDecorations.css",
  "Resources/Styles/SelfHostedEditorDiagnosticsStatus.css",
  "Resources/Styles/SelfHostedEditorEditorAuthoring.css",
  "Resources/Styles/SelfHostedEditorHostCapability.css",
  "Resources/Styles/SelfHostedEditorLineHintRail.css",
  "Resources/Styles/SelfHostedEditorLocalization.css",
  "Resources/Styles/SelfHostedEditorLoadingState.css",
  "Resources/Styles/SelfHostedEditorNodeMapReview.css",
  "Resources/Styles/SelfHostedEditorPreview.css",
  "Resources/Styles/SelfHostedEditorReferenceOverlay.css",
  "Resources/Styles/SelfHostedEditorStoryGraph.css",
  "Resources/Styles/SelfHostedEditorSidebar.css",
  "Resources/Styles/SelfHostedEditorTopbar.css",
  "Resources/Styles/SelfHostedEditorWorkspaceLayout.css",
  "Resources/Styles/SelfHostedEditorWorkbench.css",
  "Scripts/Backend/Clients/EditorBackendClient.js",
  "Scripts/Backend/Clients/EditorBackendServiceRegistry.js",
  "Scripts/Backend/Clients/EditorBackendTransport.js",
  "Scripts/Backend/Clients/SelfHostedEditorHttpBackendTransport.js",
  "Scripts/Backend/Clients/SelfHostedEditorPreloadBackendTransport.js",
  "Scripts/Backend/Models/EditorBackendDesktopSessionModel.js",
  "Scripts/Backend/Models/EditorBackendLanguageSessionRequestModel.js",
  "Scripts/Backend/Models/EditorBackendProjectSessionModel.js",
  "Scripts/Backend/Models/EditorBackendSessionStatusModel.js",
  "Scripts/Entries/SelfHostedEditorAppEntry.js",
  "Scripts/Entries/SelfHostedEditorDomBindings.js",
  "Scripts/Entries/SelfHostedEditorFeatureBootstrapper.js",
  "Scripts/Entries/SelfHostedEditorNodeRenameDialog.js",
  "Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js",
  "Scripts/EditorAuthoring/Bridges/MonacoEditorBridge.js",
  "Scripts/EditorAuthoring/Bridges/SelfHostedEditorStoryNodeMapBridge.js",
  "Scripts/EditorAuthoring/Controllers/EditorCompletionController.js",
  "Scripts/EditorAuthoring/Controllers/EditorDefinitionController.js",
  "Scripts/EditorAuthoring/Controllers/EditorDiagnosticsController.js",
  "Scripts/EditorAuthoring/Controllers/EditorHoverController.js",
  "Scripts/EditorAuthoring/Controllers/EditorLineHintController.js",
  "Scripts/EditorAuthoring/Controllers/EditorRenameController.js",
  "Scripts/EditorAuthoring/Controllers/EditorSemanticDecorationController.js",
  "Scripts/EditorAuthoring/Controllers/EditorStatusController.js",
  "Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js",
  "Scripts/EditorAuthoring/Controllers/StoryNodeMapReviewController.js",
  "Scripts/EditorAuthoring/Models/EditorCompletionTargetModelBuilder.js",
  "Scripts/EditorAuthoring/Models/EditorHoverTargetModelBuilder.js",
  "Scripts/HostBinding/Bridges/SelfHostedEditorHostBindingBridge.js",
  "Scripts/HostBinding/Models/HostBindingCapabilityModelMapper.js",
  "Scripts/HostSchema/Bridges/SelfHostedEditorHostSchemaBridge.js",
  "Scripts/HostSchema/Controllers/HostCapabilityCatalogController.js",
  "Scripts/HostSchema/Models/HostSchemaCapabilityModelMapper.js",
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
  "Scripts/Localization/Bridges/SelfHostedEditorLocalizationReviewBridge.js",
  "Scripts/Localization/Controllers/LocalizationCsvFileController.js",
  "Scripts/Localization/Controllers/LocalizationEditorController.js",
  "Scripts/Localization/Models/LocalizationDraftCsvBuilder.js",
  "Scripts/Localization/Models/LocalizationDraftStore.js",
  "Scripts/Localization/Models/LocalizationExportReadinessModelBuilder.js",
  "Scripts/Localization/Models/LocalizationReviewRowsModelBuilder.js",
  "Scripts/Localization/Models/LocalizationVisibleRowsModelBuilder.js",
  "Scripts/Localization/Renderers/LocalizationTableRenderer.js",
  "Scripts/Preview/Controllers/PreviewPanelController.js",
  "Scripts/Preview/Models/PreviewCompilerGraphContractGuard.js",
  "Scripts/Preview/Models/PreviewFlowStatePresenter.js",
  "Scripts/Preview/Models/PreviewRuntimePreferenceModelBuilder.js",
  "Scripts/Preview/Renderers/PreviewBlockRenderer.js",
  "Scripts/Preview/Renderers/PreviewChoiceRenderer.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceController.js",
  "Scripts/ProjectWorkspace/Controllers/DocumentOutlineController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceFileListController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js",
  "Scripts/ProjectWorkspace/Controllers/ProjectWorkspaceSessionController.js",
  "Scripts/ProjectWorkspace/Models/ProjectWorkspaceDraftSummaryModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptBlockEditPatchBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js",
  "Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js",
  "Scripts/ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js",
  "Scripts/ProjectWorkspace/Models/WorkspaceSummaryHostedModelBuilder.js",
  "Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js",
  "Scripts/StoryGraph/Controllers/StoryGraphInteractionController.js",
  "Scripts/StoryGraph/Controllers/StoryGraphPreviewController.js",
  "Scripts/StoryGraph/Controllers/StoryGraphViewportController.js",
  "Scripts/StoryGraph/Models/StoryGraphPortGeometryModelBuilder.js",
  "Scripts/StoryGraph/Renderers/StoryGraphEdgeRenderer.js",
  "Scripts/StoryGraph/Renderers/StoryGraphNodeRenderer.js",
  "Scripts/WorkspaceLayout/Controllers/WorkspaceLoadingStateController.js",
  "Scripts/WorkspaceLayout/Controllers/WorkspaceLayoutController.js",
];

const allowedScriptBusinesses = new Set([
  "Backend",
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

const allowedApiRouteScripts = new Set([
  "Scripts/Backend/Clients/EditorBackendTransport.js",
]);

const allowedBackendClientScripts = new Set([
  "Scripts/Backend/Clients/EditorBackendClient.js",
  "Scripts/Backend/Clients/EditorBackendServiceRegistry.js",
]);

const allowedTransportScripts = new Set([
  "Scripts/Backend/Clients/EditorBackendClient.js",
  "Scripts/Backend/Clients/EditorBackendTransport.js",
  "Scripts/Backend/Clients/SelfHostedEditorHttpBackendTransport.js",
  "Scripts/Backend/Clients/SelfHostedEditorPreloadBackendTransport.js",
]);

const forbiddenRendererRuntimePatterns = [
  {
    label: "node: import",
    pattern: /from\s+["']node:/,
  },
  {
    label: "Electron import",
    pattern: /from\s+["']electron["']|import\s*\(\s*["']electron["']\s*\)/,
  },
  {
    label: "Node require",
    pattern: /\brequire\s*\(\s*["'](?:node:)?(?:fs|path|child_process|os|process|url)["']\s*\)/,
  },
  {
    label: "Electron renderer IPC",
    pattern: /\b(?:ipcRenderer|contextBridge|BrowserWindow)\b/,
  },
  {
    label: "child_process",
    pattern: /\bchild_process\b/,
  },
];

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

  for (const scriptPath of getJavaScriptFiles(scriptsRoot)) {
    const relativeScriptPath = path.relative(moduleRoot, scriptPath).replace(/\\/g, "/");
    const scriptText = fs.readFileSync(scriptPath, "utf8");
    if (scriptText.includes("/api/") && !allowedApiRouteScripts.has(relativeScriptPath)) {
      console.error(`SelfHostedEditor production Scripts must not know dev-host API routes: ${relativeScriptPath}`);
      failed = true;
    }

    if (/fetch\s*\(\s*["']\/api\//.test(scriptText)) {
      console.error(`SelfHostedEditor UI code must route dev-host API calls through EditorBackendClient: ${relativeScriptPath}`);
      failed = true;
    }

    for (const runtimePattern of forbiddenRendererRuntimePatterns) {
      if (runtimePattern.pattern.test(scriptText)) {
        console.error(`SelfHostedEditor renderer Scripts must not access ${runtimePattern.label}: ${relativeScriptPath}`);
        failed = true;
      }
    }

    if (scriptText.includes("EditorBackendClient") && !allowedBackendClientScripts.has(relativeScriptPath)) {
      console.error(`SelfHostedEditor production Scripts must reach backend through narrow services, not EditorBackendClient: ${relativeScriptPath}`);
      failed = true;
    }

    if (
      !allowedTransportScripts.has(relativeScriptPath)
      && (
        scriptText.includes("EditorBackendTransport")
        || scriptText.includes("SelfHostedEditorHttpBackendTransport")
        || scriptText.includes(".invoke(")
      )
    ) {
      console.error(`SelfHostedEditor transport details must stay behind EditorBackendClient: ${relativeScriptPath}`);
      failed = true;
    }

    if (
      relativeScriptPath !== "Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js"
      && relativeScriptPath !== "Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js"
    ) {
      if (scriptText.includes("ScriptDocumentModelBuilder")) {
        console.error(`SelfHostedEditor draft document fallback must go through ScriptDocumentFallbackPolicy: ${relativeScriptPath}`);
        failed = true;
      }
    }
  }
}

function getJavaScriptFiles(rootPath) {
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

const htmlPath = path.join(moduleRoot, "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html");
const html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes("/Scripts/Entries/SelfHostedEditorAppEntry.js")) {
  console.error("Workbench document must load /Scripts/Entries/SelfHostedEditorAppEntry.js.");
  failed = true;
}

if (!html.includes('data-view="host"') || !html.includes("host-capability-panel")) {
  console.error("Workbench document must expose the Host capability view and panel.");
  failed = true;
}

const editorBackendClientPath = path.join(moduleRoot, "Scripts/Backend/Clients/EditorBackendClient.js");
const editorBackendClientText = fs.readFileSync(editorBackendClientPath, "utf8");
if (editorBackendClientText.includes("/api/")) {
  console.error("EditorBackendClient must call backend transport commands instead of dev-host /api routes.");
  failed = true;
}
if (!editorBackendClientText.includes("EditorBackendTransportCommand") || !editorBackendClientText.includes(".invoke(")) {
  console.error("EditorBackendClient must use the command-based EditorBackendTransport contract.");
  failed = true;
}

const httpBackendTransportPath = path.join(moduleRoot, "Scripts/Backend/Clients/SelfHostedEditorHttpBackendTransport.js");
const httpBackendTransportText = fs.readFileSync(httpBackendTransportPath, "utf8");
if (!httpBackendTransportText.includes("resolveEditorBackendDevHostRoute") || !httpBackendTransportText.includes("async invoke(command")) {
  console.error("SelfHostedEditorHttpBackendTransport must map backend commands to dev-host routes.");
  failed = true;
}

const serviceRegistryPath = path.join(moduleRoot, "Scripts/Backend/Clients/EditorBackendServiceRegistry.js");
const serviceRegistryText = fs.readFileSync(serviceRegistryPath, "utf8");
for (const expectedService of [
  "ProjectSessionService",
  "DocumentBufferStore",
  "LanguageSessionClient",
  "RuntimeSessionClient",
  "LocalizationWorkflowClient",
]) {
  if (!serviceRegistryText.includes(expectedService)) {
    console.error(`EditorBackendServiceRegistry must expose ${expectedService}.`);
    failed = true;
  }
}
if (!serviceRegistryText.includes("createEditorBackendServices") || !serviceRegistryText.includes("listEditorBackendServiceKeys")) {
  console.error("EditorBackendServiceRegistry must expose a narrow service factory and key list.");
  failed = true;
}

const fakeEmbeddedTransportPath = path.join(moduleRoot, "DevScripts/SelfHostedEditorFakeEmbeddedTransport.js");
const fakeEmbeddedTransportText = fs.readFileSync(fakeEmbeddedTransportPath, "utf8");
if (fakeEmbeddedTransportText.includes("/api/") || fakeEmbeddedTransportText.includes("fetch(") || fakeEmbeddedTransportText.includes("postJson")) {
  console.error("SelfHostedEditorFakeEmbeddedTransport must stay command-only and independent from dev-host HTTP routes.");
  failed = true;
}

for (const relativeBridgePath of [
  "Scripts/EditorAuthoring/Bridges/SelfHostedEditorStoryNodeMapBridge.js",
  "Scripts/HostBinding/Bridges/SelfHostedEditorHostBindingBridge.js",
  "Scripts/HostSchema/Bridges/SelfHostedEditorHostSchemaBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorDefinitionBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorHoverBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorReferencesBridge.js",
  "Scripts/LanguageServer/Bridges/SelfHostedEditorStoryGraphBridge.js",
  "Scripts/Localization/Bridges/SelfHostedEditorLocalizationReviewBridge.js",
  "Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js",
]) {
  const bridgeText = fs.readFileSync(path.join(moduleRoot, relativeBridgePath), "utf8");
  if (bridgeText.includes("EditorBackendClient") || bridgeText.includes("backendClient")) {
    console.error(`SelfHostedEditor feature bridges must depend on narrow backend services: ${relativeBridgePath}`);
    failed = true;
  }
}

const featureBootstrapperPath = path.join(moduleRoot, "Scripts/Entries/SelfHostedEditorFeatureBootstrapper.js");
const featureBootstrapperText = fs.readFileSync(featureBootstrapperPath, "utf8");
if (!featureBootstrapperText.includes("createEditorBackendServices") || featureBootstrapperText.includes("new EditorBackendClient")) {
  console.error("SelfHostedEditorFeatureBootstrapper must create narrow backend services instead of EditorBackendClient directly.");
  failed = true;
}

const workbenchCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorWorkbench.css");
const workbenchBaseCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorBase.css");
const workbenchAuthoringDecorationsCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorAuthoringDecorations.css");
const workbenchDiagnosticsStatusCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorDiagnosticsStatus.css");
const workbenchEditorAuthoringCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorEditorAuthoring.css");
const workbenchHostCapabilityCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorHostCapability.css");
const workbenchLineHintRailCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorLineHintRail.css");
const workbenchLocalizationCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorLocalization.css");
const workbenchLoadingStateCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorLoadingState.css");
const workbenchNodeMapReviewCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorNodeMapReview.css");
const workbenchPreviewCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorPreview.css");
const workbenchReferenceOverlayCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorReferenceOverlay.css");
const workbenchStoryGraphCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorStoryGraph.css");
const workbenchSidebarCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorSidebar.css");
const workbenchTopbarCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorTopbar.css");
const workbenchWorkspaceLayoutCssPath = path.join(moduleRoot, "Resources/Styles/SelfHostedEditorWorkspaceLayout.css");
const workbenchCss = fs.readFileSync(workbenchCssPath, "utf8");
const workbenchBaseCss = fs.readFileSync(workbenchBaseCssPath, "utf8");
const workbenchAuthoringDecorationsCss = fs.readFileSync(workbenchAuthoringDecorationsCssPath, "utf8");
const workbenchDiagnosticsStatusCss = fs.readFileSync(workbenchDiagnosticsStatusCssPath, "utf8");
const workbenchEditorAuthoringCss = fs.readFileSync(workbenchEditorAuthoringCssPath, "utf8");
const workbenchHostCapabilityCss = fs.readFileSync(workbenchHostCapabilityCssPath, "utf8");
const workbenchLineHintRailCss = fs.readFileSync(workbenchLineHintRailCssPath, "utf8");
const workbenchLocalizationCss = fs.readFileSync(workbenchLocalizationCssPath, "utf8");
const workbenchLoadingStateCss = fs.readFileSync(workbenchLoadingStateCssPath, "utf8");
const workbenchNodeMapReviewCss = fs.readFileSync(workbenchNodeMapReviewCssPath, "utf8");
const workbenchPreviewCss = fs.readFileSync(workbenchPreviewCssPath, "utf8");
const workbenchReferenceOverlayCss = fs.readFileSync(workbenchReferenceOverlayCssPath, "utf8");
const workbenchStoryGraphCss = fs.readFileSync(workbenchStoryGraphCssPath, "utf8");
const workbenchSidebarCss = fs.readFileSync(workbenchSidebarCssPath, "utf8");
const workbenchTopbarCss = fs.readFileSync(workbenchTopbarCssPath, "utf8");
const workbenchWorkspaceLayoutCss = fs.readFileSync(workbenchWorkspaceLayoutCssPath, "utf8");
const normalizedWorkbenchCss = workbenchCss.replace(/\r\n/g, "\n");
const expectedWorkbenchCssImports = [
  '@import url("./SelfHostedEditorBase.css");',
  '@import url("./SelfHostedEditorWorkspaceLayout.css");',
  '@import url("./SelfHostedEditorSidebar.css");',
  '@import url("./SelfHostedEditorTopbar.css");',
  '@import url("./SelfHostedEditorLoadingState.css");',
  '@import url("./SelfHostedEditorDiagnosticsStatus.css");',
  '@import url("./SelfHostedEditorEditorAuthoring.css");',
  '@import url("./SelfHostedEditorLineHintRail.css");',
  '@import url("./SelfHostedEditorReferenceOverlay.css");',
  '@import url("./SelfHostedEditorAuthoringDecorations.css");',
  '@import url("./SelfHostedEditorPreview.css");',
  '@import url("./SelfHostedEditorLocalization.css");',
  '@import url("./SelfHostedEditorHostCapability.css");',
  '@import url("./SelfHostedEditorNodeMapReview.css");',
  '@import url("./SelfHostedEditorStoryGraph.css");',
].join("\n");
if (!normalizedWorkbenchCss.startsWith(expectedWorkbenchCssImports)) {
  console.error("SelfHostedEditor workbench CSS must import the split CSS modules in the expected order.");
  failed = true;
}
const workbenchCssBody = normalizedWorkbenchCss.slice(expectedWorkbenchCssImports.length).trim();
if (workbenchCssBody.length > 0) {
  console.error("SelfHostedEditor workbench CSS must only compose split CSS modules through imports.");
  failed = true;
}
if (workbenchCss.includes(":root {") || /^body\s*{/m.test(workbenchCss)) {
  console.error("SelfHostedEditor global design tokens and body reset must live in SelfHostedEditorBase.css.");
  failed = true;
}
if (
  !workbenchBaseCss.includes(":root {")
  || !workbenchBaseCss.includes("--editor-width: 700px;")
  || !workbenchBaseCss.includes("--preview-width: 560px;")
  || !workbenchBaseCss.includes("box-sizing: border-box;")
  || !workbenchBaseCss.includes("overflow: hidden;")
) {
  console.error("SelfHostedEditorBase.css must retain the workbench global tokens and reset rules.");
  failed = true;
}
if (
  /@keyframes\s+loading-breath/.test(workbenchCss)
  || /^\[data-loading-state\]\s*{/m.test(workbenchCss)
  || /^\.app-shell\s*{/m.test(workbenchCss)
  || /^\.app-sidebar\b/m.test(workbenchCss)
  || /^\.top-bar\s*{/m.test(workbenchCss)
  || /^\.workbench-body\s*{/m.test(workbenchCss)
  || /^\.diagnostics-dock\s*{/m.test(workbenchCss)
  || /^\.workspace-summary\s*{/m.test(workbenchCss)
  || /^\.placeholder-panel\s*{/m.test(workbenchCss)
  || /^\.status-bar\s*{/m.test(workbenchCss)
  || /^\.editor-frame\s*{/m.test(workbenchCss)
  || /^\.hint-rail\s*{/m.test(workbenchCss)
  || /^\.script-editor\b/m.test(workbenchCss)
  || /@keyframes\s+story-speaker-enter/.test(workbenchCss)
  || /^\.preview-mode-switcher\s*{/m.test(workbenchCss)
  || /^\.story-preview\s*{/m.test(workbenchCss)
  || /^\.story-line\s*{/m.test(workbenchCss)
  || /^\.choice-button\s*{/m.test(workbenchCss)
  || /^\.localization-toolbar\s*{/m.test(workbenchCss)
  || /^\.localization-table\s*{/m.test(workbenchCss)
  || /^\.localization-review-action\s*{/m.test(workbenchCss)
  || /^\.localization-translation-input\s*{/m.test(workbenchCss)
  || /^\.status-pill\s*{/m.test(workbenchCss)
  || /^\.host-capability-panel\s*{/m.test(workbenchCss)
  || /^\.host-capability-summary\s*{/m.test(workbenchCss)
  || /^\.host-capability-item\s*{/m.test(workbenchCss)
  || /^\.host-capability-source\s*{/m.test(workbenchCss)
  || /^\.node-map-review-overlay\s*{/m.test(workbenchCss)
  || /^\.node-map-review-item\s*{/m.test(workbenchCss)
  || /^\.node-map-review-candidate-action\s*{/m.test(workbenchCss)
  || /^\.graph-viewport\s*{/m.test(workbenchCss)
  || /^\.graph-node\s*{/m.test(workbenchCss)
  || /^\.graph-port-row\s*{/m.test(workbenchCss)
  || /^\.graph-edge-path\s*{/m.test(workbenchCss)
  || /@media\s+\(max-width:/.test(workbenchCss)
) {
  console.error("SelfHostedEditor workbench CSS must leave loading, workspace shell, diagnostics/status, editor authoring, preview, localization, host capability, node-map review, and story graph styles in their split CSS modules.");
  failed = true;
}
if (
  !/^\.diagnostics-dock\s*{/m.test(workbenchDiagnosticsStatusCss)
  || !/^\.diagnostics-filter-button\s*{/m.test(workbenchDiagnosticsStatusCss)
  || !/\.diagnostic-item\s*{/.test(workbenchDiagnosticsStatusCss)
  || !/^\.placeholder-panel\s*{/m.test(workbenchDiagnosticsStatusCss)
  || !/^\.status-bar\s*{/m.test(workbenchDiagnosticsStatusCss)
  || !/^\.status-bar-nav-button\s*{/m.test(workbenchDiagnosticsStatusCss)
) {
  console.error("SelfHostedEditorDiagnosticsStatus.css must retain diagnostics dock, placeholder, and status bar rules.");
  failed = true;
}
if (
  /^\.app-shell\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.workspace\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.editor-frame\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.story-preview\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.localization-toolbar\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.host-capability-panel\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.node-map-review-overlay\s*{/m.test(workbenchDiagnosticsStatusCss)
  || /^\.graph-viewport\s*{/m.test(workbenchDiagnosticsStatusCss)
) {
  console.error("SelfHostedEditorDiagnosticsStatus.css must not absorb workspace layout, editor authoring, preview, localization, host capability, node-map review, or graph rules.");
  failed = true;
}
if (
  !/^\.editor-frame\s*{/m.test(workbenchEditorAuthoringCss)
  || !/^\.script-editor\s*{/m.test(workbenchEditorAuthoringCss)
  || !/^\.rename-dialog-overlay\s*{/m.test(workbenchEditorAuthoringCss)
  || !/\.script-editor\s+\.monaco-editor\s+\.monaco-hover/.test(workbenchEditorAuthoringCss)
  || !/\.script-editor\s+\.monaco-editor\s+\.suggest-widget/.test(workbenchEditorAuthoringCss)
) {
  console.error("SelfHostedEditorEditorAuthoring.css must retain the editor frame, rename dialog, Monaco hover, and suggest widget shell rules.");
  failed = true;
}
if (
  /^\.hint-rail\s*{/m.test(workbenchEditorAuthoringCss)
  || /^\.editor-reference-overlay\s*{/m.test(workbenchEditorAuthoringCss)
  || /\.script-editor\s+\.monaco-editor\s+\.inscape-node-title-text/.test(workbenchEditorAuthoringCss)
  || /^\.story-preview\s*{/m.test(workbenchEditorAuthoringCss)
  || /^\.localization-toolbar\s*{/m.test(workbenchEditorAuthoringCss)
  || /^\.graph-viewport\s*{/m.test(workbenchEditorAuthoringCss)
) {
  console.error("SelfHostedEditorEditorAuthoring.css must not absorb hint rail, references overlay, semantic decorations, preview, localization, or graph rules.");
  failed = true;
}
if (
  !/^\.hint-rail\s*{/m.test(workbenchLineHintRailCss)
  || !/^\.hint-line\s*{/m.test(workbenchLineHintRailCss)
  || !/^\.hint-stable-id\s*{/m.test(workbenchLineHintRailCss)
  || !/^\.hint-line-reference-button\s*{/m.test(workbenchLineHintRailCss)
  || !/^\.hint-line-grip\s*{/m.test(workbenchLineHintRailCss)
) {
  console.error("SelfHostedEditorLineHintRail.css must retain hint rail, stable id, reference action, and drag grip rules.");
  failed = true;
}
if (/^\.editor-frame\s*{/m.test(workbenchLineHintRailCss) || /^\.script-editor\s*{/m.test(workbenchLineHintRailCss) || /^\.editor-reference-overlay\s*{/m.test(workbenchLineHintRailCss) || /\.inscape-node-title-text/.test(workbenchLineHintRailCss)) {
  console.error("SelfHostedEditorLineHintRail.css must not absorb editor shell, references overlay, or semantic decoration rules.");
  failed = true;
}
if (
  !/^\.editor-reference-overlay\s*{/m.test(workbenchReferenceOverlayCss)
  || !/^\.editor-reference-overlay-list\s*{/m.test(workbenchReferenceOverlayCss)
  || !/\.editor-reference-overlay-item\s*{/.test(workbenchReferenceOverlayCss)
  || !/^\.editor-reference-overlay-context-line\s*{/m.test(workbenchReferenceOverlayCss)
) {
  console.error("SelfHostedEditorReferenceOverlay.css must retain references overlay shell, list, item, and context line rules.");
  failed = true;
}
if (/^\.hint-rail\s*{/m.test(workbenchReferenceOverlayCss) || /^\.script-editor\s*{/m.test(workbenchReferenceOverlayCss) || /\.inscape-node-title-text/.test(workbenchReferenceOverlayCss)) {
  console.error("SelfHostedEditorReferenceOverlay.css must not absorb hint rail, editor shell, or semantic decoration rules.");
  failed = true;
}
if (
  !/\.script-editor\s+\.monaco-editor\s+\.view-overlays\s+\.inscape-node-block-active/.test(workbenchAuthoringDecorationsCss)
  || !/\.script-editor\s+\.monaco-editor\s+\.inscape-node-title-text/.test(workbenchAuthoringDecorationsCss)
  || !/\.script-editor\s+\.monaco-editor\s+\.inscape-dialogue-text/.test(workbenchAuthoringDecorationsCss)
  || !/\.script-editor\s+\.monaco-editor\s+\.inscape-query-token-text/.test(workbenchAuthoringDecorationsCss)
) {
  console.error("SelfHostedEditorAuthoringDecorations.css must retain editor semantic decoration rules.");
  failed = true;
}
if (/^\.editor-frame\s*{/m.test(workbenchAuthoringDecorationsCss) || /^\.hint-rail\s*{/m.test(workbenchAuthoringDecorationsCss) || /^\.editor-reference-overlay\s*{/m.test(workbenchAuthoringDecorationsCss) || /^\.story-preview\s*{/m.test(workbenchAuthoringDecorationsCss) || /^\.localization-toolbar\s*{/m.test(workbenchAuthoringDecorationsCss) || /^\.graph-viewport\s*{/m.test(workbenchAuthoringDecorationsCss)) {
  console.error("SelfHostedEditorAuthoringDecorations.css must not absorb editor shell, hint rail, references overlay, preview, localization, or graph rules.");
  failed = true;
}
if (
  !/@keyframes\s+story-speaker-enter/.test(workbenchPreviewCss)
  || !/@keyframes\s+story-typewriter-caret/.test(workbenchPreviewCss)
  || !/^\.preview-mode-switcher\s*{/m.test(workbenchPreviewCss)
  || !/^\.story-preview\s*{/m.test(workbenchPreviewCss)
  || !/^\.story-runtime-history\s*{/m.test(workbenchPreviewCss)
  || !/^\.story-line\s*{/m.test(workbenchPreviewCss)
  || !/^\.choice-button\s*{/m.test(workbenchPreviewCss)
) {
  console.error("SelfHostedEditorPreview.css must retain the preview mode switcher, reading surface, Runtime path, story line, and choice rules.");
  failed = true;
}
if (/^\.localization-toolbar\s*{/m.test(workbenchPreviewCss) || /^\.diagnostics-dock\s*{/m.test(workbenchPreviewCss) || /^\.graph-viewport\s*{/m.test(workbenchPreviewCss) || /^\.editor-frame\s*{/m.test(workbenchPreviewCss)) {
  console.error("SelfHostedEditorPreview.css must not absorb localization, diagnostics, graph, or editor authoring rules.");
  failed = true;
}
if (
  !/^\.localization-toolbar\s*{/m.test(workbenchLocalizationCss)
  || !/^\.localization-filter-select\s*{/m.test(workbenchLocalizationCss)
  || !/^\.localization-table\s*{/m.test(workbenchLocalizationCss)
  || !/^\.status-pill\s*{/m.test(workbenchLocalizationCss)
  || !/^\.localization-review-actions\s*{/m.test(workbenchLocalizationCss)
  || !/^\.localization-translation-input\s*{/m.test(workbenchLocalizationCss)
) {
  console.error("SelfHostedEditorLocalization.css must retain localization toolbar, table, status, review action, and translation input rules.");
  failed = true;
}
if (/^\.diagnostics-dock\s*{/m.test(workbenchLocalizationCss) || /^\.host-capability-panel\s*{/m.test(workbenchLocalizationCss) || /^\.graph-viewport\s*{/m.test(workbenchLocalizationCss) || /^\.story-preview\s*{/m.test(workbenchLocalizationCss) || /^\.editor-frame\s*{/m.test(workbenchLocalizationCss)) {
  console.error("SelfHostedEditorLocalization.css must not absorb diagnostics, host capability, graph, preview, or editor authoring rules.");
  failed = true;
}
if (
  !/^\.host-capability-panel\s*{/m.test(workbenchHostCapabilityCss)
  || !/^\.host-capability-summary\s*{/m.test(workbenchHostCapabilityCss)
  || !/^\.host-capability-section-header\s*{/m.test(workbenchHostCapabilityCss)
  || !/^\.host-capability-list\s*{/m.test(workbenchHostCapabilityCss)
  || !/^\.host-capability-item-main\s*{/m.test(workbenchHostCapabilityCss)
  || !/^\.host-capability-source\s*{/m.test(workbenchHostCapabilityCss)
) {
  console.error("SelfHostedEditorHostCapability.css must retain Host capability panel, summary, section, item, and source-jump rules.");
  failed = true;
}
if (/^\.diagnostics-dock\s*{/m.test(workbenchHostCapabilityCss) || /^\.localization-toolbar\s*{/m.test(workbenchHostCapabilityCss) || /^\.node-map-review-overlay\s*{/m.test(workbenchHostCapabilityCss) || /^\.graph-viewport\s*{/m.test(workbenchHostCapabilityCss) || /^\.story-preview\s*{/m.test(workbenchHostCapabilityCss) || /^\.editor-frame\s*{/m.test(workbenchHostCapabilityCss)) {
  console.error("SelfHostedEditorHostCapability.css must not absorb diagnostics, localization, node-map review, graph, preview, or editor authoring rules.");
  failed = true;
}
if (
  !/^\.node-map-review-overlay\s*{/m.test(workbenchNodeMapReviewCss)
  || !/^\.node-map-review-dialog\s*{/m.test(workbenchNodeMapReviewCss)
  || !/^\.node-map-review-item-main\s*{/m.test(workbenchNodeMapReviewCss)
  || !/^\.node-map-review-kind\s*{/m.test(workbenchNodeMapReviewCss)
  || !/^\.node-map-review-candidate-action\s*{/m.test(workbenchNodeMapReviewCss)
  || !/^\.node-map-review-candidate-apply\s*{/m.test(workbenchNodeMapReviewCss)
) {
  console.error("SelfHostedEditorNodeMapReview.css must retain node-map review overlay, dialog, item, kind, and candidate action rules.");
  failed = true;
}
if (/^\.diagnostics-dock\s*{/m.test(workbenchNodeMapReviewCss) || /^\.localization-toolbar\s*{/m.test(workbenchNodeMapReviewCss) || /^\.host-capability-panel\s*{/m.test(workbenchNodeMapReviewCss) || /^\.graph-viewport\s*{/m.test(workbenchNodeMapReviewCss) || /^\.story-preview\s*{/m.test(workbenchNodeMapReviewCss) || /^\.editor-frame\s*{/m.test(workbenchNodeMapReviewCss)) {
  console.error("SelfHostedEditorNodeMapReview.css must not absorb diagnostics, localization, host capability, graph, preview, or editor authoring rules.");
  failed = true;
}
if (
  !/^\.graph-viewport\s*{/m.test(workbenchStoryGraphCss)
  || !/^\.app-shell\[data-view="graph"\]\s+\.graph-viewport\s*{/m.test(workbenchStoryGraphCss)
  || !/^\.graph-board\s*{/m.test(workbenchStoryGraphCss)
  || !/^\.graph-node\s*{/m.test(workbenchStoryGraphCss)
  || !/^\.graph-port-row\s*{/m.test(workbenchStoryGraphCss)
  || !/^\.graph-edge-path\s*{/m.test(workbenchStoryGraphCss)
  || !/^\.graph-edge-preview-path\s*{/m.test(workbenchStoryGraphCss)
) {
  console.error("SelfHostedEditorStoryGraph.css must retain StoryGraph viewport, board, node, port, and edge rules.");
  failed = true;
}
if (/^\.diagnostics-dock\s*{/m.test(workbenchStoryGraphCss) || /^\.localization-toolbar\s*{/m.test(workbenchStoryGraphCss) || /^\.host-capability-panel\s*{/m.test(workbenchStoryGraphCss) || /^\.node-map-review-overlay\s*{/m.test(workbenchStoryGraphCss) || /^\.story-preview\s*{/m.test(workbenchStoryGraphCss) || /^\.editor-frame\s*{/m.test(workbenchStoryGraphCss)) {
  console.error("SelfHostedEditorStoryGraph.css must not absorb diagnostics, localization, host capability, node-map review, preview, or editor authoring rules.");
  failed = true;
}
if (
  !/@keyframes\s+loading-breath/.test(workbenchLoadingStateCss)
  || !/^\[data-loading-state\]\s*{/m.test(workbenchLoadingStateCss)
  || !/\.app-shell\[data-loading-state="loading"\]\s+\.app-main::before/.test(workbenchLoadingStateCss)
) {
  console.error("SelfHostedEditorLoadingState.css must retain loading animations and loading-state chrome.");
  failed = true;
}
if (/^\.top-bar\s*{/m.test(workbenchLoadingStateCss) || /^\.workspace\s*{/m.test(workbenchLoadingStateCss)) {
  console.error("SelfHostedEditorLoadingState.css must not absorb workspace layout rules.");
  failed = true;
}
if (
  !/^\.app-sidebar\s*{/m.test(workbenchSidebarCss)
  || !/^\.sidebar-brand\s*{/m.test(workbenchSidebarCss)
  || !/^\.view-tabs\s*{/m.test(workbenchSidebarCss)
  || !/^\.workspace-files-shell,\s*\n\.document-outline-shell\s*{/m.test(workbenchSidebarCss.replace(/\r\n/g, "\n"))
  || !/^\.workspace-session-panel,\s*\n\.workspace-runtime-panel\s*{/m.test(workbenchSidebarCss.replace(/\r\n/g, "\n"))
  || !/@media\s+\(max-width: 900px\)/.test(workbenchSidebarCss)
) {
  console.error("SelfHostedEditorSidebar.css must retain sidebar shell, navigation, file/outline, session panel, and responsive sidebar rules.");
  failed = true;
}
if (/^\.top-bar\s*{/m.test(workbenchSidebarCss) || /^\.workbench-body\s*{/m.test(workbenchSidebarCss) || /^\.editor-frame\s*{/m.test(workbenchSidebarCss)) {
  console.error("SelfHostedEditorSidebar.css must not absorb top bar, workspace shell, or editor-surface rules.");
  failed = true;
}
if (
  !/^\.top-bar\s*{/m.test(workbenchTopbarCss)
  || !/^\.top-bar-copy\s*{/m.test(workbenchTopbarCss)
  || !/^\.layout-switcher\s*{/m.test(workbenchTopbarCss)
  || !/^\.syntax-toggle\s*{/m.test(workbenchTopbarCss)
  || !/^\.node-map-review-button\s*{/m.test(workbenchTopbarCss)
  || !/@media\s+\(max-width: 900px\)/.test(workbenchTopbarCss)
) {
  console.error("SelfHostedEditorTopbar.css must retain top bar, layout switcher, syntax toggle, node-map action, and responsive top bar rules.");
  failed = true;
}
if (/^\.app-sidebar\s*{/m.test(workbenchTopbarCss) || /^\.workbench-body\s*{/m.test(workbenchTopbarCss) || /^\.editor-frame\s*{/m.test(workbenchTopbarCss)) {
  console.error("SelfHostedEditorTopbar.css must not absorb sidebar, workspace shell, or editor-surface rules.");
  failed = true;
}
if (
  !/^button,\s*\n\.file-open-button\s*{/m.test(workbenchWorkspaceLayoutCss.replace(/\r\n/g, "\n"))
  || !/^\.app-shell\s*{/m.test(workbenchWorkspaceLayoutCss)
  || !/^\.app-main\s*{/m.test(workbenchWorkspaceLayoutCss)
  || !/^\.workbench-body\s*{/m.test(workbenchWorkspaceLayoutCss)
  || !/^\.workspace\s*{/m.test(workbenchWorkspaceLayoutCss)
  || !/^\.workspace-summary\s*{/m.test(workbenchWorkspaceLayoutCss)
  || !/^\.localization-panel,\s*\n\.host-capability-panel,\s*\n\.graph-panel\s*{/m.test(workbenchWorkspaceLayoutCss.replace(/\r\n/g, "\n"))
  || !/^\.pane-title\s*{/m.test(workbenchWorkspaceLayoutCss)
  || !/@media\s+\(max-width: 1180px\)/.test(workbenchWorkspaceLayoutCss)
  || !/@media\s+\(max-width: 900px\)/.test(workbenchWorkspaceLayoutCss)
) {
  console.error("SelfHostedEditorWorkspaceLayout.css must retain the shared shell, app main, workspace, shared panel shell, responsive layout, and pane title rules.");
  failed = true;
}
if (/data-loading-state/.test(workbenchWorkspaceLayoutCss) || /^\s*\.app-sidebar\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\s*\.top-bar\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\s*\.diagnostics-dock\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\s*\.placeholder-panel\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\s*\.status-bar\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\s*\.story-preview\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\.localization-toolbar\s*{/m.test(workbenchWorkspaceLayoutCss) || /^\s*\.editor-frame\s*{/m.test(workbenchWorkspaceLayoutCss)) {
  console.error("SelfHostedEditorWorkspaceLayout.css must not absorb sidebar, top bar, loading, diagnostics/status, localization, preview content, or editor-surface rules.");
  failed = true;
}

const packageJson = JSON.parse(fs.readFileSync(path.join(moduleRoot, "package.json"), "utf8"));
if (!packageJson.scripts["check:model"] || !packageJson.scripts["check:structure"] || !packageJson.scripts["check:style-structure"] || !packageJson.scripts["check:syntax"] || !packageJson.scripts["check:payload-bridge"] || !packageJson.scripts["check:backend-services"] || !packageJson.scripts["check:backend-transport"] || !packageJson.scripts["check:fake-embedded-transport"] || !packageJson.scripts["check:preload-transport"] || !packageJson.scripts["check:desktop-backend"] || !packageJson.scripts["check:electron-boundary"] || !packageJson.scripts["check:electron-shell"] || !packageJson.scripts["check:static-assets"] || !packageJson.scripts["check:static-assets-http"] || !packageJson.scripts["check:node-map"] || !packageJson.scripts["check:node-map-http"] || !packageJson.scripts["check:references"] || !packageJson.scripts["check:references-http"] || !packageJson.scripts["check:semantic-parity-http"] || !packageJson.scripts["check:process-bridge"] || !packageJson.scripts["check:session-cache"] || !packageJson.scripts["check:session-cache-http"]) {
  console.error("SelfHostedEditor package.json must expose check:model, check:structure, check:style-structure, check:syntax, check:payload-bridge, check:backend-services, check:backend-transport, check:fake-embedded-transport, check:preload-transport, check:desktop-backend, check:electron-boundary, check:electron-shell, check:static-assets, check:static-assets-http, check:node-map, check:node-map-http, check:references, check:references-http, check:semantic-parity-http, check:process-bridge, check:session-cache, and check:session-cache-http.");
  failed = true;
}
if (packageJson.scripts["check:model"] !== "node DevScripts/SelfHostedEditorModelContractSuite.js") {
  console.error("SelfHostedEditor check:model must delegate to SelfHostedEditorModelContractSuite.js.");
  failed = true;
}
if (packageJson.scripts["check:syntax"] !== "node DevScripts/SelfHostedEditorSyntaxContractCheck.js") {
  console.error("SelfHostedEditor check:syntax must delegate to SelfHostedEditorSyntaxContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:payload-bridge"] !== "node DevScripts/SelfHostedEditorPayloadBridgeContractCheck.js") {
  console.error("SelfHostedEditor check:payload-bridge must delegate to SelfHostedEditorPayloadBridgeContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:backend-services"] !== "node DevScripts/SelfHostedEditorBackendServiceContractCheck.js") {
  console.error("SelfHostedEditor check:backend-services must delegate to SelfHostedEditorBackendServiceContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:backend-transport"] !== "node DevScripts/SelfHostedEditorBackendTransportContractCheck.js") {
  console.error("SelfHostedEditor check:backend-transport must delegate to SelfHostedEditorBackendTransportContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:fake-embedded-transport"] !== "node DevScripts/SelfHostedEditorFakeEmbeddedTransportContractCheck.js") {
  console.error("SelfHostedEditor check:fake-embedded-transport must delegate to SelfHostedEditorFakeEmbeddedTransportContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:preload-transport"] !== "node DevScripts/SelfHostedEditorPreloadTransportContractCheck.js") {
  console.error("SelfHostedEditor check:preload-transport must delegate to SelfHostedEditorPreloadTransportContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:desktop-backend"] !== "node DevScripts/SelfHostedEditorDesktopBackendContractCheck.js") {
  console.error("SelfHostedEditor check:desktop-backend must delegate to SelfHostedEditorDesktopBackendContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:electron-boundary"] !== "node DevScripts/SelfHostedEditorElectronBoundaryContractCheck.js") {
  console.error("SelfHostedEditor check:electron-boundary must delegate to SelfHostedEditorElectronBoundaryContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:electron-shell"] !== "node DevScripts/SelfHostedEditorElectronShellContractCheck.js") {
  console.error("SelfHostedEditor check:electron-shell must delegate to SelfHostedEditorElectronShellContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:static-assets"] !== "node DevScripts/SelfHostedEditorStaticAssetBridgeContractCheck.js") {
  console.error("SelfHostedEditor check:static-assets must delegate to SelfHostedEditorStaticAssetBridgeContractCheck.js.");
  failed = true;
}
if (packageJson.scripts["check:static-assets-http"] !== "node DevScripts/SelfHostedEditorStaticAssetHttpSmoke.js") {
  console.error("SelfHostedEditor check:static-assets-http must delegate to SelfHostedEditorStaticAssetHttpSmoke.js.");
  failed = true;
}
if (packageJson.scripts["check:style-structure"] !== "node DevScripts/SelfHostedEditorStyleStructureContractCheck.js") {
  console.error("SelfHostedEditor check:style-structure must delegate to SelfHostedEditorStyleStructureContractCheck.js.");
  failed = true;
}
if (!packageJson.scripts["check:structure"].includes("SelfHostedEditorStyleStructureContractCheck.js")) {
  console.error("SelfHostedEditor check:structure must include the style structure contract.");
  failed = true;
}

const childProcessTextPaths = [
  "DevScripts/StartSelfHostedEditorPreview.js",
  "DevScripts/SelfHostedEditorProcessBridge.js",
];
for (const relativePath of childProcessTextPaths) {
  const text = fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
  if (/std(?:out|err)\s*\+=\s*String\(chunk\)/.test(text)) {
    console.error(`SelfHostedEditor child-process bridge must not decode chunks one-by-one: ${relativePath}.`);
    failed = true;
  }
}

const devServerPath = path.join(moduleRoot, "DevScripts/StartSelfHostedEditorPreview.js");
const devServerText = fs.readFileSync(devServerPath, "utf8");
if (devServerText.includes("os.tmpdir()") || /function\s+sanitizeRelativePath\s*\(/.test(devServerText)) {
  console.error("SelfHostedEditor dev server must route temporary workspace paths through SelfHostedEditorWorkspaceBridge.");
  failed = true;
}
if (/Cache-Control/.test(devServerText) || /\bmimeTypes\b/.test(devServerText) || /fs\.readFile\s*\(/.test(devServerText)) {
  console.error("SelfHostedEditor dev server must route static asset responses through SelfHostedEditorStaticAssetBridge.");
  failed = true;
}
if (/requestUrl\.pathname\s*===\s*"\/api\//.test(devServerText)) {
  console.error("SelfHostedEditor dev server must route API requests through SelfHostedEditorRouteBridge.");
  failed = true;
}
if (
  /const\s+default(?:Localization|LineMap|Runtime)SessionId/.test(devServerText)
  || /(?:localizationBaselineStates|lineMapSessionStates|runtimeSessionStates)\s*=\s*new Map\s*\(/.test(devServerText)
  || /function\s+(?:getRuntimeSessionState|rememberRuntimeSessionState|normalizeRuntimeSessionId|resolveLocalizationBaseline|resolveExistingLocalizationBaseline|rememberLocalizationBaseline|getLocalizationBaseline|createLocalizationBaselineMetadata|normalizeLocalizationSessionId|getLineMapSessionState|rememberLineMapSessionState|normalizeLineMapSessionId)\s*\(/.test(devServerText)
) {
  console.error("SelfHostedEditor dev server must route session state through SelfHostedEditorSessionBridge.");
  failed = true;
}
if (
  /function\s+compact(?:ProjectGraph|RuntimeState|LocalizationReview|StoryNodeMap)/.test(devServerText)
  || /function\s+relativize(?:ProjectSourcePaths|LocalizationReviewPaths|StoryNodeMapReviewPaths|HostBindingCapabilityPaths|LanguageServerSemanticPaths|SourcePath)/.test(devServerText)
) {
  console.error("SelfHostedEditor dev server must route compact payloads and source-path normalization through SelfHostedEditorPayloadBridge.");
  failed = true;
}

const {
  resolveTemporaryWorkspacePath,
  sanitizeRelativePath,
} = await import("./SelfHostedEditorWorkspaceBridge.js");
const workspacePathContractRoot = path.join(moduleRoot, ".workspace-path-contract-root");
try {
  const validPath = resolveTemporaryWorkspacePath(workspacePathContractRoot, "nested/file.inscape");
  const validRelativePath = path.relative(workspacePathContractRoot, validPath).replace(/\\/g, "/");
  if (validRelativePath !== "nested/file.inscape") {
    console.error("SelfHostedEditor workspace path guard must preserve safe relative paths.");
    failed = true;
  }
} catch (error) {
  console.error(`SelfHostedEditor workspace path guard rejected a safe path: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

for (const unsafePath of ["../escape.inscape", "C:/escape.inscape", "/escape.inscape"]) {
  if (sanitizeRelativePath(unsafePath)) {
    console.error(`SelfHostedEditor workspace path sanitizer must reject unsafe path: ${unsafePath}`);
    failed = true;
  }

  try {
    resolveTemporaryWorkspacePath(workspacePathContractRoot, unsafePath);
    console.error(`SelfHostedEditor workspace path guard must reject unsafe path: ${unsafePath}`);
    failed = true;
  } catch {
    // Expected: unsafe input must not resolve to a writable path.
  }
}

const {
  resolveSelfHostedEditorStaticAssetTarget,
} = await import("./SelfHostedEditorStaticAssetBridge.js");
const workbenchAsset = resolveSelfHostedEditorStaticAssetTarget("/", {
  moduleRoot,
  repoRoot,
});
const workbenchRelativePath = path.relative(moduleRoot, workbenchAsset.filePath || "").replace(/\\/g, "/");
if (
  workbenchAsset.statusCode !== 200
  || workbenchAsset.fileRoot !== moduleRoot
  || workbenchRelativePath !== "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html"
) {
  console.error("SelfHostedEditor static asset bridge must serve the workbench document from module resources.");
  failed = true;
}

const sampleAsset = resolveSelfHostedEditorStaticAssetTarget("/samples/court-loop.inscape", {
  moduleRoot,
  repoRoot,
});
const sampleRelativePath = path.relative(repoRoot, sampleAsset.filePath || "").replace(/\\/g, "/");
if (
  sampleAsset.statusCode !== 200
  || sampleAsset.fileRoot !== repoRoot
  || sampleRelativePath !== "samples/court-loop.inscape"
) {
  console.error("SelfHostedEditor static asset bridge must serve sample files from the repository root.");
  failed = true;
}

for (const unsafeAssetPath of ["/../AGENTS.md", "/samples/../AGENTS.md", "/C:/escape.inscape"]) {
  const target = resolveSelfHostedEditorStaticAssetTarget(unsafeAssetPath, {
    moduleRoot,
    repoRoot,
  });
  if (target.statusCode !== 403) {
    console.error(`SelfHostedEditor static asset bridge must reject unsafe asset path: ${unsafeAssetPath}`);
    failed = true;
  }
}

const {
  createSelfHostedEditorApiRoutes,
  listSelfHostedEditorApiRoutePaths,
  resolveSelfHostedEditorApiRoute,
} = await import("./SelfHostedEditorRouteBridge.js");
const apiRoutePaths = listSelfHostedEditorApiRoutePaths();
for (const expectedRoutePath of [
  "/api/diagnostics",
  "/api/hover",
  "/api/definition",
  "/api/references",
  "/api/completions",
  "/api/document-symbols",
  "/api/host-schema-capabilities",
  "/api/host-binding-capabilities",
  "/api/story-graph",
  "/api/runtime-state",
  "/api/runtime-action",
  "/api/line-map-refresh",
  "/api/session-cache-status",
  "/api/node-map-review",
  "/api/node-map-apply",
  "/api/localization-review",
  "/api/localization-update",
]) {
  if (!apiRoutePaths.includes(expectedRoutePath)) {
    console.error(`SelfHostedEditor API route bridge is missing ${expectedRoutePath}.`);
    failed = true;
  }
}

const routeContractHandler = () => {};
const routeContractRoutes = createSelfHostedEditorApiRoutes({
  diagnostics: routeContractHandler,
});
if (
  resolveSelfHostedEditorApiRoute("POST", "/api/diagnostics", routeContractRoutes) !== routeContractHandler
  || resolveSelfHostedEditorApiRoute("GET", "/api/diagnostics", routeContractRoutes) !== null
  || resolveSelfHostedEditorApiRoute("POST", "/api/missing", routeContractRoutes) !== null
) {
  console.error("SelfHostedEditor API route bridge must route only known POST API requests.");
  failed = true;
}

const {
  getLineMapSessionState,
  getRuntimeSessionState,
  getSelfHostedEditorSessionCacheStatus,
  normalizeLineMapSessionId,
  normalizeLocalizationSessionId,
  normalizeRuntimeSessionId,
  rememberLineMapSessionState,
  rememberRuntimeSessionState,
  resolveExistingLocalizationBaseline,
} = await import("./SelfHostedEditorSessionBridge.js");
if (
  normalizeRuntimeSessionId(" runtime session!? ") !== "runtime-session--"
  || normalizeLineMapSessionId(" line map session!? ") !== "line-map-session--"
  || normalizeLocalizationSessionId(" localization session!? ") !== "localization-session--"
) {
  console.error("SelfHostedEditor session bridge must normalize unsafe session ids consistently.");
  failed = true;
}

const runtimeSnapshot = rememberRuntimeSessionState({ state: { currentNodeName: "Start" } }, "contract runtime");
if (
  runtimeSnapshot?.state?.currentNodeName !== "Start"
  || getRuntimeSessionState("contract runtime")?.state?.currentNodeName !== "Start"
) {
  console.error("SelfHostedEditor session bridge must remember runtime snapshots by session id.");
  failed = true;
}

const lineMapPayload = rememberLineMapSessionState({ lineMap: { format: "inscape.line-map" } }, "contract line-map");
if (
  lineMapPayload?.lineMap?.format !== "inscape.line-map"
  || getLineMapSessionState("contract line-map")?.format !== "inscape.line-map"
) {
  console.error("SelfHostedEditor session bridge must remember line-map payloads by session id.");
  failed = true;
}

const explicitBaseline = resolveExistingLocalizationBaseline("anchor,text\n", "contract localization");
const sessionBaseline = resolveExistingLocalizationBaseline("", "contract localization");
if (
  explicitBaseline.metadata.source !== "request"
  || sessionBaseline.metadata.source !== "session"
  || sessionBaseline.csv !== "anchor,text\n"
  || sessionBaseline.metadata.byteLength !== Buffer.byteLength("anchor,text\n", "utf8")
) {
  console.error("SelfHostedEditor session bridge must remember localization baselines by session id.");
  failed = true;
}
const sessionCacheStatus = getSelfHostedEditorSessionCacheStatus();
if (
  sessionCacheStatus?.format !== "inscape.self-hosted-editor.session-cache-status"
  || sessionCacheStatus?.formatVersion !== 1
  || sessionCacheStatus?.caches?.runtime?.kind !== "runtime"
  || sessionCacheStatus?.caches?.lineMap?.kind !== "line-map"
  || sessionCacheStatus?.caches?.localizationBaseline?.kind !== "localization-baseline"
  || sessionCacheStatus?.caches?.runtime?.maximumEntries < sessionCacheStatus?.caches?.runtime?.entryCount
) {
  console.error("SelfHostedEditor session bridge must expose bounded session cache status for runtime, line-map, and localization baseline caches.");
  failed = true;
}

const utf8OutputEntryPaths = [
  "src/Internal/Cli/Inscape.Cli/Entries/CliCore.cs",
  "src/Internal/LanguageServer/Entries/LanguageServerEntry.cs",
  "src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli/Entries/UnitySampleCli.cs",
];
for (const relativePath of utf8OutputEntryPaths) {
  const fullPath = path.join(repoRoot, relativePath);
  const text = fs.readFileSync(fullPath, "utf8");
  if (!text.includes("Console.OutputEncoding = new UTF8Encoding(false);")) {
    console.error(`UTF-8 stdout guard is missing from ${relativePath}.`);
    failed = true;
  }
}

const suspiciousTextPatterns = [
  "\uFFFD",
  "锟斤拷",
  "浣犲ソ",
  "鏃ц",
  "鏃ф",
  "鏃ч",
  "鏂版",
  "鏂板",
  "鍘熸",
];
for (const finding of findSuspiciousTextArtifacts(repoRoot, suspiciousTextPatterns)) {
  console.error(`Suspicious text encoding artifact in ${finding.relativePath}: ${finding.pattern}`);
  failed = true;
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("SelfHostedEditor structure ok");
}

function findSuspiciousTextArtifacts(root, patterns) {
  const findings = [];
  const ignoredDirectories = new Set([".git", "artifacts", "bin", "node_modules", "obj"]);
  const textExtensions = new Set([
    ".cmd",
    ".cs",
    ".css",
    ".csv",
    ".html",
    ".inscape",
    ".js",
    ".json",
    ".md",
    ".ps1",
    ".props",
    ".slnx",
    ".targets",
    ".toml",
    ".txt",
    ".xml",
  ]);

  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          visit(path.join(directory, entry.name));
        }
        continue;
      }

      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
      if (relativePath === "src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorStructureContractCheck.js") {
        continue;
      }

      if (!textExtensions.has(path.extname(entry.name))) {
        continue;
      }

      const text = fs.readFileSync(fullPath, "utf8");
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          findings.push({
            pattern,
            relativePath,
          });
        }
      }
    }
  };

  visit(root);
  return findings;
}

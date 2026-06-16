export const EditorBackendTransportCommand = Object.freeze({
  DocumentBufferList: "document-buffer.list",
  DocumentBufferRead: "document-buffer.read",
  DocumentBufferSave: "document-buffer.save",
  DocumentBufferSaveAll: "document-buffer.save-all",
  DocumentBufferUpdateDraft: "document-buffer.update-draft",
  HostBindingCapabilities: "host-binding.capabilities",
  HostSchemaCapabilities: "host-schema.capabilities",
  LanguageCompletions: "language.completions",
  LanguageDefinition: "language.definition",
  LanguageDiagnostics: "language.diagnostics",
  LanguageDocumentSymbols: "language.document-symbols",
  LanguageHover: "language.hover",
  LanguageReferences: "language.references",
  LineIdentityRefresh: "line-identity.refresh",
  LocalizationReview: "localization.review",
  LocalizationUpdateCsv: "localization.update-csv",
  ProjectSessionStatus: "project-session.status",
  RuntimeStartOrObserve: "runtime.start-or-observe",
  RuntimeStep: "runtime.step",
  StableNodeMapApplyCandidate: "stable-node-map.apply-candidate",
  StableNodeMapReview: "stable-node-map.review",
  StoryGraphCompileProject: "story-graph.compile-project",
});

const devHostRoutesByCommand = Object.freeze({
  [EditorBackendTransportCommand.DocumentBufferList]: "/api/document-buffer-list",
  [EditorBackendTransportCommand.DocumentBufferRead]: "/api/document-buffer-read",
  [EditorBackendTransportCommand.DocumentBufferSave]: "/api/document-buffer-save",
  [EditorBackendTransportCommand.DocumentBufferSaveAll]: "/api/document-buffer-save-all",
  [EditorBackendTransportCommand.DocumentBufferUpdateDraft]: "/api/document-buffer-update-draft",
  [EditorBackendTransportCommand.HostBindingCapabilities]: "/api/host-binding-capabilities",
  [EditorBackendTransportCommand.HostSchemaCapabilities]: "/api/host-schema-capabilities",
  [EditorBackendTransportCommand.LanguageCompletions]: "/api/completions",
  [EditorBackendTransportCommand.LanguageDefinition]: "/api/definition",
  [EditorBackendTransportCommand.LanguageDiagnostics]: "/api/diagnostics",
  [EditorBackendTransportCommand.LanguageDocumentSymbols]: "/api/document-symbols",
  [EditorBackendTransportCommand.LanguageHover]: "/api/hover",
  [EditorBackendTransportCommand.LanguageReferences]: "/api/references",
  [EditorBackendTransportCommand.LineIdentityRefresh]: "/api/line-map-refresh",
  [EditorBackendTransportCommand.LocalizationReview]: "/api/localization-review",
  [EditorBackendTransportCommand.LocalizationUpdateCsv]: "/api/localization-update",
  [EditorBackendTransportCommand.ProjectSessionStatus]: "/api/session-cache-status",
  [EditorBackendTransportCommand.RuntimeStartOrObserve]: "/api/runtime-state",
  [EditorBackendTransportCommand.RuntimeStep]: "/api/runtime-action",
  [EditorBackendTransportCommand.StableNodeMapApplyCandidate]: "/api/node-map-apply",
  [EditorBackendTransportCommand.StableNodeMapReview]: "/api/node-map-review",
  [EditorBackendTransportCommand.StoryGraphCompileProject]: "/api/story-graph",
});

export function listEditorBackendTransportCommands() {
  return Object.values(EditorBackendTransportCommand);
}

export function resolveEditorBackendDevHostRoute(command) {
  const routePath = devHostRoutesByCommand[command];
  if (!routePath) {
    throw new Error(`Unknown SelfHostedEditor backend transport command: ${String(command || "")}`);
  }

  return routePath;
}

export function listEditorBackendDevHostRoutes() {
  return Object.entries(devHostRoutesByCommand).map(([command, routePath]) => ({
    command,
    routePath,
  }));
}

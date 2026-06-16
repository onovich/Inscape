export const SelfHostedEditorPreloadApiName = "inscapeSelfHostedEditor";

export const SelfHostedEditorPreloadCapabilities = Object.freeze({
  embeddedBackend: false,
  shell: "electron",
  workspaceFileSystem: false,
});

export const SelfHostedEditorPreloadEditorCommand = Object.freeze({
  DocumentBufferList: "document-buffer.list",
  DocumentBufferRead: "document-buffer.read",
  DocumentBufferSave: "document-buffer.save",
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
  WorkspaceListFiles: "workspace.list-files",
  WorkspaceOpenFolder: "workspace.open-folder",
});

export function listSelfHostedEditorPreloadCommands() {
  return Object.values(SelfHostedEditorPreloadEditorCommand);
}

export function createSelfHostedEditorPreloadApi(options = {}) {
  const handlers = options.handlers || {};
  return Object.freeze({
    capabilities: SelfHostedEditorPreloadCapabilities,
    documentBuffer: Object.freeze({
      list: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferList, handlers),
      read: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferRead, handlers),
      save: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferSave, handlers),
      updateDraft: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferUpdateDraft, handlers),
    }),
    editorCommands: SelfHostedEditorPreloadEditorCommand,
    hostCapabilities: Object.freeze({
      bindingCapabilities: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.HostBindingCapabilities, handlers),
      schemaCapabilities: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.HostSchemaCapabilities, handlers),
    }),
    languageSession: Object.freeze({
      completions: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LanguageCompletions, handlers),
      definition: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LanguageDefinition, handlers),
      diagnose: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LanguageDiagnostics, handlers),
      documentSymbols: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LanguageDocumentSymbols, handlers),
      hover: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LanguageHover, handlers),
      references: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LanguageReferences, handlers),
    }),
    lineIdentitySession: Object.freeze({
      refresh: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LineIdentityRefresh, handlers),
    }),
    localizationSession: Object.freeze({
      review: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LocalizationReview, handlers),
      updateCsv: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.LocalizationUpdateCsv, handlers),
    }),
    projectSession: Object.freeze({
      status: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.ProjectSessionStatus, handlers),
    }),
    runtimeSession: Object.freeze({
      startOrObserve: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.RuntimeStartOrObserve, handlers),
      step: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.RuntimeStep, handlers),
    }),
    stableNodeMap: Object.freeze({
      applyCandidate: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.StableNodeMapApplyCandidate, handlers),
      review: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.StableNodeMapReview, handlers),
    }),
    storyGraph: Object.freeze({
      compileProjectGraph: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.StoryGraphCompileProject, handlers),
    }),
    workspace: Object.freeze({
      listFiles: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.WorkspaceListFiles, handlers),
      openFolder: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.WorkspaceOpenFolder, handlers),
    }),
  });
}

function createEditorCommandHandler(command, handlers) {
  return async (payload = {}) => {
    const handler = handlers[command];
    if (typeof handler !== "function") {
      throw new Error(`SelfHostedEditor preload command is not wired yet: ${command}`);
    }

    return await handler(payload || {});
  };
}

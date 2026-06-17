const electron = require("electron");

const SelfHostedEditorPreloadApiName = "inscapeSelfHostedEditor";
const SelfHostedEditorElectronIpcChannel = "inscape.self-hosted-editor.backend.invoke";

const SelfHostedEditorPreloadCapabilities = Object.freeze({
  backendCommandTransport: "electron-ipc",
  embeddedBackend: "workspace-session-v0-partial",
  shell: "electron",
  workspaceFileSystem: "read-write-buffer-session",
});

const SelfHostedEditorPreloadEditorCommand = Object.freeze({
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
  RecoveryDiscard: "recovery.discard",
  RecoveryLater: "recovery.later",
  RecoveryRestore: "recovery.restore",
  RuntimeStartOrObserve: "runtime.start-or-observe",
  RuntimeStep: "runtime.step",
  StableNodeMapApplyCandidate: "stable-node-map.apply-candidate",
  StableNodeMapReview: "stable-node-map.review",
  StoryGraphCompileProject: "story-graph.compile-project",
  WorkspaceImportAssets: "workspace.import-assets",
  WorkspaceListFiles: "workspace.list-files",
  WorkspaceOpenFolder: "workspace.open-folder",
  WorkspaceWriteBackBackup: "workspace.write-back-backup",
});

const languagePayloadKeys = Object.freeze([
  "activeRelativePath",
  "definitionName",
  "documentRevision",
  "hoverKind",
  "hoverName",
  "kind",
  "languageSession",
  "referenceName",
  "scriptText",
  "sessionId",
  "workspace",
]);

const scriptWorkspacePayloadKeys = Object.freeze([
  "scriptText",
  "workspace",
]);

const preloadPayloadKeysByCommand = Object.freeze({
  [SelfHostedEditorPreloadEditorCommand.DocumentBufferList]: ["workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.DocumentBufferRead]: ["relativePath", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.DocumentBufferSave]: ["baseRevision", "relativePath", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.DocumentBufferSaveAll]: ["relativePaths", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.DocumentBufferUpdateDraft]: ["baseRevision", "relativePath", "text", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.HostBindingCapabilities]: scriptWorkspacePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.HostSchemaCapabilities]: scriptWorkspacePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LanguageCompletions]: languagePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LanguageDefinition]: languagePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LanguageDiagnostics]: languagePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LanguageDocumentSymbols]: languagePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LanguageHover]: languagePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LanguageReferences]: languagePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.LineIdentityRefresh]: ["existingLineMap", "scriptText", "sessionId", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.LocalizationReview]: ["previousCsv", "scriptText", "sessionId", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.LocalizationUpdateCsv]: ["previousCsv", "scriptText", "sessionId", "translationOverrides", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.ProjectSessionStatus]: ["sessionId", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.RecoveryDiscard]: ["contentHash", "relativePath", "revision", "snapshotModifiedUtc", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.RecoveryLater]: ["contentHash", "relativePath", "revision", "snapshotModifiedUtc", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.RecoveryRestore]: ["contentHash", "relativePath", "revision", "snapshotModifiedUtc", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.RuntimeStartOrObserve]: ["scriptText", "sessionId", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.RuntimeStep]: ["action", "runtimeState", "scriptText", "sessionId", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.StableNodeMapApplyCandidate]: ["candidate", "dryRun", "item", "nodeMapPath", "scriptText", "workspace"],
  [SelfHostedEditorPreloadEditorCommand.StableNodeMapReview]: scriptWorkspacePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.StoryGraphCompileProject]: scriptWorkspacePayloadKeys,
  [SelfHostedEditorPreloadEditorCommand.WorkspaceImportAssets]: ["dialogTitle", "workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.WorkspaceListFiles]: ["workspaceId"],
  [SelfHostedEditorPreloadEditorCommand.WorkspaceOpenFolder]: ["dialogTitle"],
  [SelfHostedEditorPreloadEditorCommand.WorkspaceWriteBackBackup]: ["backupEnabled", "nowUtc", "retentionDays", "retentionLimit", "workspaceId", "writeRequests"],
});

function listSelfHostedEditorPreloadCommands() {
  return Object.values(SelfHostedEditorPreloadEditorCommand);
}

function validateSelfHostedEditorPreloadCommandPayload(command, payload = {}) {
  const allowedKeys = preloadPayloadKeysByCommand[command];
  if (!Array.isArray(allowedKeys)) {
    throw new Error(`Unknown SelfHostedEditor preload command: ${String(command || "")}`);
  }

  const normalizedPayload = payload || {};
  if (typeof normalizedPayload !== "object" || Array.isArray(normalizedPayload)) {
    throw new Error(`Invalid SelfHostedEditor preload payload for ${command}.`);
  }

  const allowedKeySet = new Set(allowedKeys);
  for (const key of Object.keys(normalizedPayload)) {
    if (!allowedKeySet.has(key)) {
      throw new Error(`Unexpected SelfHostedEditor preload payload key for ${command}: ${key}`);
    }
  }

  return normalizedPayload;
}

function buildSelfHostedEditorElectronIpcEnvelope(command, payload = {}) {
  return {
    command,
    payload: payload || {},
  };
}

function createSelfHostedEditorPreloadApi(options = {}) {
  const handlers = options.handlers || {};
  return Object.freeze({
    capabilities: SelfHostedEditorPreloadCapabilities,
    documentBuffer: Object.freeze({
      list: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferList, handlers),
      read: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferRead, handlers),
      save: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferSave, handlers),
      saveAll: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.DocumentBufferSaveAll, handlers),
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
    recovery: Object.freeze({
      discard: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.RecoveryDiscard, handlers),
      later: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.RecoveryLater, handlers),
      restore: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.RecoveryRestore, handlers),
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
      importAssets: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.WorkspaceImportAssets, handlers),
      listFiles: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.WorkspaceListFiles, handlers),
      openFolder: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.WorkspaceOpenFolder, handlers),
      writeBackBackup: createEditorCommandHandler(SelfHostedEditorPreloadEditorCommand.WorkspaceWriteBackBackup, handlers),
    }),
  });
}

function createEditorCommandHandler(command, handlers) {
  return async (payload = {}) => {
    const normalizedPayload = validateSelfHostedEditorPreloadCommandPayload(command, payload);
    const handler = handlers[command];
    if (typeof handler !== "function") {
      throw new Error(`SelfHostedEditor preload command is not wired yet: ${command}`);
    }

    return await handler(normalizedPayload);
  };
}

function createSelfHostedEditorPreloadIpcHandlers(electronIpcRenderer = electron.ipcRenderer) {
  return Object.fromEntries(listSelfHostedEditorPreloadCommands().map((command) => [
    command,
    async (payload = {}) => await electronIpcRenderer.invoke(
      SelfHostedEditorElectronIpcChannel,
      buildSelfHostedEditorElectronIpcEnvelope(command, payload)
    ),
  ]));
}

function exposeSelfHostedEditorPreloadApi(bridge = electron.contextBridge, electronIpcRenderer = electron.ipcRenderer) {
  bridge.exposeInMainWorld(SelfHostedEditorPreloadApiName, createSelfHostedEditorPreloadApi({
    handlers: createSelfHostedEditorPreloadIpcHandlers(electronIpcRenderer),
  }));
}

if (electron.contextBridge && electron.ipcRenderer) {
  exposeSelfHostedEditorPreloadApi();
}

module.exports = {
  createSelfHostedEditorPreloadApi,
  listSelfHostedEditorPreloadCommands,
  SelfHostedEditorPreloadEditorCommand,
  validateSelfHostedEditorPreloadCommandPayload,
};

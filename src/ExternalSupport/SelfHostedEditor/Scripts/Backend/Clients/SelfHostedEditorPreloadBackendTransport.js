import { EditorBackendTransportCommand } from "./EditorBackendTransport.js";

const preloadMethodsByCommand = Object.freeze({
  [EditorBackendTransportCommand.DocumentBufferList]: ["documentBuffer", "list"],
  [EditorBackendTransportCommand.DocumentBufferRead]: ["documentBuffer", "read"],
  [EditorBackendTransportCommand.DocumentBufferSave]: ["documentBuffer", "save"],
  [EditorBackendTransportCommand.DocumentBufferSaveAll]: ["documentBuffer", "saveAll"],
  [EditorBackendTransportCommand.DocumentBufferUpdateDraft]: ["documentBuffer", "updateDraft"],
  [EditorBackendTransportCommand.HostBindingCapabilities]: ["hostCapabilities", "bindingCapabilities"],
  [EditorBackendTransportCommand.HostSchemaCapabilities]: ["hostCapabilities", "schemaCapabilities"],
  [EditorBackendTransportCommand.LanguageCompletions]: ["languageSession", "completions"],
  [EditorBackendTransportCommand.LanguageDefinition]: ["languageSession", "definition"],
  [EditorBackendTransportCommand.LanguageDiagnostics]: ["languageSession", "diagnose"],
  [EditorBackendTransportCommand.LanguageDocumentSymbols]: ["languageSession", "documentSymbols"],
  [EditorBackendTransportCommand.LanguageHover]: ["languageSession", "hover"],
  [EditorBackendTransportCommand.LanguageReferences]: ["languageSession", "references"],
  [EditorBackendTransportCommand.LineIdentityRefresh]: ["lineIdentitySession", "refresh"],
  [EditorBackendTransportCommand.LocalizationReview]: ["localizationSession", "review"],
  [EditorBackendTransportCommand.LocalizationUpdateCsv]: ["localizationSession", "updateCsv"],
  [EditorBackendTransportCommand.ProjectSessionStatus]: ["projectSession", "status"],
  [EditorBackendTransportCommand.RecoveryDiscard]: ["recovery", "discard"],
  [EditorBackendTransportCommand.RecoveryLater]: ["recovery", "later"],
  [EditorBackendTransportCommand.RecoveryRestore]: ["recovery", "restore"],
  [EditorBackendTransportCommand.RuntimeStartOrObserve]: ["runtimeSession", "startOrObserve"],
  [EditorBackendTransportCommand.RuntimeStep]: ["runtimeSession", "step"],
  [EditorBackendTransportCommand.StableNodeMapApplyCandidate]: ["stableNodeMap", "applyCandidate"],
  [EditorBackendTransportCommand.StableNodeMapReview]: ["stableNodeMap", "review"],
  [EditorBackendTransportCommand.StoryGraphCompileProject]: ["storyGraph", "compileProjectGraph"],
  [EditorBackendTransportCommand.WorkspaceImportAssets]: ["workspace", "importAssets"],
  [EditorBackendTransportCommand.WorkspaceListFiles]: ["workspace", "listFiles"],
  [EditorBackendTransportCommand.WorkspaceOpenFolder]: ["workspace", "openFolder"],
  [EditorBackendTransportCommand.WorkspaceWriteBackBackup]: ["workspace", "writeBackBackup"],
});

export class SelfHostedEditorPreloadBackendTransport {
  #preloadApi;

  constructor(options = {}) {
    this.#preloadApi = options.preloadApi || resolveSelfHostedEditorPreloadApi(options.globalObject);
    if (!this.#preloadApi) {
      throw new Error("SelfHostedEditorPreloadBackendTransport requires window.inscapeSelfHostedEditor.");
    }
  }

  async invoke(command, payload = {}) {
    const method = resolvePreloadMethod(this.#preloadApi, command);
    return await method(payload || {});
  }
}

export function hasSelfHostedEditorPreloadApi(globalObject = globalThis) {
  return Boolean(resolveSelfHostedEditorPreloadApi(globalObject));
}

export function resolveSelfHostedEditorPreloadApi(globalObject = globalThis) {
  return globalObject?.inscapeSelfHostedEditor || null;
}

function resolvePreloadMethod(preloadApi, command) {
  const methodPath = preloadMethodsByCommand[command];
  if (!methodPath) {
    throw new Error(`Unknown SelfHostedEditor preload transport command: ${String(command || "")}`);
  }

  const [groupName, methodName] = methodPath;
  const method = preloadApi?.[groupName]?.[methodName];
  if (typeof method !== "function") {
    throw new Error(`SelfHostedEditor preload command is unavailable: ${command}`);
  }

  return method;
}

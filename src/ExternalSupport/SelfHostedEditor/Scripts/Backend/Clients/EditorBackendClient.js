import { EditorBackendLanguageSessionRequestModel } from "../Models/EditorBackendLanguageSessionRequestModel.js";
import { EditorBackendSessionStatusModel } from "../Models/EditorBackendSessionStatusModel.js";
import { EditorBackendTransportCommand } from "./EditorBackendTransport.js";
import { SelfHostedEditorHttpBackendTransport } from "./SelfHostedEditorHttpBackendTransport.js";
import {
  hasSelfHostedEditorPreloadApi,
  SelfHostedEditorPreloadBackendTransport,
} from "./SelfHostedEditorPreloadBackendTransport.js";

export class EditorBackendClient {
  #transport;

  constructor(options = {}) {
    this.#transport = options.transport || createDefaultEditorBackendTransport(options);
    if (!this.#transport || typeof this.#transport.invoke !== "function") {
      throw new Error("EditorBackendClient requires a transport with invoke(command, payload).");
    }

    this.sessionId = options.sessionId || this.#createSessionId();
    this.documentBuffer = Object.freeze({
      list: (request) => this.#invoke(EditorBackendTransportCommand.DocumentBufferList, request),
      read: (request) => this.#invoke(EditorBackendTransportCommand.DocumentBufferRead, request),
      saveAll: (request) => this.#invoke(EditorBackendTransportCommand.DocumentBufferSaveAll, request),
      saveDocument: (request) => this.#invoke(EditorBackendTransportCommand.DocumentBufferSave, request),
      updateDraft: (request) => this.#invoke(EditorBackendTransportCommand.DocumentBufferUpdateDraft, request),
    });
    this.languageSession = Object.freeze({
      completions: (request) => this.#invokeLanguageSession(EditorBackendTransportCommand.LanguageCompletions, "completions", request),
      definition: (request) => this.#invokeLanguageSession(EditorBackendTransportCommand.LanguageDefinition, "definition", request),
      diagnose: (request) => this.#invokeLanguageSession(EditorBackendTransportCommand.LanguageDiagnostics, "diagnostics", request),
      documentSymbols: (request) => this.#invokeLanguageSession(EditorBackendTransportCommand.LanguageDocumentSymbols, "document-symbols", request),
      hover: (request) => this.#invokeLanguageSession(EditorBackendTransportCommand.LanguageHover, "hover", request),
      references: (request) => this.#invokeLanguageSession(EditorBackendTransportCommand.LanguageReferences, "references", request),
    });
    this.hostCapabilities = Object.freeze({
      bindingCapabilities: (request) => this.#invoke(EditorBackendTransportCommand.HostBindingCapabilities, request),
      schemaCapabilities: (request) => this.#invoke(EditorBackendTransportCommand.HostSchemaCapabilities, request),
    });
    this.storyGraph = Object.freeze({
      compileProjectGraph: (request) => this.#invoke(EditorBackendTransportCommand.StoryGraphCompileProject, request),
    });
    this.runtimeSession = Object.freeze({
      startOrObserve: (request) => this.#invoke(EditorBackendTransportCommand.RuntimeStartOrObserve, request),
      step: (request) => this.#invoke(EditorBackendTransportCommand.RuntimeStep, request),
    });
    this.lineIdentitySession = Object.freeze({
      refresh: (request) => this.#invoke(EditorBackendTransportCommand.LineIdentityRefresh, request),
    });
    this.localizationSession = Object.freeze({
      review: (request) => this.#invoke(EditorBackendTransportCommand.LocalizationReview, request),
      updateCsv: (request) => this.#invoke(EditorBackendTransportCommand.LocalizationUpdateCsv, request),
    });
    this.stableNodeMap = Object.freeze({
      applyCandidate: (request) => this.#invoke(EditorBackendTransportCommand.StableNodeMapApplyCandidate, request),
      review: (request) => this.#invoke(EditorBackendTransportCommand.StableNodeMapReview, request),
    });
    this.workspace = Object.freeze({
      listFiles: (request) => this.#invoke(EditorBackendTransportCommand.WorkspaceListFiles, request),
      openFolder: (request) => this.#invoke(EditorBackendTransportCommand.WorkspaceOpenFolder, request),
    });
    this.projectSession = Object.freeze({
      status: async (request = {}) => {
        return EditorBackendSessionStatusModel.normalizeTransportStatus(
          await this.#invoke(EditorBackendTransportCommand.ProjectSessionStatus, {}),
          {
            sessionId: request.sessionId || this.sessionId,
            workspace: request.workspace || null,
          }
        );
      },
    });
    this.recovery = Object.freeze({
      discard: (request) => this.#invoke(EditorBackendTransportCommand.RecoveryDiscard, request),
      later: (request) => this.#invoke(EditorBackendTransportCommand.RecoveryLater, request),
      restore: (request) => this.#invoke(EditorBackendTransportCommand.RecoveryRestore, request),
    });
    this.diagnostics = Object.freeze({
      sessionStatus: (request = {}) => this.projectSession.status(request),
    });

    Object.freeze(this);
  }

  async #invoke(command, request = {}) {
    return await this.#transport.invoke(command, request || {});
  }

  async #invokeLanguageSession(command, kind, request = {}) {
    const languageRequest = EditorBackendLanguageSessionRequestModel.build({
      kind,
      request,
      sessionId: this.sessionId,
    });
    return await this.#invoke(command, EditorBackendLanguageSessionRequestModel.toDevHostPayload(languageRequest));
  }

  #createSessionId() {
    const randomPart = Math.random().toString(36).slice(2);
    return `project-${Date.now().toString(36)}-${randomPart}`;
  }
}

function createDefaultEditorBackendTransport(options = {}) {
  if (hasSelfHostedEditorPreloadApi(options.globalObject)) {
    return new SelfHostedEditorPreloadBackendTransport(options);
  }

  return new SelfHostedEditorHttpBackendTransport(options);
}

import { EditorBackendLanguageSessionRequestModel } from "../Models/EditorBackendLanguageSessionRequestModel.js";
import { EditorBackendSessionStatusModel } from "../Models/EditorBackendSessionStatusModel.js";
import { EditorBackendTransportCommand } from "./EditorBackendTransport.js";
import { SelfHostedEditorHttpBackendTransport } from "./SelfHostedEditorHttpBackendTransport.js";

export class EditorBackendClient {
  #transport;

  constructor(options = {}) {
    this.#transport = options.transport || new SelfHostedEditorHttpBackendTransport(options);
    if (!this.#transport || typeof this.#transport.invoke !== "function") {
      throw new Error("EditorBackendClient requires a transport with invoke(command, payload).");
    }

    this.sessionId = options.sessionId || this.#createSessionId();
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
    this.projectSession = Object.freeze({
      status: async (request = {}) => EditorBackendSessionStatusModel.buildDevHostStatus(
        await this.#invoke(EditorBackendTransportCommand.ProjectSessionStatus, {}),
        {
          sessionId: request.sessionId || this.sessionId,
          workspace: request.workspace || null,
        }
      ),
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

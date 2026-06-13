import { EditorBackendLanguageSessionRequestModel } from "../Models/EditorBackendLanguageSessionRequestModel.js";
import { EditorBackendSessionStatusModel } from "../Models/EditorBackendSessionStatusModel.js";
import { SelfHostedEditorHttpBackendTransport } from "./SelfHostedEditorHttpBackendTransport.js";

export class EditorBackendClient {
  #transport;

  constructor(options = {}) {
    this.#transport = options.transport || new SelfHostedEditorHttpBackendTransport(options);
    if (!this.#transport || typeof this.#transport.postJson !== "function") {
      throw new Error("EditorBackendClient requires a transport with postJson(path, payload).");
    }

    this.sessionId = options.sessionId || this.#createSessionId();
    this.languageSession = Object.freeze({
      completions: (request) => this.#postLanguageSession("/api/completions", "completions", request),
      definition: (request) => this.#postLanguageSession("/api/definition", "definition", request),
      diagnose: (request) => this.#postLanguageSession("/api/diagnostics", "diagnostics", request),
      documentSymbols: (request) => this.#postLanguageSession("/api/document-symbols", "document-symbols", request),
      hover: (request) => this.#postLanguageSession("/api/hover", "hover", request),
      references: (request) => this.#postLanguageSession("/api/references", "references", request),
    });
    this.hostCapabilities = Object.freeze({
      bindingCapabilities: (request) => this.#post("/api/host-binding-capabilities", request),
        schemaCapabilities: (request) => this.#post("/api/host-schema-capabilities", request),
      });
    this.storyGraph = Object.freeze({
      compileProjectGraph: (request) => this.#post("/api/story-graph", request),
    });
    this.runtimeSession = Object.freeze({
      startOrObserve: (request) => this.#post("/api/runtime-state", request),
      step: (request) => this.#post("/api/runtime-action", request),
    });
    this.lineIdentitySession = Object.freeze({
      refresh: (request) => this.#post("/api/line-map-refresh", request),
    });
    this.localizationSession = Object.freeze({
      review: (request) => this.#post("/api/localization-review", request),
      updateCsv: (request) => this.#post("/api/localization-update", request),
    });
    this.stableNodeMap = Object.freeze({
      applyCandidate: (request) => this.#post("/api/node-map-apply", request),
      review: (request) => this.#post("/api/node-map-review", request),
    });
    this.projectSession = Object.freeze({
      status: async (request = {}) => EditorBackendSessionStatusModel.buildDevHostStatus(
        await this.#post("/api/session-cache-status", {}),
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

  async #post(path, request = {}) {
    return await this.#transport.postJson(path, request || {});
  }

  async #postLanguageSession(path, kind, request = {}) {
    const languageRequest = EditorBackendLanguageSessionRequestModel.build({
      kind,
      request,
      sessionId: this.sessionId,
    });
    return await this.#post(path, EditorBackendLanguageSessionRequestModel.toDevHostPayload(languageRequest));
  }

  #createSessionId() {
    const randomPart = Math.random().toString(36).slice(2);
    return `project-${Date.now().toString(36)}-${randomPart}`;
  }
}

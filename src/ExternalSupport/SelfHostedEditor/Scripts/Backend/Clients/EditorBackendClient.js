import { EditorBackendSessionStatusModel } from "../Models/EditorBackendSessionStatusModel.js";
import { SelfHostedEditorHttpBackendTransport } from "./SelfHostedEditorHttpBackendTransport.js";

export class EditorBackendClient {
  #transport;

  constructor(options = {}) {
    this.#transport = options.transport || new SelfHostedEditorHttpBackendTransport(options);
    if (!this.#transport || typeof this.#transport.postJson !== "function") {
      throw new Error("EditorBackendClient requires a transport with postJson(path, payload).");
    }

    this.languageSession = Object.freeze({
      completions: (request) => this.#post("/api/completions", request),
      definition: (request) => this.#post("/api/definition", request),
      diagnose: (request) => this.#post("/api/diagnostics", request),
      documentSymbols: (request) => this.#post("/api/document-symbols", request),
      hover: (request) => this.#post("/api/hover", request),
      references: (request) => this.#post("/api/references", request),
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
    this.diagnostics = Object.freeze({
      sessionStatus: async () => EditorBackendSessionStatusModel.buildDevHostStatus(await this.#post("/api/session-cache-status", {})),
    });

    Object.freeze(this);
  }

  async #post(path, request = {}) {
    return await this.#transport.postJson(path, request || {});
  }
}

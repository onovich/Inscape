import {
  EditorBackendTransportCommand,
  listEditorBackendTransportCommands,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";

const knownCommands = new Set(listEditorBackendTransportCommands());

export class SelfHostedEditorFakeEmbeddedTransport {
  #calls = [];
  #handlers;

  constructor(options = {}) {
    this.#handlers = Object.freeze({
      [EditorBackendTransportCommand.HostBindingCapabilities]: async () => ({
        bindings: [],
        speakers: [],
      }),
      [EditorBackendTransportCommand.HostSchemaCapabilities]: async () => ({
        capabilities: [],
      }),
      [EditorBackendTransportCommand.LanguageCompletions]: async () => ({
        completions: [],
      }),
      [EditorBackendTransportCommand.LanguageDefinition]: async () => ({
        definition: null,
      }),
      [EditorBackendTransportCommand.LanguageDiagnostics]: async () => ({
        diagnostics: [],
      }),
      [EditorBackendTransportCommand.LanguageDocumentSymbols]: async () => ({
        symbols: [],
      }),
      [EditorBackendTransportCommand.LanguageHover]: async () => ({
        hover: null,
      }),
      [EditorBackendTransportCommand.LanguageReferences]: async () => ({
        references: [],
      }),
      [EditorBackendTransportCommand.LineIdentityRefresh]: async () => ({
        lineMap: null,
        refresh: null,
      }),
      [EditorBackendTransportCommand.LocalizationReview]: async () => ({
        baseline: {
          source: "current-extract",
        },
        presenter: {
          items: [],
        },
      }),
      [EditorBackendTransportCommand.LocalizationUpdateCsv]: async () => ({
        csv: "",
        format: "inscape.localization.csv",
        formatVersion: 1,
      }),
      [EditorBackendTransportCommand.ProjectSessionStatus]: async () => ({
        caches: {},
        languageSession: {
          kind: "process-per-request",
          supportedEndpoints: ["diagnostics", "document-symbols"],
        },
      }),
      [EditorBackendTransportCommand.RuntimeStartOrObserve]: async () => ({
        currentNode: null,
      }),
      [EditorBackendTransportCommand.RuntimeStep]: async () => ({
        currentNode: null,
      }),
      [EditorBackendTransportCommand.StableNodeMapApplyCandidate]: async () => ({
        changes: [],
      }),
      [EditorBackendTransportCommand.StableNodeMapReview]: async () => ({
        items: [],
      }),
      [EditorBackendTransportCommand.StoryGraphCompileProject]: async () => ({
        graph: null,
      }),
      ...options.handlers,
    });
  }

  get calls() {
    return this.#calls.map((call) => ({
      command: call.command,
      payload: structuredCloneIfAvailable(call.payload),
    }));
  }

  async invoke(command, payload = {}) {
    if (!knownCommands.has(command)) {
      throw new Error(`Unknown fake embedded transport command: ${String(command || "")}`);
    }

    const normalizedPayload = payload || {};
    this.#calls.push({
      command,
      payload: structuredCloneIfAvailable(normalizedPayload),
    });

    return await this.#handlers[command](normalizedPayload);
  }
}

function structuredCloneIfAvailable(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

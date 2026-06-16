import { createSelfHostedEditorPreloadApi } from "../Desktop/ElectronPreloadApi.js";
import { EditorBackendClient } from "../Scripts/Backend/Clients/EditorBackendClient.js";
import { EditorBackendTransportCommand } from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import {
  hasSelfHostedEditorPreloadApi,
  SelfHostedEditorPreloadBackendTransport,
} from "../Scripts/Backend/Clients/SelfHostedEditorPreloadBackendTransport.js";

const preloadCalls = [];
const preloadApi = createSelfHostedEditorPreloadApi({
  handlers: {
    [EditorBackendTransportCommand.LanguageDiagnostics]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.LanguageDiagnostics, payload });
      return { diagnostics: [] };
    },
    [EditorBackendTransportCommand.ProjectSessionStatus]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.ProjectSessionStatus, payload });
      return {
        caches: {},
        languageSession: {
          kind: "process-per-request",
          supportedEndpoints: ["diagnostics"],
        },
      };
    },
    [EditorBackendTransportCommand.RuntimeStep]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.RuntimeStep, payload });
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
  },
});

assertEqual(typeof preloadApi.invoke, "undefined", "preload API must not expose generic invoke");
assertEqual(typeof preloadApi.send, "undefined", "preload API must not expose generic send");
assertEqual(typeof preloadApi.request, "undefined", "preload API must not expose generic request");
assertEqual(hasSelfHostedEditorPreloadApi({ inscapeSelfHostedEditor: preloadApi }), true, "preload API detection");
assertEqual(hasSelfHostedEditorPreloadApi({}), false, "missing preload API detection");

const preloadTransport = new SelfHostedEditorPreloadBackendTransport({ preloadApi });
const diagnosticsResult = await preloadTransport.invoke(EditorBackendTransportCommand.LanguageDiagnostics, {
  scriptText: "# Opening",
});
assertEqual(Array.isArray(diagnosticsResult.diagnostics), true, "preload transport diagnostics payload");
assertEqual(preloadCalls[0].command, EditorBackendTransportCommand.LanguageDiagnostics, "preload transport diagnostics command");
assertEqual(preloadCalls[0].payload.scriptText, "# Opening", "preload transport forwards payload");

let unknownCommandRejected = false;
try {
  await preloadTransport.invoke("unknown.command", {});
} catch {
  unknownCommandRejected = true;
}
assertEqual(unknownCommandRejected, true, "preload transport rejects unknown commands");

const desktopBackendClient = new EditorBackendClient({
  globalObject: {
    inscapeSelfHostedEditor: preloadApi,
  },
  sessionId: "desktop-session",
});
await desktopBackendClient.languageSession.diagnose({ scriptText: "# Desktop" });
const desktopDiagnosticsCall = preloadCalls.find((call) =>
  call.command === EditorBackendTransportCommand.LanguageDiagnostics
  && call.payload.scriptText === "# Desktop"
);
assertEqual(Boolean(desktopDiagnosticsCall), true, "default desktop backend client uses preload transport");
const runtimeStep = await desktopBackendClient.runtimeSession.step({
  action: {
    kind: "continue",
  },
});
assertEqual(runtimeStep.currentNode.name, "Opening", "desktop backend client runtime preload payload");
const projectStatus = await desktopBackendClient.projectSession.status();
assertEqual(projectStatus.sessionId, "desktop-session", "desktop backend client project session id");

const fetchCalls = [];
const devBackendClient = new EditorBackendClient({
  baseUrl: "http://127.0.0.1:5178",
  fetchImpl: async (url, options) => {
    fetchCalls.push({
      body: options.body,
      method: options.method,
      url,
    });
    return {
      ok: true,
      async json() {
        return {
          diagnostics: [],
        };
      },
    };
  },
  globalObject: {},
});
await devBackendClient.languageSession.diagnose({ scriptText: "# Dev" });
assertEqual(fetchCalls[0].url, "http://127.0.0.1:5178/api/diagnostics", "dev backend client keeps HTTP transport");

console.log("SelfHostedEditor preload transport contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

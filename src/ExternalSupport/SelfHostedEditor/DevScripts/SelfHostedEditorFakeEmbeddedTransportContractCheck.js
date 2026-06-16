import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EditorBackendClient } from "../Scripts/Backend/Clients/EditorBackendClient.js";
import { createEditorBackendServices } from "../Scripts/Backend/Clients/EditorBackendServiceRegistry.js";
import { EditorBackendTransportCommand } from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import { SelfHostedEditorDiagnosticsBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js";
import { SelfHostedEditorLocalizationReviewBridge } from "../Scripts/Localization/Bridges/SelfHostedEditorLocalizationReviewBridge.js";
import { SelfHostedEditorRuntimeBridge } from "../Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";
import { SelfHostedEditorFakeEmbeddedTransport } from "./SelfHostedEditorFakeEmbeddedTransport.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fakeTransportSource = fs.readFileSync(
  path.join(moduleRoot, "DevScripts/SelfHostedEditorFakeEmbeddedTransport.js"),
  "utf8"
);
assertEqual(fakeTransportSource.includes("/api/"), false, "fake embedded transport must not know dev-host routes");
assertEqual(fakeTransportSource.includes("fetch("), false, "fake embedded transport must not fetch");
assertEqual(fakeTransportSource.includes("postJson"), false, "fake embedded transport must not expose HTTP helper");

const fakeTransport = new SelfHostedEditorFakeEmbeddedTransport({
  handlers: {
    [EditorBackendTransportCommand.LanguageDiagnostics]: async (payload) => ({
      diagnostics: [
        {
          code: "fake-diagnostic",
          location: {
            character: 0,
            length: 1,
            line: 0,
            sourcePath: payload.languageSession?.activeRelativePath || "story/opening.inscape",
          },
          message: "fake embedded diagnostics",
          severity: "info",
        },
      ],
    }),
    [EditorBackendTransportCommand.RuntimeStep]: async (payload) => ({
      currentNode: {
        name: payload.action?.target || "Opening",
      },
      state: {
        currentNodeName: payload.action?.target || "Opening",
      },
    }),
    [EditorBackendTransportCommand.LocalizationReview]: async () => ({
      baseline: {
        source: "current-extract",
      },
      presenter: {
        items: [],
      },
    }),
  },
});
assertEqual(typeof fakeTransport.invoke, "function", "fake embedded transport exposes invoke");
assertEqual(typeof fakeTransport.postJson, "undefined", "fake embedded transport must not expose postJson");
assertEqual(typeof fakeTransport.fetchImpl, "undefined", "fake embedded transport must not expose fetchImpl");

let unknownCommandRejected = false;
try {
  await fakeTransport.invoke("unknown.command", {});
} catch {
  unknownCommandRejected = true;
}
assertEqual(unknownCommandRejected, true, "fake embedded transport rejects unknown command");

const backendClient = new EditorBackendClient({
  sessionId: "fake-embedded-session",
  transport: fakeTransport,
});
const services = createEditorBackendServices({ backendClient });
const diagnosticsBridge = new SelfHostedEditorDiagnosticsBridge({
  languageSessionClient: services.languageSessionClient,
});
const runtimeBridge = new SelfHostedEditorRuntimeBridge({
  runtimeSessionClient: services.runtimeSessionClient,
});
const localizationBridge = new SelfHostedEditorLocalizationReviewBridge({
  localizationWorkflowClient: services.localizationWorkflowClient,
});
const workspaceContext = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
      text: "secret draft text",
    },
  ],
  revision: 9,
};
for (const bridge of [diagnosticsBridge, runtimeBridge, localizationBridge]) {
  bridge.setWorkspaceContextProvider(() => workspaceContext);
}

const diagnosticSnapshot = await diagnosticsBridge.getDiagnostics("# Opening");
assertEqual(diagnosticSnapshot.provider, "language-server", "fake embedded diagnostics provider");
assertEqual(diagnosticSnapshot.diagnostics[0].code, "fake-diagnostic", "fake embedded diagnostics code");
const runtimeSnapshot = await runtimeBridge.stepRuntimeSnapshot("# Opening", { currentNode: {} }, {
  kind: "choose",
  target: "Evidence",
});
assertEqual(runtimeSnapshot.provider, "runtime-project", "fake embedded runtime provider");
assertEqual(runtimeSnapshot.snapshot.currentNode.name, "Evidence", "fake embedded runtime target");
const localizationSnapshot = await localizationBridge.getLocalizationReview("# Opening");
assertEqual(localizationSnapshot.provider, "localization-review", "fake embedded localization provider");

const projectStatus = await services.projectSessionService.status({ workspace: workspaceContext });
assertEqual(projectStatus.mode, "dev-host", "fake embedded compatible project-session status");
assertEqual(projectStatus.sessionId, "fake-embedded-session", "fake embedded project-session id");
assertEqual(projectStatus.workspace.documentCount, 1, "fake embedded project-session workspace count");
assertEqual(JSON.stringify(projectStatus).includes("secret draft text"), false, "fake embedded status must not expose workspace text");

const calledCommands = fakeTransport.calls.map((call) => call.command);
assertEqual(calledCommands.includes(EditorBackendTransportCommand.LanguageDiagnostics), true, "fake embedded diagnostics command called");
assertEqual(calledCommands.includes(EditorBackendTransportCommand.RuntimeStep), true, "fake embedded runtime command called");
assertEqual(calledCommands.includes(EditorBackendTransportCommand.LocalizationReview), true, "fake embedded localization command called");
assertEqual(calledCommands.includes(EditorBackendTransportCommand.ProjectSessionStatus), true, "fake embedded project-session command called");
assertEqual(JSON.stringify(fakeTransport.calls).includes("/api/"), false, "fake embedded calls must not contain dev-host routes");

console.log("SelfHostedEditor fake embedded transport contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

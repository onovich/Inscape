import { EditorBackendClient } from "../Scripts/Backend/Clients/EditorBackendClient.js";
import { createEditorBackendServices } from "../Scripts/Backend/Clients/EditorBackendServiceRegistry.js";
import { EditorBackendTransportCommand } from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import {
  EditorBackendLanguageSessionRequestFormat,
  EditorBackendLanguageSessionRequestModel,
} from "../Scripts/Backend/Models/EditorBackendLanguageSessionRequestModel.js";
import {
  EditorBackendProjectSessionFormat,
  EditorBackendProjectSessionModel,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionModel.js";
import { SelfHostedEditorLineMapBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js";
import { SelfHostedEditorLocalizationReviewBridge } from "../Scripts/Localization/Bridges/SelfHostedEditorLocalizationReviewBridge.js";
import { SelfHostedEditorRuntimeBridge } from "../Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";

const openingScriptText = "# Opening\n-> Evidence";
const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "story/opening.inscape",
      text: "secret opening text",
    },
    {
      relativePath: "story/branch.inscape",
      text: "secret branch text",
    },
  ],
  revision: 7,
  workspaceName: "story",
};
const sessionCacheStatus = {
  caches: {
    lineMap: {
      entryCount: 2,
      entries: [
        {
          byteLength: 256,
          sessionId: "shared-session",
        },
      ],
    },
    localizationBaseline: {
      entryCount: 1,
      entries: [
        {
          byteLength: 128,
          sessionId: "shared-session",
        },
      ],
    },
    runtime: {
      entryCount: 3,
      entries: [
        {
          byteLength: 512,
          sessionId: "shared-session",
        },
      ],
    },
  },
};

const directStatus = EditorBackendProjectSessionModel.buildDevHostProjectSession({
  sessionCacheStatus,
  sessionId: "shared session!?",
  workspace,
});
assertEqual(directStatus.format, EditorBackendProjectSessionFormat, "project session format");
assertEqual(directStatus.formatVersion, 1, "project session version");
assertEqual(directStatus.mode, "dev-host", "project session mode");
assertEqual(directStatus.sessionId, "shared-session--", "project session id normalization");
assertEqual(directStatus.workspace.source, "request-snapshot", "project session workspace source");
assertEqual(directStatus.workspace.activeRelativePath, "story/opening.inscape", "project session active document");
assertEqual(directStatus.workspace.documentCount, 2, "project session document count");
assertEqual(directStatus.workspace.revision, 7, "project session revision");
assertEqual(directStatus.languageSession.kind, "process-per-request", "project session language kind");
assertEqual(
  directStatus.languageSession.supportedEndpoints.join(","),
  "diagnostics,completions,definition,references,hover,document-symbols",
  "project session language process-per-request endpoints"
);
assertEqual(directStatus.runtimeSession.kind, "bounded-cache", "project session runtime kind");
assertEqual(directStatus.runtimeSession.entryCount, 3, "project session runtime count");
assertEqual(directStatus.lineIdentitySession.entryCount, 2, "project session line-map count");
assertEqual(directStatus.localizationSession.entryCount, 1, "project session localization count");
assertNotIncludes(JSON.stringify(directStatus), "secret", "project session status should not expose workspace text");
assertNotIncludes(JSON.stringify(directStatus), "entries", "project session status should not expose cache entry metadata");
const stdioStatus = EditorBackendProjectSessionModel.buildDevHostProjectSession({
  sessionCacheStatus: {
    ...sessionCacheStatus,
    languageSession: {
      fallbackEndpoints: ["completions", "definition", "references", "hover"],
      fallbackKind: "process-per-request",
      kind: "stdio-spike",
      supportedEndpoints: ["diagnostics", "document-symbols"],
    },
  },
  sessionId: "shared-session",
  workspace,
});
assertEqual(stdioStatus.languageSession.kind, "stdio-spike", "project session stdio spike language kind");
assertEqual(
  stdioStatus.languageSession.supportedEndpoints.join(","),
  "diagnostics,document-symbols",
  "project session stdio spike endpoints"
);
assertEqual(stdioStatus.languageSession.fallbackKind, "process-per-request", "project session stdio fallback kind");
assertEqual(
  stdioStatus.languageSession.fallbackEndpoints.join(","),
  "completions,definition,references,hover",
  "project session stdio fallback endpoints"
);
assertNotIncludes(JSON.stringify(stdioStatus), "secret", "project session stdio status should not expose workspace text");

const backendCalls = [];
const backendClient = new EditorBackendClient({
  sessionId: "shared-session",
  transport: {
    async invoke(command, payload) {
      backendCalls.push({
        command,
        payload,
      });
      return sessionCacheStatus;
    },
  },
});
const clientStatus = await backendClient.projectSession.status({ workspace });
assertEqual(backendCalls[0].command, EditorBackendTransportCommand.ProjectSessionStatus, "project session status command");
assertEqual(Object.keys(backendCalls[0].payload).length, 0, "project session status command should not upload workspace text");
assertEqual(clientStatus.format, EditorBackendProjectSessionFormat, "backend client project session format");
assertEqual(clientStatus.sessionId, "shared-session", "backend client project session id");
assertEqual(clientStatus.workspace.documentCount, 2, "backend client project session document count");
const diagnosticStatus = await backendClient.diagnostics.sessionStatus({ workspace });
assertEqual(diagnosticStatus.format, EditorBackendProjectSessionFormat, "diagnostics status compatibility format");
assertEqual(diagnosticStatus.sessionId, "shared-session", "diagnostics status compatibility session id");

const backendServices = createEditorBackendServices({ backendClient });
const runtimeBridge = new SelfHostedEditorRuntimeBridge({
  runtimeSessionClient: backendServices.runtimeSessionClient,
});
const lineMapBridge = new SelfHostedEditorLineMapBridge({
  lineIdentityClient: backendServices.lineIdentityClient,
});
const localizationBridge = new SelfHostedEditorLocalizationReviewBridge({
  localizationWorkflowClient: backendServices.localizationWorkflowClient,
});
assertEqual(runtimeBridge.sessionId, "shared-session", "runtime bridge should use backend project session id");
assertEqual(lineMapBridge.sessionId, "shared-session", "line-map bridge should use backend project session id");
assertEqual(localizationBridge.sessionId, "shared-session", "localization bridge should use backend project session id");

const languageRequest = EditorBackendLanguageSessionRequestModel.build({
  kind: "definition",
  request: {
    definitionName: "Evidence",
    scriptText: openingScriptText,
    workspace,
  },
  sessionId: "shared-session",
});
assertEqual(languageRequest.format, EditorBackendLanguageSessionRequestFormat, "language request format");
assertEqual(languageRequest.sessionId, "shared-session", "language request session id");
assertEqual(languageRequest.activeRelativePath, "story/opening.inscape", "language request active path");
assertEqual(languageRequest.documentRevision, 7, "language request revision");
assertEqual(languageRequest.query.kind, "definition", "language request query kind");
assertEqual(languageRequest.query.definitionName, "Evidence", "language request query target");
const devHostLanguagePayload = EditorBackendLanguageSessionRequestModel.toDevHostPayload(languageRequest);
assertEqual(devHostLanguagePayload.definitionName, "Evidence", "dev-host language payload keeps compatibility field");
assertEqual(devHostLanguagePayload.languageSession.format, EditorBackendLanguageSessionRequestFormat, "dev-host language payload includes session envelope");
assertEqual(devHostLanguagePayload.languageSession.sessionId, "shared-session", "dev-host language payload session id");
assertEqual(Boolean(devHostLanguagePayload.languageSession.workspace), false, "dev-host language envelope should not duplicate workspace text");

await backendClient.languageSession.definition({
  definitionName: "Evidence",
  scriptText: openingScriptText,
  workspace,
});
const languageCall = backendCalls.find((call) => call.command === EditorBackendTransportCommand.LanguageDefinition);
assertEqual(languageCall?.payload?.sessionId, "shared-session", "backend client language payload session id");
assertEqual(languageCall?.payload?.activeRelativePath, "story/opening.inscape", "backend client language active path");
assertEqual(languageCall?.payload?.documentRevision, 7, "backend client language revision");
assertEqual(languageCall?.payload?.languageSession?.format, EditorBackendLanguageSessionRequestFormat, "backend client language envelope format");
assertEqual(languageCall?.payload?.definitionName, "Evidence", "backend client language compatibility query");

console.log("SelfHostedEditor project session contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (String(text).includes(unexpected)) {
    throw new Error(`${label}: did not expect ${unexpected}`);
  }
}

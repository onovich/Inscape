import {
  RuntimeAuthoringSessionFormat,
  RuntimeAuthoringSessionFormatVersion,
  RuntimeAuthoringSessionModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeAuthoringSessionModelBuilder.js";
import { assertEqual, assertIncludesText, assertNotIncludesText } from "./SelfHostedEditorModelContractHarness.js";

const branchEvidenceKey = "branch" + "Query" + "Receipts";

const runtimeSnapshot = {
  actionRequests: [
    {
      mode: "fire",
      name: "play_timeline",
      payload: "secret action payload",
      requestId: "action-0",
    },
    {
      mode: "wait",
      name: "wait_for_ui",
      payload: "secret latest action payload",
      requestId: "action-1",
    },
  ],
  [branchEvidenceKey]: [
    {
      arguments: [
        {
          raw: "secret branch argument",
          value: {
            text: "secret branch argument value",
          },
        },
      ],
      context: "choice",
      name: "has_item",
      result: {
        bool: false,
        text: "secret branch result text",
      },
      sourceKind: "mock",
    },
    {
      arguments: [],
      context: "jump",
      name: "trust",
      result: {
        number: 3,
      },
      sourceKind: "recorded",
    },
  ],
  currentNode: {
    name: "gate.knock",
  },
  debugBody: "secret runtime snapshot body",
  format: "inscape.runtime-state",
  lastError: {
    code: "IRA005",
    message: "secret runtime error detail",
  },
  logEntries: [
    {
      lineId: "line-secret",
      nodeId: "gate.knock",
      sequence: 7,
      speaker: "Narrator",
      text: "secret revealed log text",
    },
  ],
  pendingAction: {
    handlerName: "Host.Wait",
    hostPayload: "secret pending host payload",
    mode: "wait",
    name: "wait_for_ui",
    raw: "secret pending raw action",
    requestId: "action-1",
    sourceLine: 22,
    status: "waiting",
  },
  state: {
    currentNodeName: "gate.knock",
    path: ["start", "gate.knock"],
    visibleStepCount: 2,
  },
};

const formalState = {
  body: "secret formal runtime body",
  flow: {
    stack: ["start", "gate.knock"],
  },
  format: "inscape.runtime-state",
  host: {
    checkpointId: "host-checkpoint-1",
  },
  position: {
    nodeId: "gate.knock",
  },
  scriptVersion: "script-v1",
};

const substate = {
  [branchEvidenceKey]: [
    {
      arguments: [
        {
          raw: "secret substate branch argument",
        },
      ],
      context: "choice",
      name: "has_item",
      result: {
        text: "secret substate result",
      },
      sourceKind: "mock",
    },
  ],
  flow: {
    stack: ["start"],
  },
  format: "inscape.runtime-substate",
  host: {
    checkpointId: "host-checkpoint-1",
  },
  pendingAction: {
    hostPayload: "secret substate pending payload",
    mode: "wait",
    name: "wait_for_ui",
    requestId: "action-1",
  },
  position: {
    nodeId: "gate.knock",
  },
  scriptVersion: "script-v1",
  stateBody: "secret substate body",
};

const session = RuntimeAuthoringSessionModelBuilder.build({
  currentSnapshot: {
    provider: "runtime-project",
    sessionId: "round-2-runtime-session",
    snapshot: runtimeSnapshot,
  },
  error: {
    code: "transport-failed",
    message: "secret transport failure detail",
  },
  formalState,
  provider: "runtime-project",
  stale: {
    isStale: false,
  },
  substate,
  transport: {
    kind: "desktop-command",
  },
  validation: {
    status: "compatible",
  },
  workspaceRevision: 12,
});

assertEqual(session.format, RuntimeAuthoringSessionFormat, "runtime authoring session format");
assertEqual(session.formatVersion, RuntimeAuthoringSessionFormatVersion, "runtime authoring session format version");
assertEqual(session.payloadContentExposed, false, "runtime authoring session must be text-free");
assertEqual(session.currentSnapshot.kind, "current-snapshot", "runtime snapshot summary kind");
assertEqual(session.currentSnapshot.available, true, "runtime snapshot should be available");
assertEqual(session.currentSnapshot.currentNodeName, "gate.knock", "runtime snapshot current node");
assertEqual(session.currentSnapshot.pathLength, 2, "runtime snapshot path count");
assertEqual(session.currentSnapshot.visibleStepCount, 2, "runtime snapshot visible step count");
assertEqual(session.currentSnapshot.hasPendingAction, true, "runtime snapshot pending flag");
assertEqual(session.currentSnapshot.actionRequestCount, 2, "runtime snapshot action request count");
assertEqual(session.currentSnapshot.logEntryCount, 1, "runtime snapshot log count");
assertEqual(session.currentSnapshot.branchEvidenceCount, 2, "runtime snapshot branch evidence count");
assertEqual(session.currentSnapshot.hasLastError, true, "runtime snapshot error flag");
assertEqual(session.currentSnapshot.lastErrorCode, "IRA005", "runtime snapshot error code");
assertEqual(session.formalState.kind, "formal-state", "formal state summary kind");
assertEqual(session.formalState.currentNodeName, "gate.knock", "formal state position node");
assertEqual(session.formalState.pathLength, 2, "formal state stack depth");
assertEqual(session.formalState.hasHostCheckpoint, true, "formal state host checkpoint flag");
assertEqual(session.formalState.scriptVersion, "script-v1", "formal state script version");
assertEqual(session.substate.kind, "runtime-substate", "substate summary kind");
assertEqual(session.substate.nodeId, "gate.knock", "substate node");
assertEqual(session.substate.hasPendingAction, true, "substate pending flag");
assertEqual(session.substate.branchEvidenceCount, 1, "substate branch evidence count");
assertEqual(session.substate.validationStatus, "compatible", "substate validation status");
assertEqual(session.substate.hasHostCheckpoint, true, "substate host checkpoint flag");
assertEqual(session.pendingAction.available, true, "pending action summary availability");
assertEqual(session.pendingAction.name, "wait_for_ui", "pending action name");
assertEqual(session.pendingAction.mode, "wait", "pending action mode");
assertEqual(session.pendingAction.requestId, "action-1", "pending action request id");
assertEqual(session.actionRequests.requestCount, 2, "action summary count");
assertEqual(session.actionRequests.modes.join(","), "fire,wait", "action summary modes");
assertEqual(session.actionRequests.latestName, "wait_for_ui", "action summary latest name");
assertEqual(session.logEntries.entryCount, 1, "log summary count");
assertEqual(session.logEntries.latestSequence, 7, "log summary latest sequence");
assertEqual(session.logEntries.hasSourceLinks, true, "log summary source links");
assertEqual(session.branchEvidence.entryCount, 2, "branch evidence summary count");
assertEqual(session.branchEvidence.queryNames.join(","), "has_item,trust", "branch evidence query names");
assertEqual(session.branchEvidence.sourceKinds.join(","), "mock,recorded", "branch evidence source kinds");
assertEqual(session.transport.startCommand, "runtime.start-or-observe", "runtime transport start command");
assertEqual(session.transport.stepCommand, "runtime.step", "runtime transport step command");
assertEqual(session.transport.devHostEquivalent, true, "runtime transport dev-host equivalence");
assertEqual(session.transport.desktopCommandEquivalent, true, "runtime transport desktop equivalence");
assertIncludesText(session.contentPolicy.excludes.join(","), "complete-log");
assertIncludesText(session.contentPolicy.excludes.join(","), "complete-action-history");

const serializedSession = JSON.stringify(session);
for (const secret of [
  "secret action payload",
  "secret latest action payload",
  "secret branch argument",
  "secret branch argument value",
  "secret branch result text",
  "secret runtime snapshot body",
  "secret runtime error detail",
  "secret revealed log text",
  "secret pending host payload",
  "secret pending raw action",
  "secret formal runtime body",
  "secret substate branch argument",
  "secret substate result",
  "secret substate pending payload",
  "secret substate body",
  "secret transport failure detail",
]) {
  assertNotIncludesText(serializedSession, secret);
}

const unavailableSession = RuntimeAuthoringSessionModelBuilder.build({
  currentSnapshot: {
    error: "secret unavailable runtime body",
    provider: "unavailable",
  },
  stale: {
    isStale: true,
    reason: "workspace revision changed",
  },
  transport: {
    kind: "dev-host-command",
  },
});
assertEqual(unavailableSession.currentSnapshot.available, false, "unavailable session snapshot availability");
assertEqual(unavailableSession.currentSnapshot.provider, "unavailable", "unavailable session provider");
assertEqual(unavailableSession.pendingAction.available, false, "unavailable session pending action");
assertEqual(unavailableSession.formalState.available, false, "unavailable session formal state");
assertEqual(unavailableSession.substate.available, false, "unavailable session substate");
assertEqual(unavailableSession.stale.isStale, true, "unavailable session stale flag");
assertEqual(unavailableSession.stale.reason, "workspace revision changed", "unavailable session stale reason");
assertNotIncludesText(JSON.stringify(unavailableSession), "secret unavailable runtime body");

console.log("SelfHostedEditor runtime authoring session contract ok");

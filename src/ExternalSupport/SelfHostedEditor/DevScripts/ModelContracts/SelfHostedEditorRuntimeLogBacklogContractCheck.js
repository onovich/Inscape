import { RuntimeLogBacklogPanelController } from "../../Scripts/Runtime/Controllers/RuntimeLogBacklogPanelController.js";
import {
  RuntimeLogBacklogFormat,
  RuntimeLogBacklogFormatVersion,
  RuntimeLogBacklogModelBuilder,
} from "../../Scripts/Runtime/Models/RuntimeLogBacklogModelBuilder.js";
import {
  assertEqual,
  assertIncludesText,
  assertNotIncludesText,
  findElementByClass,
  FakeElement,
  getTextContent,
  installFakeDomEnvironment,
} from "./SelfHostedEditorModelContractHarness.js";

installFakeDomEnvironment();

const storyGraphModel = {
  documents: [
    {
      nodes: [
        {
          lines: [
            {
              anchor: "line_visible",
              source: {
                column: 1,
                line: 7,
                sourcePath: "samples/runtime-log.inscape",
              },
              speaker: "Narrator",
              text: "Visible runtime text.",
            },
            {
              anchor: "line_hidden",
              source: {
                column: 1,
                line: 8,
                sourcePath: "samples/runtime-log.inscape",
              },
              speaker: "Narrator",
              text: "secret hidden branch text",
            },
          ],
          name: "Gate",
          source: {
            column: 1,
            line: 5,
            sourcePath: "samples/runtime-log.inscape",
          },
        },
      ],
      sourcePath: "samples/runtime-log.inscape",
    },
  ],
};

const backlogModel = RuntimeLogBacklogModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Gate",
      },
      logEntries: [
        {
          lineId: "line_visible",
          nodeId: "Gate",
          sequence: 1,
          speaker: "Narrator",
          text: "Visible runtime text.",
        },
      ],
      secretRuntimeStateBody: "secret formal runtime state body",
    },
  },
  sessionId: "runtime-log-session",
  storyGraphModel,
  workspaceRevision: 9,
});

assertEqual(backlogModel.format, RuntimeLogBacklogFormat, "runtime log backlog format");
assertEqual(backlogModel.formatVersion, RuntimeLogBacklogFormatVersion, "runtime log backlog format version");
assertEqual(backlogModel.state, "runtime-ready", "runtime log backlog ready state");
assertEqual(backlogModel.provider, "runtime-project", "runtime log backlog provider");
assertEqual(backlogModel.entryCount, 1, "runtime log backlog entry count");
assertEqual(backlogModel.entries[0].text, "Visible runtime text.", "runtime log backlog text");
assertEqual(backlogModel.entries[0].speaker, "Narrator", "runtime log backlog speaker");
assertEqual(backlogModel.entries[0].source.lineNumber, 7, "runtime log backlog source line");
assertEqual(backlogModel.entries[0].source.sourcePath, "samples/runtime-log.inscape", "runtime log backlog source path");
assertEqual(backlogModel.entries[0].hasSource, true, "runtime log backlog source availability");
assertEqual(backlogModel.writesToFormalRuntimeState, false, "runtime log does not write formal runtime state");
assertIncludesText(backlogModel.contentPolicy.excludes.join(","), "condition-hidden-text");

const serializedBacklog = JSON.stringify(backlogModel);
assertNotIncludesText(serializedBacklog, "secret hidden branch text");
assertNotIncludesText(serializedBacklog, "secret formal runtime state body");

let selectedLine = null;
const panelElement = new FakeElement("section");
const controller = new RuntimeLogBacklogPanelController(panelElement);
controller.onSourceLineSelected((selection) => {
  selectedLine = selection;
});
controller.render(backlogModel);
assertEqual(panelElement.dataset.runtimeLogState, "runtime-ready", "runtime log panel dataset");
assertIncludesText(getTextContent(panelElement), "Runtime Log");
assertIncludesText(getTextContent(panelElement), "Visible runtime text.");
assertIncludesText(getTextContent(panelElement), "Narrator");
assertNotIncludesText(getTextContent(panelElement), "secret hidden branch text");
await findElementByClass(panelElement, "runtime-log-backlog-source-button").click();
assertEqual(selectedLine.lineNumber, 7, "runtime log source button line");
assertEqual(selectedLine.sourcePath, "samples/runtime-log.inscape", "runtime log source button path");

const emptyBacklogModel = RuntimeLogBacklogModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      currentNode: {
        name: "Opening",
      },
      logEntries: [],
    },
  },
});
assertEqual(emptyBacklogModel.state, "runtime-empty", "runtime log empty state");

const unavailableBacklogModel = RuntimeLogBacklogModelBuilder.build({
  runtimeSnapshot: {
    provider: "unavailable",
    snapshot: null,
  },
});
assertEqual(unavailableBacklogModel.state, "runtime-unavailable", "runtime log unavailable state");
assertEqual(unavailableBacklogModel.entryCount, 0, "runtime unavailable has no log entries");

const errorBacklogModel = RuntimeLogBacklogModelBuilder.build({
  runtimeSnapshot: {
    error: "secret runtime log error detail",
    provider: "unavailable",
    snapshot: null,
  },
});
assertEqual(errorBacklogModel.state, "runtime-error", "runtime log error state");
assertEqual(errorBacklogModel.runtimeError.hasError, true, "runtime log error summary");
assertNotIncludesText(JSON.stringify(errorBacklogModel), "secret runtime log error detail");

const lineIdBacklogModel = RuntimeLogBacklogModelBuilder.build({
  runtimeSnapshot: {
    provider: "runtime-project",
    snapshot: {
      logEntries: [
        {
          lineId: "line:12",
          nodeId: "Detached",
          sequence: 2,
          text: "Fallback line id.",
        },
      ],
    },
  },
});
assertEqual(lineIdBacklogModel.entries[0].source.lineNumber, 12, "runtime log line id fallback source");

console.log("SelfHostedEditor runtime log backlog contract ok");

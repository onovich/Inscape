using System;
using System.IO;
using System.Text;
using System.Text.Json;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void P4IntegrationSmokeRunsPlayableMvpSample() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            string keyQueryProviderPath = Path.Combine(directory, "runtime-key-query-provider.json");
            string noKeyQueryProviderPath = Path.Combine(directory, "runtime-no-key-query-provider.json");
            string actionDispatcherPath = Path.Combine(directory, "runtime-action-dispatcher.json");
            string resumePath = Path.Combine(directory, "runtime-resume.json");
            string formalStatePath = Path.Combine(directory, "runtime-formal-state.json");
            string initialSnapshotPath = Path.Combine(directory, "runtime-initial-snapshot.json");
            string keySnapshotPath = Path.Combine(directory, "runtime-key-snapshot.json");
            string keyLineSnapshotPath = Path.Combine(directory, "runtime-key-line-snapshot.json");
            string pendingSubstatePath = Path.Combine(directory, "runtime-pending-substate.json");
            string resumedSubstatePath = Path.Combine(directory, "runtime-resumed-substate.json");
            string advancedSubstatePath = Path.Combine(directory, "runtime-advanced-substate.json");
            string helpSnapshotPath = Path.Combine(directory, "runtime-help-snapshot.json");
            string helpLineSnapshotPath = Path.Combine(directory, "runtime-help-line-snapshot.json");

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: You stand before the gate.
? Gate
- [has_item("silver_key")] Use the silver key -> gate.open
- Knock -> gate.knock

# gate.open
@emit play_timeline mira_reveal
Narrator: Door opens.
-> end

# gate.knock
@emit wait_for_ui confirm_help
Narrator: Knocked.
? [visited("gate.knock") and trust("mira") >= 3] -> mira.help
-> gate.locked

# mira.help
Narrator: Mira helps.
-> end

# gate.locked
Narrator: Locked.
-> end

# end
Narrator: End.
""", Encoding.UTF8);

            File.WriteAllText(keyQueryProviderPath, """
{
  "kind": "Mock",
  "mockValues": [
    {
      "name": "has_item",
      "arguments": [
        { "kind": "String", "stringValue": "silver_key" }
      ],
      "value": { "kind": "Bool", "boolValue": true }
    }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(noKeyQueryProviderPath, """
{
  "kind": "Mock",
  "mockValues": [
    {
      "name": "has_item",
      "arguments": [
        { "kind": "String", "stringValue": "silver_key" }
      ],
      "value": { "kind": "Bool", "boolValue": false }
    },
    {
      "name": "trust",
      "arguments": [
        { "kind": "String", "stringValue": "mira" }
      ],
      "value": { "kind": "Number", "numberValue": 4 }
    }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(actionDispatcherPath, """
{
  "actions": [
    { "name": "play_timeline", "mode": "fire" },
    { "name": "wait_for_ui", "mode": "wait" }
  ],
  "handlers": [
    { "name": "play_timeline", "handlerName": "Timeline.Play" },
    { "name": "wait_for_ui", "handlerName": "Ui.WaitForUi" }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(resumePath, """
{
  "requestId": "action-1",
  "status": "completed",
  "hostPayload": "{\"confirmed\":true}"
}
""", Encoding.UTF8);

            try {
                string formalStateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--query-provider",
                    noKeyQueryProviderPath,
                    "--export-state",
                    "--script-version",
                    "script-v1",
                    "--host-checkpoint-id",
                    "checkpoint-formal",
                });
                File.WriteAllText(formalStatePath, formalStateJson, Encoding.UTF8);
                using (JsonDocument formalStateDocument = JsonDocument.Parse(formalStateJson)) {
                    JsonElement formalStateRoot = formalStateDocument.RootElement;
                    AssertEqual("inscape.runtime-state", formalStateRoot.GetProperty("format").GetString(), "P4 smoke formal state format");
                    AssertEqual("start", formalStateRoot.GetProperty("position").GetProperty("nodeId").GetString(), "P4 smoke formal state position");
                    AssertEqual("checkpoint-formal", formalStateRoot.GetProperty("host").GetProperty("checkpointId").GetString(), "P4 smoke formal state checkpoint");
                    AssertFalse(formalStateJson.Contains("logEntries", StringComparison.OrdinalIgnoreCase), "P4 smoke formal state should not include full log.");
                    AssertFalse(formalStateJson.Contains("branchQueryReceipts", StringComparison.OrdinalIgnoreCase), "P4 smoke formal state should not include branch receipts.");
                }

                string formalValidationJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--validate-state",
                    formalStatePath,
                    "--script-version",
                    "script-v1",
                });
                using (JsonDocument formalValidationDocument = JsonDocument.Parse(formalValidationJson)) {
                    AssertEqual("compatible", ReadLowerStatus(formalValidationDocument), "P4 smoke formal state validation");
                }

                string restoredFormalJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    formalStatePath,
                    "--query-provider",
                    noKeyQueryProviderPath,
                    "--advance-flow",
                });
                using (JsonDocument restoredFormalDocument = JsonDocument.Parse(restoredFormalJson)) {
                    JsonElement restoredFormalRoot = restoredFormalDocument.RootElement;
                    AssertEqual("start", restoredFormalRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "P4 smoke restored formal state node");
                    AssertEqual(1, restoredFormalRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "P4 smoke restored formal state flow");
                }

                string keySnapshotJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--query-provider",
                    keyQueryProviderPath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--choose",
                    "0",
                    "0",
                });
                File.WriteAllText(keySnapshotPath, keySnapshotJson, Encoding.UTF8);
                using (JsonDocument keySnapshotDocument = JsonDocument.Parse(keySnapshotJson)) {
                    JsonElement keyRoot = keySnapshotDocument.RootElement;
                    AssertEqual("gate.open", keyRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "P4 smoke key path current node");
                    AssertEqual(1, keyRoot.GetProperty("actionRequests").GetArrayLength(), "P4 smoke fire action request count");
                    AssertEqual("play_timeline", keyRoot.GetProperty("actionRequests")[0].GetProperty("name").GetString(), "P4 smoke fire action name");
                    AssertEqual("fire", keyRoot.GetProperty("actionRequests")[0].GetProperty("mode").GetString(), "P4 smoke fire action mode");
                    AssertEqual(JsonValueKind.Null, keyRoot.GetProperty("pendingAction").ValueKind, "P4 smoke fire action should not block.");
                    AssertTrue(RuntimeSnapshotHasReceipt(keyRoot, "has_item"), "P4 smoke key choice should record query receipt.");
                }

                string keyLineJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    keySnapshotPath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--advance-flow",
                });
                File.WriteAllText(keyLineSnapshotPath, keyLineJson, Encoding.UTF8);
                using (JsonDocument keyLineDocument = JsonDocument.Parse(keyLineJson)) {
                    JsonElement keyLineRoot = keyLineDocument.RootElement;
                    AssertEqual(1, keyLineRoot.GetProperty("logEntries").GetArrayLength(), "P4 smoke key path log count");
                    AssertEqual("Door opens.", keyLineRoot.GetProperty("logEntries")[0].GetProperty("text").GetString(), "P4 smoke key path log text");
                }

                string keyEndJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    keyLineSnapshotPath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--continue",
                });
                using (JsonDocument keyEndDocument = JsonDocument.Parse(keyEndJson)) {
                    AssertEqual("end", keyEndDocument.RootElement.GetProperty("state").GetProperty("currentNodeName").GetString(), "P4 smoke key path reaches end");
                }

                string initialSnapshotJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--query-provider",
                    noKeyQueryProviderPath,
                });
                File.WriteAllText(initialSnapshotPath, initialSnapshotJson, Encoding.UTF8);
                using (JsonDocument initialSnapshotDocument = JsonDocument.Parse(initialSnapshotJson)) {
                    JsonElement initialRoot = initialSnapshotDocument.RootElement;
                    JsonElement options = initialRoot.GetProperty("currentNode").GetProperty("choices")[0].GetProperty("options");
                    AssertEqual(1, options.GetArrayLength(), "P4 smoke should filter invisible key choice.");
                    AssertEqual("Knock", options[0].GetProperty("text").GetString(), "P4 smoke visible fallback choice");
                    AssertTrue(RuntimeSnapshotHasReceipt(initialRoot, "has_item"), "P4 smoke initial choice should record hidden key query receipt.");
                }

                string pendingSubstateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    initialSnapshotPath,
                    "--query-provider",
                    noKeyQueryProviderPath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--choose",
                    "0",
                    "0",
                    "--export-substate",
                    "--script-version",
                    "script-v1",
                    "--host-checkpoint-id",
                    "checkpoint-pending",
                });
                File.WriteAllText(pendingSubstatePath, pendingSubstateJson, Encoding.UTF8);
                using (JsonDocument pendingSubstateDocument = JsonDocument.Parse(pendingSubstateJson)) {
                    JsonElement pendingRoot = pendingSubstateDocument.RootElement;
                    AssertEqual("inscape.runtime-substate", pendingRoot.GetProperty("format").GetString(), "P4 smoke pending substate format");
                    AssertEqual("gate.knock", pendingRoot.GetProperty("position").GetProperty("nodeId").GetString(), "P4 smoke pending substate node");
                    AssertEqual("wait_for_ui", pendingRoot.GetProperty("pendingAction").GetProperty("name").GetString(), "P4 smoke wait action name");
                    AssertEqual("wait", pendingRoot.GetProperty("pendingAction").GetProperty("mode").GetString(), "P4 smoke wait action mode");
                    AssertEqual("checkpoint-pending", pendingRoot.GetProperty("host").GetProperty("checkpointId").GetString(), "P4 smoke pending substate checkpoint");
                    AssertEqual(1, pendingRoot.GetProperty("branchQueryReceipts").GetArrayLength(), "P4 smoke pending substate preserves choice receipt.");
                    AssertFalse(pendingSubstateJson.Contains("logEntries", StringComparison.OrdinalIgnoreCase), "P4 smoke substate should not include full log.");
                    AssertFalse(pendingSubstateJson.Contains("actionRequests", StringComparison.OrdinalIgnoreCase), "P4 smoke substate should not include full action request history.");
                }

                string substateValidationJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--validate-substate",
                    pendingSubstatePath,
                    "--script-version",
                    "script-v1",
                });
                using (JsonDocument substateValidationDocument = JsonDocument.Parse(substateValidationJson)) {
                    AssertEqual("compatible", ReadLowerStatus(substateValidationDocument), "P4 smoke substate validation");
                }

                string resumedSubstateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    pendingSubstatePath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--resume-action",
                    resumePath,
                    "--export-substate",
                    "--script-version",
                    "script-v1",
                });
                File.WriteAllText(resumedSubstatePath, resumedSubstateJson, Encoding.UTF8);
                using (JsonDocument resumedSubstateDocument = JsonDocument.Parse(resumedSubstateJson)) {
                    JsonElement resumedRoot = resumedSubstateDocument.RootElement;
                    AssertEqual("gate.knock", resumedRoot.GetProperty("position").GetProperty("nodeId").GetString(), "P4 smoke resumed substate node");
                    AssertEqual(JsonValueKind.Null, resumedRoot.GetProperty("pendingAction").ValueKind, "P4 smoke resumed substate pending action");
                }

                string knockLogJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    resumedSubstatePath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--advance-flow",
                });
                using (JsonDocument knockLogDocument = JsonDocument.Parse(knockLogJson)) {
                    JsonElement knockLogRoot = knockLogDocument.RootElement;
                    AssertEqual(1, knockLogRoot.GetProperty("logEntries").GetArrayLength(), "P4 smoke restored substate log count");
                    AssertEqual("Knocked.", knockLogRoot.GetProperty("logEntries")[0].GetProperty("text").GetString(), "P4 smoke restored substate log text");
                    AssertEqual(0, knockLogRoot.GetProperty("actionRequests").GetArrayLength(), "P4 smoke restored pending action should not redispatch.");
                }

                string advancedSubstateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    resumedSubstatePath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--advance-flow",
                    "--export-substate",
                    "--script-version",
                    "script-v1",
                });
                File.WriteAllText(advancedSubstatePath, advancedSubstateJson, Encoding.UTF8);

                string helpJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    advancedSubstatePath,
                    "--query-provider",
                    noKeyQueryProviderPath,
                    "--continue",
                });
                File.WriteAllText(helpSnapshotPath, helpJson, Encoding.UTF8);
                using (JsonDocument helpDocument = JsonDocument.Parse(helpJson)) {
                    JsonElement helpRoot = helpDocument.RootElement;
                    AssertEqual("mira.help", helpRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "P4 smoke should follow first true conditional jump after restore.");
                    AssertTrue(RuntimeSnapshotHasReceipt(helpRoot, "visited"), "P4 smoke should record internal fact receipt.");
                    AssertTrue(RuntimeSnapshotHasReceipt(helpRoot, "trust"), "P4 smoke should record host query receipt.");
                }

                string helpLineJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    helpSnapshotPath,
                    "--query-provider",
                    noKeyQueryProviderPath,
                    "--advance-flow",
                });
                File.WriteAllText(helpLineSnapshotPath, helpLineJson, Encoding.UTF8);
                using (JsonDocument helpLineDocument = JsonDocument.Parse(helpLineJson)) {
                    JsonElement helpLineRoot = helpLineDocument.RootElement;
                    AssertEqual(1, helpLineRoot.GetProperty("logEntries").GetArrayLength(), "P4 smoke help path log count after substate load");
                    AssertEqual("Mira helps.", helpLineRoot.GetProperty("logEntries")[0].GetProperty("text").GetString(), "P4 smoke help path log text");
                }

                string helpEndJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    helpLineSnapshotPath,
                    "--query-provider",
                    noKeyQueryProviderPath,
                    "--continue",
                });
                using (JsonDocument helpEndDocument = JsonDocument.Parse(helpEndJson)) {
                    JsonElement helpEndRoot = helpEndDocument.RootElement;
                    AssertEqual("end", helpEndRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "P4 smoke restored path reaches end");
                    AssertTrue(helpEndRoot.GetProperty("state").GetProperty("path").GetArrayLength() >= 4, "P4 smoke restored path should keep playable route history.");
                }
            } finally {
                Directory.Delete(directory, true);
            }
        }
    }
}

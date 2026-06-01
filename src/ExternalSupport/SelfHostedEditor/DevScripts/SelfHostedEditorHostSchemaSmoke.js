import {
  getHostSchemaCapabilitiesForScriptText,
} from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Gold [player.gold]
@emit quest.accepted`;

const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "inscape.config.json",
      text: JSON.stringify({
        hostSchema: "config/inscape.host.schema.json",
      }, null, 2),
    },
    {
      relativePath: "config/inscape.host.schema.json",
      text: JSON.stringify({
        events: [
          {
            delivery: "fire-and-forget",
            description: "Quest accepted event",
            name: "quest.accepted",
          },
        ],
        queries: [
          {
            description: "Current gold amount",
            name: "player.gold",
            returnType: "number",
          },
        ],
      }, null, 2),
    },
    {
      relativePath: "story/opening.inscape",
      text: scriptText,
    },
  ],
};

async function main() {
  const catalog = await getHostSchemaCapabilitiesForScriptText(scriptText, workspace);
  assertEqual(catalog.format, "inscape.host-schema.capabilities", "catalog format");
  assertEqual(catalog.hostSchema?.loaded, true, "host schema loaded");
  assertEqual(catalog.queries?.[0]?.name, "player.gold", "query name");
  assertEqual(catalog.queries?.[0]?.returnType, "number", "query return type");
  assertEqual(catalog.events?.[0]?.name, "quest.accepted", "event name");
  assertEqual(catalog.events?.[0]?.delivery, "fire-and-forget", "event delivery");

  console.log("SelfHostedEditor Host Schema smoke ok");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

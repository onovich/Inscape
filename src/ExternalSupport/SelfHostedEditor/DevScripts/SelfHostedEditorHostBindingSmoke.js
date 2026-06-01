import {
  getHostBindingCapabilitiesForScriptText,
} from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
Narrator: Welcome.
Witness: I saw it.
@timeline camera_push`;

const workspace = {
  currentFilePath: "story/opening.inscape",
  documents: [
    {
      relativePath: "inscape.config.json",
      text: JSON.stringify({
        hostBridge: "config/inscape.host.bridge.json",
      }, null, 2),
    },
    {
      relativePath: "config/inscape.host.bridge.json",
      text: JSON.stringify({
        format: "inscape.host-bridge",
        formatVersion: 1,
        ids: [
          {
            kind: "speaker",
            name: "Narrator",
            host: {
              roleId: 1001,
            },
          },
          {
            kind: "timeline",
            name: "court_intro",
            host: {
              assetId: 2001,
              addressableKey: "timeline/court_intro",
            },
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
  const catalog = await getHostBindingCapabilitiesForScriptText(scriptText, workspace);
  assertEqual(catalog.format, "inscape.host-binding.capabilities", "catalog format");
  assertEqual(catalog.hostBridge?.loaded, true, "host bridge loaded");
  assertEqual(catalog.speakers?.[0]?.name, "Narrator", "configured speaker name");
  assertEqual(catalog.speakers?.[0]?.roleId, "1001", "configured speaker role id");
  assertEqual(catalog.speakers?.[1]?.name, "Witness", "workspace speaker name");
  assertEqual(catalog.bindings?.[0]?.name, "court_intro", "configured timeline name");
  assertEqual(catalog.bindings?.[0]?.assetId, "2001", "configured timeline asset id");
  assertEqual(catalog.bindings?.[1]?.name, "camera_push", "workspace timeline name");

  console.log("SelfHostedEditor Host Binding smoke ok");
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

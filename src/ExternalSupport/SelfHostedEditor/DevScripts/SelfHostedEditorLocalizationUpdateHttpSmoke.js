import { createSelfHostedEditorPreviewServer } from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Hello.`;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const reviewResponse = await fetch(`http://127.0.0.1:${address.port}/api/localization-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scriptText }),
    });
    const review = await reviewResponse.json();
    const anchor = review?.presenter?.items?.[0]?.item?.anchor || "";
    if (!reviewResponse.ok) {
      throw new Error(`Localization review preflight failed with HTTP ${reviewResponse.status}`);
    }

    if (!anchor) {
      throw new Error("Localization update HTTP smoke could not find a presenter anchor.");
    }

    const previousCsv = [
      "anchor,node,kind,speaker,text,translation,sourcePath,line,column",
      `${anchor},Opening,Dialogue,Narrator,Hello.,Old translation,draft.inscape,3,1`,
      "",
    ].join("\n");
    const updateResponse = await fetch(`http://127.0.0.1:${address.port}/api/localization-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previousCsv,
        scriptText,
        translationOverrides: [{
          anchor,
          translation: "Edited translation",
        }],
      }),
    });
    const update = await updateResponse.json();

    if (!updateResponse.ok) {
      throw new Error(`Localization update HTTP smoke failed with HTTP ${updateResponse.status}`);
    }

    if (update?.format !== "inscape.self-hosted-editor.localization-updated-csv") {
      throw new Error(`Unexpected localization update HTTP format: ${String(update?.format || "")}`);
    }

    if (update?.formatVersion !== 1) {
      throw new Error(`Unexpected localization update HTTP formatVersion: ${String(update?.formatVersion || "")}`);
    }

    if (!String(update.csv || "").includes("Edited translation,current")) {
      throw new Error("Localization update HTTP smoke should apply translation overrides before merging.");
    }

    if (String(update.csv || "").includes("Old translation,current")) {
      throw new Error("Localization update HTTP smoke should not keep the old translation after overrides.");
    }

    console.log("SelfHostedEditor localization update HTTP smoke ok");
  } finally {
    await close(server);
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

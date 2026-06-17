import { createSelfHostedEditorPreviewServer } from "./StartSelfHostedEditorPreview.js";

const scriptText = `# Opening
@entry
Narrator: Review the evidence.
`;
const manualInitialScript = `# node.a
Narrator: Same line.
# node.b
Narrator: Same line.
`;
const manualRenamedScript = `# node.renamed
Narrator: Same line.
# node.b
Narrator: Same line.
`;

async function main() {
  const server = createSelfHostedEditorPreviewServer(0);
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/node-map-review`, {
      body: JSON.stringify({ scriptText }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payloadText = await response.text();
    const review = JSON.parse(payloadText);

    if (!response.ok) {
      throw new Error(`Stable node map HTTP smoke failed with HTTP ${response.status}`);
    }

    if (review?.format !== "inscape.self-hosted-editor.node-map-review") {
      throw new Error(`Unexpected stable node map HTTP format: ${String(review?.format || "")}`);
    }

    if (review?.report?.format !== "inscape.node-map-update-report") {
      throw new Error("Stable node map HTTP smoke should expose the shared update report.");
    }

    if (Number(review?.report?.summary?.newNodeCount || 0) !== 1) {
      throw new Error("Stable node map HTTP smoke should create one new stable node id.");
    }

    if (!String(review?.nodeMapPath || "").endsWith("inscape.node-map.json")) {
      throw new Error("Stable node map HTTP smoke should return a relative node map path.");
    }

    const manualInitialReview = await postJson(address.port, "/api/node-map-review", {
      scriptText: manualInitialScript,
    });
    const manualReview = await postJson(address.port, "/api/node-map-review", {
      scriptText: manualRenamedScript,
      workspace: {
        currentFilePath: "draft.inscape",
        documents: [
          {
            relativePath: "draft.inscape",
            text: manualRenamedScript,
          },
          {
            relativePath: "inscape.node-map.json",
            text: manualInitialReview.nodeMapText,
          },
        ],
      },
    });
    const manualItem = manualReview.report.items.find((item) => item.kind === "manual-review");
    const manualCandidate = manualItem?.candidates?.[0];
    if (!manualItem || !manualCandidate) {
      throw new Error("Stable node map HTTP smoke should expose a manual candidate.");
    }
    if (!Array.isArray(manualCandidate.evidence) || manualCandidate.evidence.length === 0
      || manualCandidate.applyPreview?.appliedStableId !== manualCandidate.stableId) {
      throw new Error("Stable node map HTTP smoke should expose shared candidate evidence and apply preview.");
    }

    const dryRunApply = await postJson(address.port, "/api/node-map-apply", {
      candidate: manualCandidate,
      dryRun: true,
      item: manualItem,
      nodeMapPath: manualReview.nodeMapPath,
      scriptText: manualRenamedScript,
      workspace: {
        currentFilePath: "draft.inscape",
        documents: [
          {
            relativePath: "draft.inscape",
            text: manualRenamedScript,
          },
          {
            relativePath: "inscape.node-map.json",
            text: manualReview.nodeMapText,
          },
        ],
      },
    });
    if (!dryRunApply?.dryRun || !String(dryRunApply?.nodeMapPath || "").endsWith("inscape.node-map-candidate-preview.json")) {
      throw new Error("Stable node map HTTP smoke should keep dry-run output on the preview path.");
    }
    if (dryRunApply?.result?.format !== "inscape.node-map-candidate-apply-result"
      || dryRunApply?.result?.writesNodeMap !== false
      || dryRunApply?.backup?.status !== "not-required-dry-run") {
      throw new Error("Stable node map HTTP smoke should expose dry-run apply result metadata.");
    }

    const apply = await postJson(address.port, "/api/node-map-apply", {
      candidate: manualCandidate,
      dryRun: false,
      item: manualItem,
      nodeMapPath: manualReview.nodeMapPath,
      scriptText: manualRenamedScript,
      workspace: {
        currentFilePath: "draft.inscape",
        documents: [
          {
            relativePath: "draft.inscape",
            text: manualRenamedScript,
          },
          {
            relativePath: "inscape.node-map.json",
            text: manualReview.nodeMapText,
          },
        ],
      },
    });
    if (apply?.format !== "inscape.self-hosted-editor.node-map-apply") {
      throw new Error("Stable node map HTTP smoke should expose candidate apply payload.");
    }

    if (apply?.candidateStableId !== manualCandidate.stableId || apply?.nodeMap?.format !== "inscape.node-map") {
      throw new Error("Stable node map HTTP smoke should apply the selected shared candidate.");
    }
    if (apply?.result?.format !== "inscape.node-map-candidate-apply-result"
      || apply?.result?.writesNodeMap !== true
      || apply?.changePreview?.appliedStableId !== manualCandidate.stableId
      || apply?.backup?.targetKind !== "node-map-sidecar"
      || !String(apply?.recoveryHint || "").includes(".inscape-workspace/backups")) {
      throw new Error("Stable node map HTTP smoke should expose apply result, backup metadata, and recovery hint.");
    }
    if (apply?.dryRun || !String(apply?.nodeMapPath || "").endsWith("inscape.node-map.json")) {
      throw new Error("Stable node map HTTP smoke should write apply output to the sidecar path.");
    }

    console.log("SelfHostedEditor stable node map HTTP smoke ok");
  } finally {
    await close(server);
  }
}

async function postJson(port, pathname, payload) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payloadText = await response.text();
  const json = JSON.parse(payloadText);
  if (!response.ok) {
    throw new Error(`POST ${pathname} failed with HTTP ${response.status}: ${payloadText}`);
  }

  return json;
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

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const cliProject = path.join(repoRoot, "src", "Internal", "Cli", "Inscape.Cli", "Inscape.Cli.csproj");

const storySource = `# start
@entry
@emit play_cutscene intro_scene
Narrator: [player.name].
? Decide:
- Continue -> branch.node
- Broken path -> missing.target
`;

const branchSource = `# branch.node
Witness: The fixture branch is present.
`;

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toPackagePath(filePath, root) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function walkFiles(root) {
  const files = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(toPackagePath(fullPath, root));
      }
    }
  }

  visit(root);
  return files.sort();
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function canonicalExistingPath(filePath) {
  return fs.realpathSync.native(filePath).toLowerCase();
}

function snapshotDirectory(root) {
  return walkFiles(root).map((file) => ({
    path: file,
    sha256: sha256(fs.readFileSync(path.join(root, file)))
  }));
}

function snapshotHash(snapshot) {
  return sha256(Buffer.from(JSON.stringify(snapshot), "utf8"));
}

function createWorkspace(root) {
  const configDirectory = path.join(root, "config");
  const chapterDirectory = path.join(root, "chapters");
  fs.mkdirSync(configDirectory, { recursive: true });
  fs.mkdirSync(chapterDirectory, { recursive: true });

  writeJson(path.join(root, "inscape.config.json"), {
    hostSchema: "config/inscape.host.schema.json",
    hostBridge: "config/inscape.host.bridge.json"
  });

  writeJson(path.join(configDirectory, "inscape.host.schema.json"), {
    format: "inscape.host-schema",
    formatVersion: 1,
    queries: [
      { name: "player.name", returnType: "string", isAsync: false, parameters: [] }
    ],
    actions: [
      {
        name: "open_window",
        mode: "fire",
        parameters: [
          { name: "windowId", type: "string", idKind: "ui-window", required: true }
        ]
      }
    ]
  });

  writeJson(path.join(configDirectory, "inscape.host.bridge.json"), {
    format: "inscape.host-bridge",
    formatVersion: 1,
    ids: [
      { kind: "ui-window", name: "inventory_panel", host: { assetId: 7 } }
    ],
    queries: [
      { name: "player.name", handler: { kind: "test" } }
    ],
    actions: [
      { name: "open_window", handler: { kind: "test" } }
    ]
  });

  fs.writeFileSync(path.join(root, "story.inscape"), storySource, "utf8");
  fs.writeFileSync(path.join(chapterDirectory, "branch.inscape"), branchSource, "utf8");
}

function runPackageExport(workspaceRoot, outputRoot) {
  const result = childProcess.spawnSync(
    "dotnet",
    [
      "run",
      "--project",
      cliProject,
      "--",
      "export-host-integration-package-project",
      workspaceRoot,
      "-o",
      outputRoot
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error
  };
}

function assertExportSucceeded(result, manifestPath) {
  if (result.error) {
    throw result.error;
  }

  invariant(result.status === 0, `package export failed: ${result.stderr || result.stdout}`);
  invariant(result.stderr.trim() === "", `package export wrote stderr: ${result.stderr}`);
  invariant(
    canonicalExistingPath(result.stdout.trim()) === canonicalExistingPath(manifestPath),
    `package export should print the manifest path: ${result.stdout.trim()}`
  );
}

function assertManifest(manifest) {
  invariant(manifest.format === "inscape.integration-package", "manifest format mismatch");
  invariant(Array.isArray(manifest.artifacts), "manifest artifacts must be an array");
  invariant(manifest.capabilities.writesHostData === false, "manifest must not write host data");
  invariant(manifest.capabilities.runtimeIntegration === false, "manifest must not claim runtime integration");
  invariant(manifest.capabilities.previewBridge === false, "manifest must not claim preview bridge");

  const requiredReady = new Map([
    ["manifest", "manifest.json"],
    ["source-files", "source"],
    ["narrative-graph-ir", "graph/project-ir.json"],
    ["usage-manifest", "usage/usage.json"],
    ["host-schema-capabilities", "host/host-schema-capabilities.json"],
    ["host-integration-audit", "host/host-integration-audit.json"],
    ["localization-csv", "localization/l10n.csv"],
    ["localization-anchor-map", "localization/anchor-map.json"],
    ["source-locations", "source-map/source-locations.json"],
    ["readiness-report", "reports/readiness-report.json"]
  ]);

  for (const artifact of manifest.artifacts) {
    invariant(typeof artifact.path === "string", "artifact path must be a string");
    invariant(!path.isAbsolute(artifact.path), `artifact path must be package-relative: ${artifact.path}`);
    invariant(!artifact.path.includes("\\"), `artifact path must use forward slashes: ${artifact.path}`);
    invariant(!artifact.path.includes(".."), `artifact path must not traverse: ${artifact.path}`);
  }

  for (const [kind, artifactPath] of requiredReady) {
    const artifact = manifest.artifacts.find((item) => item.kind === kind && item.path === artifactPath);
    invariant(artifact, `manifest missing artifact: ${kind}`);
    invariant(artifact.status === "ready", `${kind} must be ready`);
  }
}

function assertPackage(outputRoot) {
  const requiredFiles = [
    "manifest.json",
    "source/story.inscape",
    "source/chapters/branch.inscape",
    "graph/project-ir.json",
    "usage/usage.json",
    "host/host-schema-capabilities.json",
    "host/host-integration-audit.json",
    "localization/l10n.csv",
    "localization/anchor-map.json",
    "source-map/source-locations.json",
    "reports/readiness-report.json"
  ];

  for (const file of requiredFiles) {
    invariant(fs.existsSync(path.join(outputRoot, file)), `missing package file: ${file}`);
  }

  invariant(
    !fs.existsSync(path.join(outputRoot, "host", "host-bridge-candidate.json")),
    "package CLI must not generate host bridge candidates"
  );

  const manifest = readJson(path.join(outputRoot, "manifest.json"));
  const graph = readJson(path.join(outputRoot, "graph", "project-ir.json"));
  const usage = readJson(path.join(outputRoot, "usage", "usage.json"));
  const audit = readJson(path.join(outputRoot, "host", "host-integration-audit.json"));
  const anchorMap = readJson(path.join(outputRoot, "localization", "anchor-map.json"));
  const sourceMap = readJson(path.join(outputRoot, "source-map", "source-locations.json"));
  const readiness = readJson(path.join(outputRoot, "reports", "readiness-report.json"));
  const localizationCsv = fs.readFileSync(path.join(outputRoot, "localization", "l10n.csv"), "utf8");

  assertManifest(manifest);
  invariant(graph.format === "inscape.project-ir", "graph format mismatch");
  invariant(graph.hasErrors === true, "graph should preserve compiler diagnostics");
  invariant(
    Array.isArray(graph.diagnostics) && graph.diagnostics.some((diagnostic) => diagnostic.code === "INS020"),
    "graph diagnostics should include missing target"
  );

  invariant(usage.format === "inscape.usage", "usage format mismatch");
  invariant(
    usage.actions.some((action) => action.name === "play_cutscene"),
    "usage should preserve unknown action"
  );

  invariant(audit.format === "inscape.host-integration.audit", "audit format mismatch");
  invariant(audit.summary.diagnosticCount >= 1, "audit should report host integration diagnostics");
  invariant(
    audit.diagnostics.some(
      (diagnostic) => diagnostic.code === "HIA002" && diagnostic.subjectName === "play_cutscene"
    ),
    "audit should report unknown action diagnostic"
  );

  invariant(localizationCsv.includes("source/story.inscape"), "l10n CSV should use package source path");
  invariant(sourceMap.format === "inscape.source-locations", "source map format mismatch");
  invariant(sourceMap.coordinateSystem === "compiler-1-based", "source map coordinate system mismatch");
  const sourcePaths = new Set(sourceMap.sources.map((source) => source.path));
  invariant(sourcePaths.has("source/story.inscape"), "source map should include story source");
  invariant(sourcePaths.has("source/chapters/branch.inscape"), "source map should include nested source");

  invariant(anchorMap.format === "inscape.localization-anchor-map", "anchor map format mismatch");
  invariant(
    anchorMap.entries.some((entry) => entry.source && entry.source.path === "source/story.inscape"),
    "anchor map should point to package source"
  );

  invariant(readiness.format === "inscape.host-integration.readiness-report", "readiness format mismatch");
  invariant(readiness.summary.result === "ready", "readiness should report static package ready");
  invariant(readiness.summary.readyCount === readiness.summary.artifactCount, "readiness should mark all artifacts ready");
  invariant(readiness.summary.writesHostData === false, "readiness must not write host data");
  invariant(readiness.boundary.runtimeIntegration === false, "readiness must not claim runtime integration");
  invariant(readiness.boundary.previewBridge === false, "readiness must not claim preview bridge");
  invariant(readiness.boundary.writesHostData === false, "readiness boundary must not write host data");
  invariant(readiness.hostBridgeCandidate.status === "missing", "host bridge candidate must stay missing");
}

function assertDirtyOutputRejected(workspaceRoot, outputRoot) {
  const unexpectedPath = path.join(outputRoot, "host", "unexpected.json");
  fs.writeFileSync(unexpectedPath, "{}\n", "utf8");

  const result = runPackageExport(workspaceRoot, outputRoot);
  invariant(result.status === 2, "dirty package output should be rejected with usage error");
  invariant(
    result.stderr.includes("contains non-package files"),
    "dirty package output should explain non-package content"
  );
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inscape-host-integration-package-cli-smoke-"));
  const workspaceRoot = path.join(tempRoot, "workspace");
  const outputRoot = path.join(tempRoot, "package");
  const manifestPath = path.join(outputRoot, "manifest.json");

  try {
    fs.mkdirSync(workspaceRoot, { recursive: true });
    createWorkspace(workspaceRoot);

    const first = runPackageExport(workspaceRoot, outputRoot);
    assertExportSucceeded(first, manifestPath);
    assertPackage(outputRoot);

    const firstSnapshot = snapshotDirectory(outputRoot);
    const second = runPackageExport(workspaceRoot, outputRoot);
    assertExportSucceeded(second, manifestPath);
    const secondSnapshot = snapshotDirectory(outputRoot);
    invariant(
      JSON.stringify(firstSnapshot) === JSON.stringify(secondSnapshot),
      "repeated export should be byte-stable"
    );

    assertDirtyOutputRejected(workspaceRoot, outputRoot);

    console.log(
      JSON.stringify(
        {
          status: "pass",
          packageFileCount: firstSnapshot.length,
          deterministic: true,
          packageSha256: snapshotHash(firstSnapshot),
          writesHostData: false,
          runtimeIntegration: false,
          previewBridge: false,
          hostBridgeCandidateGenerated: false
        },
        null,
        2
      )
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();

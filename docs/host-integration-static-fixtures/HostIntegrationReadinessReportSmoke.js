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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function canonicalExistingPath(filePath) {
  return fs.realpathSync.native(filePath).toLowerCase();
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

function runCli(args) {
  const result = childProcess.spawnSync("dotnet", ["run", "--project", cliProject, "--", ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function exportPackage(workspaceRoot, packageRoot) {
  const result = runCli([
    "export-host-integration-package-project",
    workspaceRoot,
    "-o",
    packageRoot
  ]);
  const manifestPath = path.join(packageRoot, "manifest.json");

  invariant(result.status === 0, `package export failed: ${result.stderr || result.stdout}`);
  invariant(result.stderr.trim() === "", `package export wrote stderr: ${result.stderr}`);
  invariant(
    canonicalExistingPath(result.stdout.trim()) === canonicalExistingPath(manifestPath),
    `package export should print manifest path: ${result.stdout.trim()}`
  );
}

function generateReport(packageRoot, outputPath) {
  return runCli([
    "generate-host-integration-readiness-report-package",
    packageRoot,
    "-o",
    outputPath
  ]);
}

function generateCandidate(packageRoot, outputPath) {
  const result = runCli([
    "generate-host-bridge-candidate-package",
    packageRoot,
    "-o",
    outputPath
  ]);

  invariant(result.status === 0, `candidate generation failed: ${result.stderr || result.stdout}`);
  invariant(result.stderr.trim() === "", `candidate generation wrote stderr: ${result.stderr}`);
  invariant(
    canonicalExistingPath(result.stdout.trim()) === canonicalExistingPath(outputPath),
    `candidate generator should print output path: ${result.stdout.trim()}`
  );
}

function assertReportRunSucceeded(result, outputPath) {
  invariant(result.status === 0, `readiness report generation failed: ${result.stderr || result.stdout}`);
  invariant(result.stderr.trim() === "", `readiness report generation wrote stderr: ${result.stderr}`);
  invariant(
    canonicalExistingPath(result.stdout.trim()) === canonicalExistingPath(outputPath),
    `readiness report generator should print output path: ${result.stdout.trim()}`
  );
}

function assertBoundary(report, expectedCandidateStatus = "missing") {
  invariant(report.summary.writesHostData === false, "summary must not write host data");
  invariant(report.boundary.runtimeIntegration === false, "report must not claim runtime integration");
  invariant(report.boundary.previewBridge === false, "report must not claim preview bridge");
  invariant(report.boundary.writesHostData === false, "report boundary must not write host data");
  invariant(report.boundary.containsHostDependency === false, "report must not claim host dependency");
  invariant(
    report.hostBridgeCandidate.status === expectedCandidateStatus,
    `host bridge candidate status should be ${expectedCandidateStatus}`
  );
  invariant(report.hostBridgeCandidate.writesHostData === false, "host bridge candidate must not write host data");
}

function assertGeneratedReport(report) {
  invariant(report.format === "inscape.host-integration.readiness-report", "report format mismatch");
  invariant(report.formatVersion === 1, "report formatVersion mismatch");
  invariant(report.package.manifest === "manifest.json", "report package manifest path mismatch");
  invariant(Array.isArray(report.artifactChecks), "artifactChecks must be an array");
  invariant(report.artifactChecks.length === report.summary.artifactCount, "artifact count mismatch");
  invariant(report.summary.result === "blocked", "fixture report should be diagnostic-blocked");
  invariant(report.summary.readyCount === report.summary.artifactCount, "all artifacts should be ready");
  invariant(report.summary.diagnosticCount >= 2, "report should aggregate compiler and host diagnostics");
  invariant(report.summary.errorCount >= 2, "report should count error diagnostics");
  invariant(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "INS020" && diagnostic.source.path === "source/story.inscape"
    ),
    "report should preserve compiler diagnostic source ref"
  );
  invariant(
    report.diagnostics.some(
      (diagnostic) => diagnostic.code === "HIA002" && diagnostic.source.path === "source/story.inscape"
    ),
    "report should preserve host integration diagnostic source ref"
  );
  assertBoundary(report);
}

function copyPackage(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}

function assertMissingArtifact(originalPackageRoot, tempRoot) {
  const packageRoot = path.join(tempRoot, "package-missing-artifact");
  const outputPath = path.join(tempRoot, "reports", "missing-artifact.json");
  copyPackage(originalPackageRoot, packageRoot);
  fs.rmSync(path.join(packageRoot, "usage", "usage.json"), { force: true });

  const result = generateReport(packageRoot, outputPath);
  assertReportRunSucceeded(result, outputPath);
  const report = readJson(outputPath);
  const missing = report.artifactChecks.find((artifact) => artifact.path === "usage/usage.json");
  invariant(missing && missing.status === "missing", "missing usage artifact should be reported");
  invariant(report.summary.result === "missing", "missing required artifact should drive summary result");
  assertBoundary(report);
}

function assertInvalidJsonArtifact(originalPackageRoot, tempRoot) {
  const packageRoot = path.join(tempRoot, "package-invalid-json");
  const outputPath = path.join(tempRoot, "reports", "invalid-json.json");
  copyPackage(originalPackageRoot, packageRoot);
  fs.writeFileSync(path.join(packageRoot, "graph", "project-ir.json"), "{ invalid json\n", "utf8");

  const result = generateReport(packageRoot, outputPath);
  assertReportRunSucceeded(result, outputPath);
  const report = readJson(outputPath);
  const invalid = report.artifactChecks.find((artifact) => artifact.path === "graph/project-ir.json");
  invariant(invalid && invalid.status === "invalid", "invalid graph JSON should be reported");
  invariant(report.summary.result === "invalid", "invalid artifact should drive summary result");
  assertBoundary(report);
}

function assertExistingCandidateSummary(originalPackageRoot, tempRoot) {
  const packageRoot = path.join(tempRoot, "package-existing-candidate");
  const outputPath = path.join(tempRoot, "reports", "existing-candidate.json");
  const candidatePath = path.join(packageRoot, "host", "host-bridge-candidate.json");
  copyPackage(originalPackageRoot, packageRoot);

  invariant(!fs.existsSync(candidatePath), "copied package should not already contain candidate evidence");
  generateCandidate(packageRoot, candidatePath);
  const candidateBytes = fs.readFileSync(candidatePath);
  const candidateHash = sha256(candidateBytes);
  const candidate = JSON.parse(candidateBytes.toString("utf8"));
  invariant(candidate.summary.result === "blocked", "fixture candidate should be blocked by unknown action");
  invariant(candidate.summary.candidateCount >= 1, "fixture candidate should contain review evidence");
  invariant(candidate.summary.writesHostData === false, "fixture candidate must not write host data");

  const result = generateReport(packageRoot, outputPath);
  assertReportRunSucceeded(result, outputPath);
  const report = readJson(outputPath);
  invariant(report.summary.result === "blocked", "existing blocked candidate should drive readiness result");
  invariant(report.hostBridgeCandidate.status === candidate.summary.result, "report should summarize candidate status");
  invariant(
    report.hostBridgeCandidate.candidateCount === candidate.summary.candidateCount,
    "report should summarize candidate count"
  );
  invariant(report.hostBridgeCandidate.writesHostData === false, "report candidate summary must not write host data");
  invariant(
    sha256(fs.readFileSync(candidatePath)) === candidateHash,
    "readiness report generator must not rewrite existing candidate evidence"
  );
  assertBoundary(report, "blocked");
}

function assertOutputGuards(packageRoot, tempRoot) {
  const outputDirectory = path.join(tempRoot, "reports");
  const directoryResult = generateReport(packageRoot, outputDirectory);
  invariant(directoryResult.status === 2, "directory output path should be rejected");
  invariant(
    directoryResult.stderr.includes("output path must be a file"),
    "directory output path should explain file requirement"
  );

  const missingOutputResult = runCli([
    "generate-host-integration-readiness-report-package",
    packageRoot
  ]);
  invariant(missingOutputResult.status === 2, "missing -o should be rejected");
  invariant(
    missingOutputResult.stderr.includes("requires -o <report.json>"),
    "missing -o should explain required output path"
  );
}

function assertDeterminism(packageRoot, tempRoot) {
  const outputPath = path.join(tempRoot, "reports", "readiness-report.regenerated.json");
  const first = generateReport(packageRoot, outputPath);
  assertReportRunSucceeded(first, outputPath);
  const firstBytes = fs.readFileSync(outputPath);
  const firstHash = sha256(firstBytes);
  assertGeneratedReport(JSON.parse(firstBytes.toString("utf8")));

  const second = generateReport(packageRoot, outputPath);
  assertReportRunSucceeded(second, outputPath);
  const secondBytes = fs.readFileSync(outputPath);
  const secondHash = sha256(secondBytes);
  invariant(firstHash === secondHash, "repeated generation should be byte-stable");
  return firstHash;
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inscape-host-integration-readiness-report-smoke-"));
  const workspaceRoot = path.join(tempRoot, "workspace");
  const packageRoot = path.join(tempRoot, "package");
  const reportsRoot = path.join(tempRoot, "reports");

  try {
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.mkdirSync(reportsRoot, { recursive: true });
    createWorkspace(workspaceRoot);
    exportPackage(workspaceRoot, packageRoot);

    invariant(
      !fs.existsSync(path.join(packageRoot, "host", "host-bridge-candidate.json")),
      "package export must not generate host bridge candidates"
    );

    const reportHash = assertDeterminism(packageRoot, tempRoot);
    assertMissingArtifact(packageRoot, tempRoot);
    assertInvalidJsonArtifact(packageRoot, tempRoot);
    assertExistingCandidateSummary(packageRoot, tempRoot);
    assertOutputGuards(packageRoot, tempRoot);

    invariant(
      !fs.existsSync(path.join(packageRoot, "host", "host-bridge-candidate.json")),
      "readiness report generator must not generate host bridge candidates"
    );

    console.log(
      JSON.stringify(
        {
          status: "pass",
          deterministic: true,
          readinessReportSha256: reportHash,
          missingArtifactCovered: true,
          invalidJsonCovered: true,
          existingCandidateCovered: true,
          outputGuardCovered: true,
          writesHostData: false,
          runtimeIntegration: false,
          previewBridge: false,
          hostBridgeCandidateGenerated: false,
          readinessGeneratedCandidate: false
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

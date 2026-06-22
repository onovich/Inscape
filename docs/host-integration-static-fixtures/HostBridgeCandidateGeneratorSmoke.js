const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const cliProject = path.join(repoRoot, "src", "Internal", "Cli", "Inscape.Cli", "Inscape.Cli.csproj");

const storySource = `# start
@entry
@emit play_timeline "intro_cutscene"
@emit play_cutscene intro_scene
Narrator: [player.name] and [player.rank].
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
  fs.mkdirSync(configDirectory, { recursive: true });

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
        name: "play_timeline",
        mode: "wait",
        parameters: [
          { name: "timelineId", type: "string", idKind: "timeline", required: true }
        ]
      }
    ]
  });

  writeJson(path.join(configDirectory, "inscape.host.bridge.json"), {
    format: "inscape.host-bridge",
    formatVersion: 1,
    ids: [],
    actions: [],
    queries: []
  });

  fs.writeFileSync(path.join(root, "story.inscape"), storySource, "utf8");
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
  invariant(
    !fs.existsSync(path.join(packageRoot, "host", "host-bridge-candidate.json")),
    "package export must not generate host bridge candidates by default"
  );
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

function assertNoUtf8Bom(filePath) {
  const bytes = fs.readFileSync(filePath);
  invariant(
    !(bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
    "candidate output must be UTF-8 without BOM"
  );
}

function findCandidate(candidate, candidateKind, subjectKind, subjectName) {
  return candidate.candidates.find(
    (item) =>
      item.candidateKind === candidateKind &&
      item.subject &&
      item.subject.kind === subjectKind &&
      item.subject.name === subjectName
  );
}

function assertCandidate(candidate) {
  invariant(candidate.format === "inscape.host-bridge-candidate", "candidate format mismatch");
  invariant(candidate.formatVersion === 1, "candidate formatVersion mismatch");
  invariant(candidate.summary.result === "blocked", "candidate should be blocked by unknown schema capabilities");
  invariant(candidate.summary.candidateCount === candidate.candidates.length, "candidate count mismatch");
  invariant(candidate.summary.candidateCount === 5, "fixture should produce five candidates");
  invariant(candidate.summary.blockedCount === 2, "fixture should produce two blocked schema candidates");
  invariant(candidate.summary.writesHostData === false, "candidate summary must not write host data");

  invariant(findCandidate(candidate, "id-binding", "timeline", "intro_cutscene"), "missing timeline id-binding candidate");
  invariant(findCandidate(candidate, "action-handler", "action", "play_timeline"), "missing action-handler candidate");
  invariant(findCandidate(candidate, "query-handler", "query", "player.name"), "missing query-handler candidate");
  invariant(findCandidate(candidate, "schema-capability", "action", "play_cutscene"), "missing blocked unknown action evidence");
  invariant(findCandidate(candidate, "schema-capability", "query", "player.rank"), "missing blocked unknown query evidence");
  invariant(
    !findCandidate(candidate, "action-handler", "action", "play_cutscene"),
    "unknown action must not become a fake action-handler"
  );

  for (const item of candidate.candidates) {
    invariant(item.review.required === true, "candidate review must be required");
    invariant(item.ownership.generatedOwnership === "candidate-only", "candidate ownership must be candidate-only");
    invariant(item.ownership.writesHostData === false, "candidate item must not write host data");
    invariant(item.demand.source.coordinateSystem === "compiler-1-based", "candidate source coordinate system mismatch");
  }
}

function assertOutputGuards(packageRoot, tempRoot) {
  const outputDirectory = path.join(tempRoot, "candidate-output-directory");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const directoryResult = runCli([
    "generate-host-bridge-candidate-package",
    packageRoot,
    "-o",
    outputDirectory
  ]);
  invariant(directoryResult.status === 2, "directory output path should be rejected");
  invariant(
    directoryResult.stderr.includes("output path must be a file"),
    "directory output path should explain file requirement"
  );

  const missingOutputResult = runCli([
    "generate-host-bridge-candidate-package",
    packageRoot
  ]);
  invariant(missingOutputResult.status === 2, "missing -o should be rejected");
  invariant(
    missingOutputResult.stderr.includes("requires -o <candidate.json>"),
    "missing -o should explain required output path"
  );
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inscape-host-bridge-candidate-smoke-"));
  const workspaceRoot = path.join(tempRoot, "workspace");
  const packageRoot = path.join(tempRoot, "package");
  const candidatePath = path.join(tempRoot, "candidate.json");

  try {
    fs.mkdirSync(workspaceRoot, { recursive: true });
    createWorkspace(workspaceRoot);
    exportPackage(workspaceRoot, packageRoot);

    generateCandidate(packageRoot, candidatePath);
    assertNoUtf8Bom(candidatePath);
    const firstBytes = fs.readFileSync(candidatePath);
    const firstHash = sha256(firstBytes);
    const firstCandidate = JSON.parse(firstBytes.toString("utf8"));
    assertCandidate(firstCandidate);

    generateCandidate(packageRoot, candidatePath);
    const secondHash = sha256(fs.readFileSync(candidatePath));
    invariant(firstHash === secondHash, "repeated candidate generation should be byte-stable");
    assertOutputGuards(packageRoot, tempRoot);

    console.log(
      JSON.stringify(
        {
          status: "pass",
          deterministic: true,
          candidateSha256: firstHash,
          candidateCount: firstCandidate.summary.candidateCount,
          blockedCount: firstCandidate.summary.blockedCount,
          writesHostData: false,
          generatedOwnership: "candidate-only",
          hostBridgeConfirmed: false,
          generatedApply: false
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

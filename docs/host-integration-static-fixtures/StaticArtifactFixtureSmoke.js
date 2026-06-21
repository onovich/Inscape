const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const fixturePath = path.join(__dirname, "fixtures.json");

const requiredScenarios = [
  "minimal dialogue",
  "branching",
  "localization",
  "missing speaker",
  "unknown action",
  "unsupported feature",
  "source diagnostic"
];

const allowedStatuses = new Set([
  "ready",
  "missing",
  "invalid",
  "unsupported",
  "incompatible",
  "blocked"
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = canonicalize(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function canonicalSha256(value) {
  const canonicalJson = JSON.stringify(canonicalize(value), null, 2);
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

function assertPackageSourcePath(fixture) {
  const source = fixture.source;
  invariant(isPlainObject(source), `${fixture.id}: source must be an object`);
  invariant(
    typeof source.path === "string" && source.path.startsWith("source/"),
    `${fixture.id}: source.path must be package-relative under source/`
  );
  invariant(!source.path.includes(".."), `${fixture.id}: source.path must not escape source/`);
  invariant(
    Array.isArray(source.lines) && source.lines.length > 0,
    `${fixture.id}: source.lines must contain at least one source line`
  );
}

function assertDiagnosticSource(fixture, diagnostic) {
  invariant(isPlainObject(diagnostic.source), `${fixture.id}: diagnostic source is required`);
  const source = diagnostic.source;
  invariant(
    typeof source.path === "string" && source.path.startsWith("source/"),
    `${fixture.id}: diagnostic source path must be package-relative under source/`
  );
  invariant(
    source.coordinateSystem === "compiler-1-based",
    `${fixture.id}: diagnostic source must use compiler-1-based coordinates`
  );
  invariant(Number.isInteger(source.line) && source.line > 0, `${fixture.id}: source line must be positive`);
  invariant(Number.isInteger(source.column) && source.column > 0, `${fixture.id}: source column must be positive`);
  if (source.length !== undefined) {
    invariant(Number.isInteger(source.length) && source.length > 0, `${fixture.id}: source length must be positive`);
  }
}

function assertCandidateSummary(fixture) {
  const candidateSummary = fixture.expected && fixture.expected.hostBridgeCandidate;
  invariant(isPlainObject(candidateSummary), `${fixture.id}: expected.hostBridgeCandidate is required`);
  invariant(candidateSummary.writesHostData === false, `${fixture.id}: candidates must not write host data`);
  invariant(
    Number.isInteger(candidateSummary.candidateCount) && candidateSummary.candidateCount >= 0,
    `${fixture.id}: candidateCount must be a non-negative integer`
  );

  const candidates = candidateSummary.candidates || [];
  invariant(Array.isArray(candidates), `${fixture.id}: candidates must be an array when present`);
  invariant(
    candidates.length === candidateSummary.candidateCount,
    `${fixture.id}: candidateCount must match candidates length`
  );

  for (const candidate of candidates) {
    invariant(typeof candidate.candidateKind === "string", `${fixture.id}: candidateKind is required`);
    invariant(typeof candidate.status === "string", `${fixture.id}: candidate status is required`);
    invariant(isPlainObject(candidate.subject), `${fixture.id}: candidate subject is required`);
    invariant(typeof candidate.confidenceLevel === "string", `${fixture.id}: confidenceLevel is required`);
  }
}

function assertFixture(fixture) {
  invariant(isPlainObject(fixture), "fixture must be an object");
  invariant(typeof fixture.id === "string" && fixture.id.length > 0, "fixture id is required");
  invariant(typeof fixture.requiredScenario === "string", `${fixture.id}: requiredScenario is required`);
  invariant(isPlainObject(fixture.profile), `${fixture.id}: profile is required`);
  assertPackageSourcePath(fixture);

  invariant(
    Array.isArray(fixture.artifactCoverage) && fixture.artifactCoverage.length > 0,
    `${fixture.id}: artifactCoverage must list at least one artifact`
  );

  const expected = fixture.expected;
  invariant(isPlainObject(expected), `${fixture.id}: expected is required`);
  invariant(allowedStatuses.has(expected.packageStatus), `${fixture.id}: packageStatus is unsupported`);
  assertCandidateSummary(fixture);

  const diagnostics = expected.diagnostics || [];
  invariant(Array.isArray(diagnostics), `${fixture.id}: diagnostics must be an array`);
  for (const diagnostic of diagnostics) {
    invariant(typeof diagnostic.code === "string", `${fixture.id}: diagnostic code is required`);
    invariant(typeof diagnostic.severity === "string", `${fixture.id}: diagnostic severity is required`);
    assertDiagnosticSource(fixture, diagnostic);
  }
}

function main() {
  const raw = fs.readFileSync(fixturePath, "utf8");
  const fixturePack = JSON.parse(raw);

  invariant(
    fixturePack.format === "inscape.host-integration.static-fixtures",
    "fixture pack format must be inscape.host-integration.static-fixtures"
  );
  invariant(fixturePack.formatVersion === 1, "fixture pack formatVersion must be 1");
  invariant(Array.isArray(fixturePack.fixtures), "fixture pack fixtures must be an array");

  const ids = new Set();
  const scenarios = new Set();
  for (const fixture of fixturePack.fixtures) {
    assertFixture(fixture);
    invariant(!ids.has(fixture.id), `duplicate fixture id: ${fixture.id}`);
    ids.add(fixture.id);
    scenarios.add(fixture.requiredScenario);
  }

  for (const scenario of requiredScenarios) {
    invariant(scenarios.has(scenario), `missing required scenario: ${scenario}`);
  }

  const unknownAction = fixturePack.fixtures.find((fixture) => fixture.id === "unknown-action");
  invariant(unknownAction, "unknown-action fixture is required");
  const unknownActionCandidates = unknownAction.expected.hostBridgeCandidate.candidates;
  invariant(
    unknownActionCandidates.some(
      (candidate) =>
        candidate.candidateKind === "schema-capability" &&
        candidate.status === "blocked" &&
        candidate.subject &&
        candidate.subject.kind === "action" &&
        candidate.subject.name === "play_cutscene"
    ),
    "unknown-action must stay blocked as schema-capability"
  );
  invariant(
    !unknownActionCandidates.some((candidate) => candidate.candidateKind === "action-handler"),
    "unknown-action must not invent an action-handler candidate"
  );

  const localization = fixturePack.fixtures.find((fixture) => fixture.id === "localization");
  invariant(localization, "localization fixture is required");
  invariant(
    localization.expected.localization.hostRuntimeLocalizationId === null,
    "localization fixture must not claim a host runtime localization id"
  );

  const hash = canonicalSha256(fixturePack);
  invariant(hash === canonicalSha256(JSON.parse(JSON.stringify(canonicalize(fixturePack)))), "canonical hash is unstable");

  console.log(
    JSON.stringify(
      {
        status: "pass",
        fixturePath: "docs/host-integration-static-fixtures/fixtures.json",
        fixtureCount: fixturePack.fixtures.length,
        requiredScenarioCount: requiredScenarios.length,
        canonicalSha256: hash,
        writesHostData: false,
        sourceCoordinateSystem: "compiler-1-based"
      },
      null,
      2
    )
  );
}

main();

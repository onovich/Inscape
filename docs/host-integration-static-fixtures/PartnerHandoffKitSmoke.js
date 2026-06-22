const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const feedbackPath = path.join(__dirname, "partner-feedback.generic.json");

const allowedArtifactStatuses = new Set([
  "read",
  "missing",
  "invalid-json",
  "unsupported-format",
  "skipped",
  "not-applicable"
]);

const allowedPartnerEvidenceKinds = new Set([
  "package-validation",
  "catalog-match",
  "localization-review",
  "source-ref-review",
  "diagnostic-review",
  "unsupported-feature",
  "partner-note"
]);

const allowedEvidenceStatuses = new Set([
  "observed",
  "accepted-evidence",
  "rejected-evidence",
  "needs-review",
  "blocked",
  "conflict"
]);

const allowedCandidateKinds = new Set([
  "id-binding",
  "action-handler",
  "query-handler",
  "schema-capability",
  "resource-binding",
  "partner-diagnostic"
]);

const allowedCandidateStatuses = new Set([
  "needs-review",
  "accepted-evidence",
  "rejected-evidence",
  "needs-schema",
  "needs-host-catalog",
  "conflict",
  "blocked",
  "unsupported"
]);

const forbiddenPolicyKeys = new Set([
  "rollbackPolicy",
  "replayPolicy",
  "failurePolicy",
  "timeoutPolicy"
]);

const forbiddenTruthyKeys = new Set([
  "writesHostData",
  "generatedApply",
  "confirmedHostBridge",
  "runtimeIntegration",
  "hostSave"
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

function visit(value, callback, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, callback, pathParts.concat(String(index))));
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    callback(key, child, pathParts.concat(key));
    visit(child, callback, pathParts.concat(key));
  }
}

function assertNoForbiddenExpansion(feedback) {
  visit(feedback, (key, value, pathParts) => {
    invariant(!forbiddenPolicyKeys.has(key), `forbidden Host Schema action policy key: ${pathParts.join(".")}`);
    if (forbiddenTruthyKeys.has(key)) {
      invariant(value === false, `${pathParts.join(".")} must be false for POC-1`);
    }
  });
}

function assertPackageRelativePath(value, label) {
  invariant(typeof value === "string" && value.length > 0, `${label} path is required`);
  invariant(!path.isAbsolute(value), `${label} path must be package-relative`);
  invariant(!value.includes("\\"), `${label} path must use forward slashes`);
  invariant(!value.split("/").includes(".."), `${label} path must not traverse`);
}

function assertSourceRef(sourceRef, label) {
  invariant(isPlainObject(sourceRef), `${label}: source ref must be an object`);
  assertPackageRelativePath(sourceRef.path, `${label}.path`);
  invariant(sourceRef.path.startsWith("source/"), `${label}.path must be under source/`);
  invariant(sourceRef.coordinateSystem === "compiler-1-based", `${label}: coordinateSystem must be compiler-1-based`);
  invariant(Number.isInteger(sourceRef.line) && sourceRef.line > 0, `${label}: line must be positive`);
  invariant(Number.isInteger(sourceRef.column) && sourceRef.column > 0, `${label}: column must be positive`);
  if (sourceRef.length !== undefined) {
    invariant(Number.isInteger(sourceRef.length) && sourceRef.length > 0, `${label}: length must be positive`);
  }
}

function assertArtifactReviewed(artifact, index) {
  invariant(isPlainObject(artifact), `artifactsReviewed[${index}] must be an object`);
  assertPackageRelativePath(artifact.path, `artifactsReviewed[${index}]`);
  invariant(
    allowedArtifactStatuses.has(artifact.status),
    `artifactsReviewed[${index}] status is unsupported: ${artifact.status}`
  );
  invariant(typeof artifact.format === "string" && artifact.format.length > 0, `artifactsReviewed[${index}] format is required`);
  invariant(Array.isArray(artifact.notes), `artifactsReviewed[${index}] notes must be an array`);
}

function assertPartnerEvidence(evidence, evidenceIds) {
  invariant(isPlainObject(evidence), "partnerEvidence item must be an object");
  invariant(typeof evidence.id === "string" && evidence.id.length > 0, "partnerEvidence id is required");
  invariant(!evidenceIds.has(evidence.id), `duplicate partnerEvidence id: ${evidence.id}`);
  evidenceIds.add(evidence.id);
  invariant(allowedPartnerEvidenceKinds.has(evidence.kind), `${evidence.id}: unsupported partner evidence kind`);
  invariant(allowedEvidenceStatuses.has(evidence.status), `${evidence.id}: unsupported partner evidence status`);
  invariant(Array.isArray(evidence.sourceArtifacts), `${evidence.id}: sourceArtifacts must be an array`);
  for (const artifactPath of evidence.sourceArtifacts) {
    assertPackageRelativePath(artifactPath, `${evidence.id}.sourceArtifacts`);
  }
  invariant(typeof evidence.summary === "string" && evidence.summary.length > 0, `${evidence.id}: summary is required`);
  invariant(evidence.writesHostData === false, `${evidence.id}: writesHostData must be false`);
  invariant(Array.isArray(evidence.sourceRefs), `${evidence.id}: sourceRefs must be an array`);
  evidence.sourceRefs.forEach((sourceRef, index) => assertSourceRef(sourceRef, `${evidence.id}.sourceRefs[${index}]`));
}

function assertCandidateEvidence(candidate, candidateIds, evidenceIds) {
  invariant(isPlainObject(candidate), "candidateEvidence item must be an object");
  invariant(typeof candidate.id === "string" && candidate.id.length > 0, "candidateEvidence id is required");
  invariant(!candidateIds.has(candidate.id), `duplicate candidateEvidence id: ${candidate.id}`);
  candidateIds.add(candidate.id);
  invariant(allowedCandidateKinds.has(candidate.candidateKind), `${candidate.id}: unsupported candidateKind`);
  invariant(allowedCandidateStatuses.has(candidate.status), `${candidate.id}: unsupported candidate status`);
  invariant(isPlainObject(candidate.subject), `${candidate.id}: subject is required`);
  invariant(typeof candidate.subject.kind === "string", `${candidate.id}: subject.kind is required`);
  invariant(typeof candidate.subject.name === "string", `${candidate.id}: subject.name is required`);

  invariant(Array.isArray(candidate.sourceArtifacts), `${candidate.id}: sourceArtifacts must be an array`);
  for (const artifactPath of candidate.sourceArtifacts) {
    assertPackageRelativePath(artifactPath, `${candidate.id}.sourceArtifacts`);
  }

  invariant(Array.isArray(candidate.partnerEvidenceRefs), `${candidate.id}: partnerEvidenceRefs must be an array`);
  for (const evidenceRef of candidate.partnerEvidenceRefs) {
    invariant(evidenceIds.has(evidenceRef), `${candidate.id}: unknown partnerEvidenceRef ${evidenceRef}`);
  }

  invariant(isPlainObject(candidate.review), `${candidate.id}: review is required`);
  invariant(candidate.review.required === true, `${candidate.id}: review.required must be true`);
  invariant(typeof candidate.review.decision === "string", `${candidate.id}: review.decision is required`);
  invariant(typeof candidate.review.owner === "string", `${candidate.id}: review.owner is required`);

  invariant(isPlainObject(candidate.ownership), `${candidate.id}: ownership is required`);
  invariant(candidate.ownership.generatedOwnership === "candidate-only", `${candidate.id}: ownership must be candidate-only`);
  invariant(candidate.ownership.writesHostData === false, `${candidate.id}: ownership.writesHostData must be false`);

  if (candidate.candidateKind === "schema-capability") {
    invariant(candidate.proposedMappingEvidence === null, `${candidate.id}: schema-capability must not invent mapping evidence`);
  }
}

function assertFeedback(feedback) {
  invariant(feedback.format === "inscape.host-integration.partner-feedback", "feedback format mismatch");
  invariant(feedback.formatVersion === 1, "feedback formatVersion must be 1");
  invariant(isPlainObject(feedback.profile), "profile is required");
  invariant(feedback.profile.kind === "partner-profile", "profile.kind must be partner-profile");
  invariant(feedback.profile.partner === "generic", "generic fixture profile.partner must be generic");

  invariant(isPlainObject(feedback.sourcePackage), "sourcePackage is required");
  assertPackageRelativePath(feedback.sourcePackage.manifest, "sourcePackage.manifest");
  assertPackageRelativePath(feedback.sourcePackage.readinessReport, "sourcePackage.readinessReport");

  const summary = feedback.summary;
  invariant(isPlainObject(summary), "summary is required");
  invariant(summary.status === "needs-review", "generic fixture should require manual review");
  invariant(summary.writesHostData === false, "summary.writesHostData must be false");

  const boundary = feedback.boundary;
  invariant(isPlainObject(boundary), "boundary is required");
  for (const key of forbiddenTruthyKeys) {
    invariant(boundary[key] === false, `boundary.${key} must be false`);
  }

  const artifactsReviewed = feedback.artifactsReviewed || [];
  invariant(Array.isArray(artifactsReviewed) && artifactsReviewed.length > 0, "artifactsReviewed must be a non-empty array");
  artifactsReviewed.forEach(assertArtifactReviewed);

  const partnerEvidence = feedback.partnerEvidence || [];
  invariant(Array.isArray(partnerEvidence), "partnerEvidence must be an array");
  invariant(summary.feedbackItemCount === partnerEvidence.length, "summary.feedbackItemCount must match partnerEvidence length");
  const evidenceIds = new Set();
  for (const evidence of partnerEvidence) {
    assertPartnerEvidence(evidence, evidenceIds);
  }

  const candidateEvidence = feedback.candidateEvidence || [];
  invariant(Array.isArray(candidateEvidence), "candidateEvidence must be an array");
  invariant(summary.candidateEvidenceCount === candidateEvidence.length, "summary.candidateEvidenceCount must match candidateEvidence length");
  const candidateIds = new Set();
  for (const candidate of candidateEvidence) {
    assertCandidateEvidence(candidate, candidateIds, evidenceIds);
  }

  const confirmedTruth = feedback.confirmedTruth;
  invariant(isPlainObject(confirmedTruth), "confirmedTruth is required");
  invariant(confirmedTruth.hasConfirmedChanges === false, "confirmedTruth.hasConfirmedChanges must be false");
  invariant(Array.isArray(confirmedTruth.artifacts), "confirmedTruth.artifacts must be an array");
  invariant(confirmedTruth.artifacts.length === 0, "generic fixture must not reference confirmed truth artifacts");
  invariant(summary.confirmedTruthChangeCount === 0, "summary.confirmedTruthChangeCount must be 0");

  assertNoForbiddenExpansion(feedback);
}

function main() {
  const raw = fs.readFileSync(feedbackPath, "utf8");
  const feedback = JSON.parse(raw);
  assertFeedback(feedback);

  console.log(
    JSON.stringify(
      {
        status: "pass",
        fixturePath: "docs/host-integration-static-fixtures/partner-feedback.generic.json",
        format: feedback.format,
        partnerEvidenceCount: feedback.partnerEvidence.length,
        candidateEvidenceCount: feedback.candidateEvidence.length,
        confirmedTruthChangeCount: feedback.summary.confirmedTruthChangeCount,
        writesHostData: false,
        generatedApply: false,
        runtimeIntegration: false,
        hostSave: false,
        sourceCoordinateSystem: "compiler-1-based",
        canonicalSha256: canonicalSha256(feedback)
      },
      null,
      2
    )
  );
}

main();

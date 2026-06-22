# Static Artifact POC Partner Feedback Schema

日期：2026-06-22

状态：Round 2 feedback schema baseline；面向 Static Artifact POC Partner Handoff Kit 的 partner dry-run feedback。

## 目标

Partner feedback artifact 用于把 partner dry-run 结果回传给 Inscape reviewer。它是 review evidence，不是 Host Bridge、Host Schema、adapter patch、runtime trace 或 host save payload。

它需要分清三件事：

- Partner evidence：partner importer / reviewer 观察到的 package、catalog、localization、source ref 或 diagnostic evidence。
- Candidate evidence：可以辅助人工审查的 mapping candidate evidence，仍需 manual review。
- Confirmed truth：已经由单独批准阶段写入正式 Host Bridge、Host Schema 或 adapter artifact 的结果。POC-1 feedback 默认不包含 confirmed truth changes。

## Artifact

建议文件名：

```text
partner-feedback.json
```

本仓库提供 generic fixture：

```text
docs/host-integration-static-fixtures/partner-feedback.generic.json
```

推荐 top-level shape：

```json
{
  "format": "inscape.host-integration.partner-feedback",
  "formatVersion": 1,
  "createdAtUtc": "2026-06-22T00:00:00Z",
  "profile": {
    "kind": "partner-profile",
    "partner": "generic",
    "purpose": "static-artifact-poc"
  },
  "sourcePackage": {
    "packageId": "sample-static-package",
    "manifest": "manifest.json",
    "readinessReport": "reports/readiness-report.json"
  },
  "summary": {
    "status": "needs-review",
    "feedbackItemCount": 3,
    "candidateEvidenceCount": 1,
    "confirmedTruthChangeCount": 0,
    "writesHostData": false
  },
  "boundary": {
    "writesHostData": false,
    "generatedApply": false,
    "confirmedHostBridge": false,
    "runtimeIntegration": false,
    "hostSave": false
  },
  "partnerEvidence": [],
  "candidateEvidence": [],
  "confirmedTruth": {
    "hasConfirmedChanges": false,
    "artifacts": []
  }
}
```

## Stable Top-Level Fields

- `format`: fixed to `inscape.host-integration.partner-feedback`.
- `formatVersion`: current version is `1`.
- `profile`: partner profile metadata. `partner` can be `generic`, `sinan` or another partner id, but partner-specific values remain evidence.
- `sourcePackage`: package identity and package-relative artifact refs.
- `summary`: review status, counts and safety flags.
- `boundary`: explicit POC-1 non-write flags.
- `artifactsReviewed`: optional review status per package artifact.
- `partnerEvidence[]`: partner-owned observations.
- `candidateEvidence[]`: reviewable candidate evidence, not confirmed truth.
- `confirmedTruth`: explicit summary of confirmed changes. POC-1 fixtures keep it empty.
- `openQuestions[]`: questions blocking later approved phases.

## Status Values

`summary.status` values:

- `ready`: partner found no blocking issues.
- `needs-review`: partner found evidence that needs manual review.
- `blocked`: partner dry-run cannot proceed without missing package, schema, catalog or source refs.
- `invalid`: feedback artifact itself is malformed or references incompatible package data.
- `accepted-with-followup`: review evidence was accepted, but formal writes remain outside POC-1.

Feedback status never grants write permission.

## Boundary Flags

Boundary flags must stay false for POC-1:

```json
{
  "writesHostData": false,
  "generatedApply": false,
  "confirmedHostBridge": false,
  "runtimeIntegration": false,
  "hostSave": false
}
```

If a partner tool cannot guarantee these flags, the feedback artifact must be treated as `blocked` or `invalid`.

## Artifact Review Records

Recommended `artifactsReviewed[]` item:

```json
{
  "path": "usage/usage.json",
  "status": "read",
  "format": "inscape.usage",
  "notes": []
}
```

Allowed statuses:

- `read`
- `missing`
- `invalid-json`
- `unsupported-format`
- `skipped`
- `not-applicable`

Artifact review records describe package readability only. They do not overwrite package artifacts.

## Partner Evidence

Partner evidence records capture observations:

```json
{
  "id": "evidence_unknown_action_blocked",
  "kind": "diagnostic-review",
  "status": "observed",
  "sourceArtifacts": [
    "usage/usage.json",
    "host/host-integration-audit.json"
  ],
  "summary": "Unknown action remains blocked because Host Schema has not declared it.",
  "sourceRefs": [
    {
      "path": "source/unknown-action.inscape",
      "line": 3,
      "column": 1,
      "length": 28,
      "coordinateSystem": "compiler-1-based"
    }
  ],
  "writesHostData": false
}
```

Recommended `kind` values:

- `package-validation`
- `catalog-match`
- `localization-review`
- `source-ref-review`
- `diagnostic-review`
- `unsupported-feature`
- `partner-note`

Recommended `status` values:

- `observed`
- `accepted-evidence`
- `rejected-evidence`
- `needs-review`
- `blocked`
- `conflict`

Partner evidence may mention partner catalog ids or runtime ids, but only as evidence fields. It must not redefine Inscape source truth.

## Candidate Evidence

Candidate evidence links partner observations to Host Bridge Candidate style review:

```json
{
  "id": "candidate_feedback_speaker_mira",
  "relatedCandidateId": "cand_speaker_mira",
  "candidateKind": "id-binding",
  "status": "needs-review",
  "subject": {
    "kind": "speaker",
    "name": "Mira"
  },
  "sourceArtifacts": [
    "host/host-bridge-candidate.json",
    "source-map/source-locations.json"
  ],
  "partnerEvidenceRefs": [
    "evidence_partner_catalog_speaker_mira"
  ],
  "proposedMappingEvidence": {
    "bridgeTarget": "ids[]",
    "partnerCatalog": {
      "speakerId": "speaker.mira"
    }
  },
  "review": {
    "required": true,
    "decision": "unreviewed",
    "owner": "inscape-and-partner"
  },
  "ownership": {
    "generatedOwnership": "candidate-only",
    "writesHostData": false
  }
}
```

Allowed `candidateKind` values should match [Host Bridge Candidate Contract](host-bridge-candidate-contract.md):

- `id-binding`
- `action-handler`
- `query-handler`
- `schema-capability`
- `resource-binding`
- `partner-diagnostic`

Allowed status values:

- `needs-review`
- `accepted-evidence`
- `rejected-evidence`
- `needs-schema`
- `needs-host-catalog`
- `conflict`
- `blocked`
- `unsupported`

`accepted-evidence` still does not mean the candidate is a confirmed Host Bridge row.

## Confirmed Truth Boundary

POC-1 feedback should normally use:

```json
{
  "hasConfirmedChanges": false,
  "artifacts": []
}
```

If a later approved phase references confirmed truth, the entry must only cite existing formal artifacts:

```json
{
  "artifact": "host/inscape.host.bridge.json",
  "changeId": "manual-review-2026-06-22-001",
  "owner": "partner-or-inscape-reviewer"
}
```

The feedback artifact does not create or modify that formal artifact.

## Sinan Profile Boundary

For Sinan dry-run feedback:

- `profile.partner` may be `sinan`.
- Sinan catalog ids, runtime ids and data paths remain partner evidence.
- Feedback may propose candidate evidence, but confirmed Host Bridge changes require a later approved phase.
- Feedback must not add Sinan-only Host Schema policy fields or runtime semantics.
- `src/Internal` must not read this feedback as a Sinan runtime dependency.

## Validation Rules

A consumer should reject or block feedback when:

- `format` is not `inscape.host-integration.partner-feedback`.
- `formatVersion` is unsupported.
- `summary.writesHostData` or any `boundary.*` write / apply / runtime flag is true.
- Any `partnerEvidence[]` item omits `id`, `kind`, `status` or `writesHostData`.
- Any `candidateEvidence[]` item omits `id`, `candidateKind`, `status`, `subject`, `review` or `ownership`.
- Any candidate ownership has `writesHostData = true`.
- Any source ref omits `coordinateSystem = "compiler-1-based"`.
- `confirmedTruth.hasConfirmedChanges = true` without an existing formal artifact reference.

## Round 2 Self-Check

- Partner feedback separates partner evidence, candidate evidence and confirmed truth.
- Generic fixture remains static JSON documentation/test evidence.
- Feedback cannot write host data or apply generated candidates.
- Sinan remains partner profile / evidence only.
- This schema does not implement Host Bridge Candidate Generator, POC-2 catalog projection, generated apply, Runtime Preview Bridge, Sinan Runtime, Unity / Host SDK, full host save, Rollback / Trace Replay / Flashback, Presentation IR or Host Schema action policy expansion.

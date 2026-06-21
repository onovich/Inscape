# Sinan Static Artifact POC Planning Note

日期：2026-06-21

状态：Round 5 POC-1 planning baseline；Sinan 仅作为 partner profile / fixture，不成为 Inscape core dependency。

## POC-1 Scope

POC-1 is a static artifact exchange and dry-run planning slice.

In scope:

- Inscape Integration Package artifacts.
- Narrative Graph IR / Usage Manifest / Host Integration Audit / Host Schema capability snapshot.
- Source location and localization anchor handoff.
- Host Bridge Candidate as unconfirmed review evidence.
- Readiness report and deterministic fixture smoke.
- Sinan-facing partner dry-run notes and acceptance criteria.

Out of scope:

- Sinan Runtime integration.
- Runtime Preview Bridge.
- Direct writes to Sinan `data/**/*.json` or any formal host data.
- Complete host save/load.
- Unity / Host SDK implementation.
- Rollback, Trace Replay, Flashback or Presentation IR.
- Sinan-specific Compiler semantics or Host Schema action policy expansion.

## Exchange Model

```text
Inscape package artifacts
  -> Sinan dry-run importer / audit reader
  -> Sinan-owned dry-run report
  -> optional Host Bridge Candidate evidence
  -> manual review before any confirmed host mapping
```

The exchange is report-first. A successful POC-1 proves that the artifacts are understandable and traceable, not that a runtime integration exists.

## Inscape Outputs

Expected POC-1 inputs for Sinan:

- `manifest.json`
- `source/*.inscape`
- `graph/project-ir.json`
- `usage/usage.json`
- `host/host-schema-capabilities.json`
- `host/host-integration-audit.json`
- `host/host-bridge-candidate.json`
- `localization/l10n.csv`
- `localization/anchor-map.json`
- `source-map/source-locations.json`
- `reports/readiness-report.json`

For Round 5 planning, the current static fixture evidence is:

- [Host Integration Partner Readiness Fixtures](../host-integration-partner-readiness-fixtures.md)
- [Static Fixture Pack](../host-integration-static-fixtures/fixtures.json)
- [Static Artifact Smoke](../host-integration-static-artifact-smoke.md)
- [Readiness Report Contract](../host-integration-readiness-report-contract.md)

## Sinan Dry-Run Outputs

Sinan-side POC-1 may produce partner-owned artifacts such as:

- `sinan-readiness-report.json`
- `sinan-catalog-projection.json`
- `sinan-host-bridge-candidate.json`
- `sinan-localization-review.json`

These artifacts are partner evidence. They may reference Sinan catalog ids, runtime ids or data paths, but those fields must not become Inscape Compiler, Host Schema or source localization truth.

## Acceptance Criteria

POC-1 succeeds only if:

- no formal host data is modified;
- no Inscape core project gains a Sinan runtime dependency;
- reports are deterministic and diffable;
- diagnostics can jump back to Inscape source refs;
- localization handoff preserves Inscape anchors and does not replace them with host runtime localization ids;
- unknown actions/queries remain blocked until Host Schema is explicitly updated;
- Host Bridge Candidate remains unconfirmed review evidence with `writesHostData = false`;
- the result can be reviewed without running Inscape Runtime, Sinan Runtime, Unity Editor or Host SDK.

## Proposed POC Steps

1. Inscape assembles or shares the static artifact fixture package.
2. Sinan dry-run importer reads artifacts without parsing `.inscape` source semantics.
3. Sinan emits a partner-owned readiness report with source refs preserved.
4. Missing ids, unsupported hooks and unknown capabilities become candidate / diagnostic evidence.
5. Inscape and Sinan manually review candidates.
6. Any accepted mapping is copied into a separate confirmed Host Bridge / adapter artifact in a later approved phase.

## Open Questions

- Which Sinan catalog export is safe to share for dry-run matching?
- Which Sinan localization table fields should appear only as partner evidence?
- Which unsupported timeline phases should POC-1 report first?
- Which owner reviews candidate acceptance before POC-2?

These questions do not block POC-1 planning. They block POC-2 generated candidate / adapter work.

## POC-2 Hold

Do not proceed automatically into POC-2. Any generated candidate, Runtime Preview Bridge, Sinan Runtime, Host SDK or confirmed host save work needs explicit user approval.

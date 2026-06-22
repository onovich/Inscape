# Host Integration Readiness Report Contract

日期：2026-06-21

状态：Round 5 report contract baseline；面向 POC-1 static artifact smoke / partner dry-run handoff。

## 目标

`reports/readiness-report.json` 是 Integration Package 的静态验收报告。它汇总 package artifact 是否存在、shape 是否可读、source ref 是否可回源、Host Bridge candidate 是否只停留在 review evidence，以及 partner dry-run 是否能在不写宿主数据的前提下继续。

本契约服务 POC-1 static artifact exchange。它不是 Runtime report，不是 host save/load 结果，也不是 confirmed Host Bridge。

## 非目标

- 不运行 Inscape Runtime。
- 不连接 Sinan Runtime、Unity Editor、Host SDK 或 Runtime Preview Bridge。
- 不写入宿主正式 data。
- 不确认 Host Bridge candidate。
- 不新增 Rollback、Trace Replay、Flashback、Presentation IR 或 Host Schema action policy 字段。

## Artifact

Integration Package 中的报告路径固定为：

```text
reports/readiness-report.json
```

推荐 shape：

```json
{
  "format": "inscape.host-integration.readiness-report",
  "formatVersion": 1,
  "createdAtUtc": "2026-06-21T00:00:00Z",
  "profile": {
    "kind": "partner-profile",
    "partner": "generic",
    "purpose": "static-artifact-poc"
  },
  "package": {
    "manifest": "manifest.json",
    "fixtureSet": "host-integration-partner-readiness-round4"
  },
  "summary": {
    "result": "blocked",
    "artifactCount": 11,
    "readyCount": 9,
    "missingCount": 1,
    "invalidCount": 0,
    "unsupportedCount": 1,
    "blockedCount": 1,
    "writesHostData": false
  },
  "artifactChecks": [
    {
      "kind": "narrative-graph-ir",
      "path": "graph/project-ir.json",
      "required": true,
      "status": "ready",
      "format": "inscape.project-ir",
      "formatVersion": 1
    }
  ],
  "diagnostics": [
    {
      "code": "HIA002",
      "severity": "error",
      "message": "Unknown action play_cutscene.",
      "source": {
        "path": "source/unknown-action.inscape",
        "line": 3,
        "column": 1,
        "length": 29,
        "coordinateSystem": "compiler-1-based"
      }
    }
  ],
  "hostBridgeCandidate": {
    "path": "host/host-bridge-candidate.json",
    "status": "blocked",
    "candidateCount": 1,
    "writesHostData": false
  },
  "boundary": {
    "runtimeIntegration": false,
    "previewBridge": false,
    "writesHostData": false,
    "containsHostDependency": false
  }
}
```

## Stable Fields

- `format`: fixed to `inscape.host-integration.readiness-report`.
- `formatVersion`: current version is `1`.
- `profile`: package profile metadata. `partner = "sinan"` is allowed only as partner profile evidence.
- `package.manifest`: package-relative path to `manifest.json`.
- `summary.result`: top-level readiness result.
- `summary.writesHostData`: must be `false` for POC-1.
- `artifactChecks[]`: one row per expected package artifact.
- `diagnostics[]`: report diagnostics with source refs when they refer to `.inscape` source.
- `hostBridgeCandidate`: summary of candidate artifact state, not confirmed bridge truth.
- `boundary`: explicit negative capabilities for static artifact exchange.

## Status Values

Report and artifact status values:

- `ready`: artifact exists and passed shape checks.
- `missing`: required artifact is absent.
- `invalid`: artifact exists but cannot be parsed or violates required shape.
- `unsupported`: artifact is valid, but the selected partner profile does not support the feature.
- `incompatible`: artifact format version is not supported.
- `blocked`: dry-run cannot proceed without manual mapping, schema, catalog or partner input.

`summary.result` should choose the highest-severity status present. `blocked` does not authorize a runtime fallback; it means the package remains reviewable but cannot be accepted automatically.

## Source Ref Rules

Diagnostics that point to source must follow [Source Location External Contract](source-location-external-contract.md):

- use package/workspace-relative `path`;
- use positive 1-based `line` and `column`;
- set `coordinateSystem` to `compiler-1-based`;
- include `length` when the producer can identify a token span.

Partner dry-run diagnostics should preserve Inscape source refs from package artifacts instead of reparsing `.inscape`.

## Candidate Rules

Readiness reports may summarize [Host Bridge Candidate Contract](host-bridge-candidate-contract.md), but they must not promote candidates to confirmed bridge mappings.

Rules:

- `hostBridgeCandidate.writesHostData` must remain `false`.
- Unknown action/query usage must stay `schema-capability` or `blocked` until Host Schema is updated.
- Conflict and unsupported candidates must remain manual review evidence.
- Accepted review decisions must name a separate confirmed artifact if one exists.
- If `host/host-bridge-candidate.json` already exists, readiness report
  generation may summarize its `status`, `candidateCount` and
  `writesHostData` fields only.
- Readiness report generation does not call `generate-host-bridge-candidate-package`
  and must not create `host/host-bridge-candidate.json`; candidate generation is
  a separate explicit command.

## Validation Rules

Static package smoke / partner dry-run importers should check:

- `format` and `formatVersion`.
- Required artifact presence.
- JSON artifact parseability.
- Known artifact format values and supported `formatVersion`.
- Source refs resolve to package/workspace-relative paths and `compiler-1-based` coordinates.
- Localization anchor reports do not replace Inscape anchors with host runtime localization ids.
- Candidate reports keep `writesHostData = false`.
- Boundary flags remain false for runtime integration, preview bridge and host writes.

## Round 5 Self-Check

- POC-1 report is deterministic and diffable.
- Report diagnostics can jump back to source.
- Report shape does not introduce Runtime, Sinan Runtime, Unity / Host SDK, full host save, Rollback, Trace Replay, Flashback, Presentation IR or Host Schema policy expansion.
- Sinan can appear only as partner profile / fixture context, not as core dependency.

## Package Generator Semantics

The standalone package generator reads an existing Host Integration Package and
writes a deterministic readiness report:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package <package-dir> -o <report.json>
```

The generator:

- reads `manifest.json` and package artifacts through the shared
  `Inscape.Tooling` package reader;
- does not recompile the original workspace or parse `.inscape` source text;
- validates required artifact presence, JSON parseability, expected `format` and
  supported `formatVersion`;
- aggregates compiler diagnostics from `graph/project-ir.json` and Host
  Integration Audit diagnostics from `host/host-integration-audit.json`;
- maps source refs back to package-relative `source/*.inscape` paths when the
  package source map is available;
- writes UTF-8 without BOM so downstream JSON tooling can parse the report
  directly.

Summary severity order remains:

```text
invalid > incompatible > missing required artifact > error diagnostics / blocked > unsupported > ready
```

The generator preserves the same negative boundary flags as package export:
`runtimeIntegration = false`, `previewBridge = false`, `writesHostData = false`
and no Host Bridge candidate generation. When existing candidate evidence is
present, the report summarizes it without rewriting the candidate artifact.

Standalone candidate generation is covered separately by:

```powershell
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
```

Current smoke coverage lives in:

```powershell
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
```

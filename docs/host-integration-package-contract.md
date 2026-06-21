# Host Integration Package Contract

日期：2026-06-21

状态：Round 5 contract baseline；readiness report、static artifact smoke 与 POC-1 planning 已收口，final validation 留给 Round 6。

## 目标

Inscape Integration Package 是给外部宿主项目消费的一组静态 artifact。它让 partner 项目在不接入 Inscape Runtime、不依赖 SelfHostedEditor、不解析 `.inscape` 语法的前提下，完成 dry-run、对账、诊断回溯、本地化交接和人工映射审查。

本契约服务 `Host Integration Partner Readiness`。Sinan 可以作为第一批 partner profile / fixture 验证这套通用契约，但 Sinan 不成为 Inscape core dependency。

## 非目标

- 不定义 live preview 协议。
- 不定义 Runtime Preview Bridge。
- 不定义 runtime state sync、正式 host save/load 或 bidirectional edit。
- 不直接写宿主正式 data。
- 不把 Host Schema 变成宿主 Engine API 复制品。
- 不把 Host Bridge candidate 写成已确认 mapping。
- 不新增 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不引入 Sinan runtime、Sinan TypeScript module、Sinan data layout 或 Sinan-specific DSL semantics。

## Package 心智模型

```text
Inscape source
  -> Compiler / Tooling static artifacts
  -> Integration Package
  -> Partner dry-run importer / audit reader
  -> Partner report + optional Host Bridge candidate
```

Package 只携带静态证据，不携带运行时连接。外部宿主可以读取 package 生成 dry-run report，但不得把 package 解释为要求宿主执行 Inscape Runtime。

## 最小目录结构

第一版 package 采用小文件组合，不把所有内容塞进一个巨大 JSON。

```text
inscape-integration-package/
  manifest.json
  source/
    *.inscape
  graph/
    project-ir.json
  usage/
    usage.json
  host/
    host-schema-capabilities.json
    host-integration-audit.json
    host-bridge-candidate.json
  localization/
    l10n.csv
    anchor-map.json
  source-map/
    source-locations.json
  reports/
    readiness-report.json
```

Round 2 固定 package 结构与 graph 入口。Round 3 固定 source location 与 localization anchor export 契约。Round 4 固定 Host Bridge candidate 契约和 static fixture pack。Round 5 固定 `reports/readiness-report.json` 契约、static artifact smoke 和 POC-1 planning/checklist。

## Artifact 清单

| Artifact | Required | Status | Producer | Consumer |
| --- | --- | --- | --- | --- |
| `manifest.json` | yes | Round 2 contract | future package command / manual assembly | partner importer / CI |
| `source/*.inscape` | yes | Round 2 contract | workspace copy / export | human review / source jump |
| `graph/project-ir.json` | yes | existing command | `compile-project` | external importer |
| `usage/usage.json` | yes | existing command | `inspect-usage-project` | audit / bridge TODO |
| `host/host-integration-audit.json` | yes | existing command | `audit-host-integration-project` | readiness diagnostics |
| `host/host-schema-capabilities.json` | recommended | existing command | `inspect-host-schema-project` | capability comparison |
| `localization/l10n.csv` | required when translatable text exists | existing command | `extract-l10n-project` | localization handoff |
| `source-map/source-locations.json` | required for packages with diagnostics or reports | Round 3 contract | package/source export | diagnostics / report source jump |
| `localization/anchor-map.json` | required when `localization/l10n.csv` is present | Round 3 contract | localization export / package assembly | localization source mapping |
| `host/host-bridge-candidate.json` | recommended when gaps exist | Round 4 contract | manual assembly / partner dry-run / future generator | manual review |
| `reports/readiness-report.json` | recommended | Round 5 contract | static artifact smoke / partner dry-run | CI / handoff |

## Manifest Contract

`manifest.json` indexes artifacts and package capabilities. It must not duplicate large artifact bodies.

```json
{
  "format": "inscape.integration-package",
  "formatVersion": 1,
  "createdAtUtc": "2026-06-21T00:00:00Z",
  "producer": {
    "name": "Inscape",
    "tool": "Inscape.Cli",
    "version": "0.0.0"
  },
  "workspace": {
    "name": "samples",
    "rootPolicy": "workspace-relative"
  },
  "profile": {
    "kind": "generic",
    "partner": null,
    "purpose": "static-artifact-poc"
  },
  "artifacts": [
    {
      "kind": "narrative-graph-ir",
      "path": "graph/project-ir.json",
      "required": true,
      "format": "inscape.project-ir",
      "formatVersion": 1,
      "producerRole": "compiler"
    },
    {
      "kind": "usage-manifest",
      "path": "usage/usage.json",
      "required": true,
      "format": "inscape.usage",
      "formatVersion": 1,
      "producerRole": "tooling"
    },
    {
      "kind": "host-integration-audit",
      "path": "host/host-integration-audit.json",
      "required": true,
      "format": "inscape.host-integration.audit",
      "formatVersion": 1,
      "producerRole": "tooling"
    }
  ],
  "capabilities": {
    "runtimeIntegration": false,
    "previewBridge": false,
    "writesHostData": false,
    "containsHostDependency": false
  }
}
```

Manifest rules:

- `format` is fixed to `inscape.integration-package`.
- `formatVersion` starts at `1`.
- All `artifacts[].path` values are package-relative paths using `/`.
- `artifacts[].required` describes package completeness, not whether the artifact can be parsed by the current importer.
- `artifacts[].producerRole` is informational and must remain one of `compiler`, `tooling`, `package`, `partner`, or `manual`.
- `profile.partner` can be `sinan` in a partner fixture, but that only marks a profile / fixture. It does not make Sinan a core dependency.
- `capabilities.*` must remain false for POC-1 static artifact packages.

## Artifact Rules

- Paths inside package manifest are package-relative.
- Source paths inside JSON artifacts should be workspace-relative when producers support it. Producers that currently emit absolute paths must be treated as legacy / implementation detail by external consumers. Package-level rules are defined by [Source Location External Contract](source-location-external-contract.md).
- Artifacts must be deterministic for the same source and config inputs.
- Artifacts must be diffable with stable ordering where producers can control ordering.
- Reports must carry source locations when they refer to source content.
- Package readers must not infer parser semantics from source text when Project IR, Usage Manifest or Audit already provides structured data.
- Unknown optional artifacts must be ignored by consumers unless `manifest.json` marks them required.
- Missing required artifacts produce package status `missing`, not a partial runtime fallback.

## Current Manual Assembly

Round 2 does not implement a package command. The current package can be assembled manually from existing commands:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- compile-project samples -o graph\project-ir.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-usage-project samples -o usage\usage.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-host-schema-project samples -o host\host-schema-capabilities.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- audit-host-integration-project samples -o host\host-integration-audit.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o localization\l10n.csv
```

A future package command may wrap these steps. That command must still preserve the same artifact boundaries.

## Narrative Graph Connection

`graph/project-ir.json` must follow [Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md). Package importers may rely on the stable subset documented there and must ignore undocumented fields.

Source graph to source location connection:

- `graph.project-ir` currently carries source objects on nodes, lines, choices, options and edges.
- Those source objects use Compiler coordinates: `sourcePath`, `line`, `column`, all 1-based.
- Package-level `source-map/source-locations.json` follows [Source Location External Contract](source-location-external-contract.md). It may index embedded graph locations and supplement artifacts that lack embedded source locations.
- External consumers must not re-parse `.inscape` to recover locations that are already present in artifacts.

## Source Location Connection

`source-map/source-locations.json` must follow [Source Location External Contract](source-location-external-contract.md).

Source location rules:

- Package source refs use Compiler coordinates by default: 1-based `line` and 1-based `column`.
- Editor clients may convert those refs to 0-based reveal coordinates, but the package must not store editor-specific reveal positions as source truth.
- Package paths should be package-relative `source/<workspace-relative-path>` when possible.
- Direct CLI outputs that still contain absolute local paths are implementation evidence, not portable package identity.
- Reports and partner dry-run diagnostics should refer to source locations by inline source refs or by entries from `source-map/source-locations.json`.

## Localization Anchor Connection

`localization/l10n.csv` and `localization/anchor-map.json` must follow [Localization Anchor Export Contract](localization-anchor-export-contract.md).

Localization rules:

- `l10n.csv` remains the human translation handoff surface.
- `anchor-map.json` connects CSV rows to narrative graph refs, source refs, line identity evidence and optional partner dry-run refs.
- Localization anchors are Inscape text/source anchors, not host runtime localization IDs.
- Partner runtime IDs may appear only as optional evidence under partner refs; they cannot replace the Inscape anchor.
- Package readers must not infer localization anchors by re-parsing `.inscape` source text.

## Host Bridge Candidate Connection

`host/host-bridge-candidate.json` must follow [Host Bridge Candidate Contract](host-bridge-candidate-contract.md).

Candidate rules:

- Host Bridge Candidate is unconfirmed review evidence, not confirmed Host Bridge truth.
- It may propose `ids[]`, `actions[]`, `queries[]`, schema-capability or partner diagnostic entries.
- It must keep `writesHostData = false` for POC-1 packages.
- Unknown schema action/query usage must stay `blocked` or `schema-capability` until Host Schema is updated.
- Conflict candidates require manual review and must not be auto-applied.
- Partner-specific fields may appear only as evidence in candidate / adapter artifacts, not in Compiler, Host Schema or narrative graph IR.

Round 4 static artifact fixtures are documented in [Host Integration Partner Readiness Fixtures](host-integration-partner-readiness-fixtures.md), with the JSON fixture pack at [host-integration-static-fixtures/fixtures.json](host-integration-static-fixtures/fixtures.json).

## Readiness Report Connection

`reports/readiness-report.json` must follow [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md).

Report rules:

- Readiness reports are static package / partner dry-run evidence, not Runtime reports.
- Reports must be deterministic, diffable and source-ref aware.
- Report diagnostics should use package/workspace-relative source refs and `compiler-1-based` coordinates.
- Host Bridge Candidate summary remains unconfirmed review evidence with `writesHostData = false`.
- Partner-specific fields may appear only as partner report / candidate evidence, not in Compiler, Host Schema, Narrative Graph IR or source localization truth.
- Missing or blocked artifacts produce explicit report status, not Runtime fallback.

Round 5 static artifact smoke is documented in [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md), with the script at [StaticArtifactFixtureSmoke.js](host-integration-static-fixtures/StaticArtifactFixtureSmoke.js).

## Package Status States

Package-level validation and reports should be able to represent:

- `ready`: artifact exists and passed shape checks.
- `missing`: required artifact not produced.
- `invalid`: artifact is present but cannot be parsed or has wrong format.
- `unsupported`: script uses a feature the partner profile does not support.
- `incompatible`: artifact format version is not accepted.
- `blocked`: dry-run cannot proceed until a manual mapping or missing input is supplied.

## Compatibility Rules

- Consumers must reject unknown `manifest.format`.
- Consumers must reject `manifest.formatVersion` greater than the highest supported major version.
- Consumers must ignore unknown optional fields and unknown optional artifacts.
- Producers may add optional fields without bumping `formatVersion`.
- Producers must bump `formatVersion` before removing or changing the meaning of stable required fields.
- Exact diagnostic text, object ordering outside documented stable arrays and local absolute paths are not compatibility guarantees.

## Boundary Rules

- Compiler produces source truth; it does not read Host Schema, Host Bridge or Sinan catalog.
- Tooling / CLI may package outputs and run audits.
- Host Schema is the host capability snapshot.
- Usage Manifest is script demand.
- Host Bridge is confirmed mapping; Host Bridge Candidate is unconfirmed evidence.
- Partner dry-run report is partner-owned evidence, not Inscape core truth.
- Runtime State / Runtime Substate are not part of POC-1 package.

## Sinan Profile Boundary

If a Sinan profile appears in future package metadata:

```json
{
  "profile": {
    "kind": "partner-profile",
    "partner": "sinan",
    "purpose": "static-artifact-poc"
  }
}
```

it means only:

- Sinan is used as a fixture / partner dry-run target.
- The package may include Sinan-facing planning notes or profile assumptions.
- The package still cannot require Sinan Runtime, Sinan TypeScript modules, Sinan data directory writes or Sinan-specific DSL semantics.

## Completed Contract Links

- Round 2: [Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md).
- Round 3: [Source Location External Contract](source-location-external-contract.md) and [Localization Anchor Export Contract](localization-anchor-export-contract.md).
- Round 4: [Host Bridge Candidate Contract](host-bridge-candidate-contract.md) and [Host Integration Partner Readiness Fixtures](host-integration-partner-readiness-fixtures.md).
- Round 5: [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md), [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md), [Host Integration Partner Readiness POC-1 Checklist](host-integration-partner-readiness-poc-1-checklist.md) and [Sinan Static Artifact POC Planning Note](sinan-cooperation/sinan-static-artifact-poc-planning-note.md).

## Deferred To Later Rounds

- Round 6: final validation report and docs closure.

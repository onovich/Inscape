# Host Integration Package Contract

日期：2026-06-21

状态：Round 1 draft；Round 2-5 会继续收口

## 目标

Inscape Integration Package 是给外部宿主项目消费的一组静态 artifact。它的目标是让 partner 项目在不接入 Inscape Runtime、不依赖 SelfHostedEditor、不解析 `.inscape` 语法的前提下，完成 dry-run、对账、诊断回源和人工映射审查。

本契约第一版服务 `Host Integration Partner Readiness`，并允许 Sinan 作为第一个 partner profile / fixture。Sinan 不成为 Inscape core dependency。

## 非目标

- 不定义 live preview 协议。
- 不定义 Runtime Preview Bridge。
- 不定义 runtime state sync 或 host save/load。
- 不直接写宿主正式 data。
- 不把 Host Schema 变成宿主 Engine API 复制品。
- 不把 Host Bridge candidate 写成已确认 mapping。
- 不新增 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。

## Package 心智模型

```text
Inscape source
  -> Compiler / Tooling static artifacts
  -> Integration Package
  -> Partner dry-run importer / audit reader
  -> Partner report + optional Host Bridge candidate
```

Package 只携带静态证据，不携带运行时连接。外部宿主可以读取 package 生成 dry-run report，但不得把 package 解释为要求宿主执行 Inscape Runtime。

## 最小 artifact 组合

第一版 package 建议包含：

| Artifact | Required | Producer | Consumer |
| --- | --- | --- | --- |
| `manifest.json` | yes | Tooling / CLI package command future | partner importer / CI |
| `source/*.inscape` | yes | workspace copy / export | human review / source jump |
| `graph/project-ir.json` | yes | `compile-project` | external importer |
| `source/source-locations.json` | planned | future package step | diagnostics / report source jump |
| `localization/l10n.csv` | yes | `extract-l10n-project` | localization handoff |
| `usage/usage.json` | yes | `inspect-usage-project` | audit / bridge TODO |
| `host/host-schema-capabilities.json` | optional but recommended | `inspect-host-schema-project` | capability comparison |
| `host/host-integration-audit.json` | yes | `audit-host-integration-project` | readiness diagnostics |
| `host/host-bridge-candidate.json` | planned | future generator / partner dry-run | manual review |
| `reports/readiness-report.json` | planned | static artifact smoke / audit | CI / handoff |

Round 1 only defines the package shape. It does not implement a packaging command.

## Manifest draft

`manifest.json` should be small and index the package rather than duplicate every artifact body.

```json
{
  "format": "inscape.integration-package",
  "formatVersion": 1,
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
    "partner": null
  },
  "artifacts": {
    "graph": "graph/project-ir.json",
    "usage": "usage/usage.json",
    "hostSchemaCapabilities": "host/host-schema-capabilities.json",
    "hostIntegrationAudit": "host/host-integration-audit.json",
    "localizationCsv": "localization/l10n.csv"
  },
  "capabilities": {
    "runtimeIntegration": false,
    "previewBridge": false,
    "writesHostData": false,
    "containsHostDependency": false
  }
}
```

## Artifact Rules

- Paths inside package manifest are package-relative.
- Source paths inside JSON artifacts should remain workspace-relative unless a specific producer already emits absolute paths; Round 3 should define normalization and privacy rules.
- Artifacts must be deterministic for the same source/config inputs.
- Artifacts must be diffable with stable ordering where producers can control ordering.
- Reports must carry source locations when they refer to source content.
- Package readers must not infer parser semantics from source text when Project IR or Usage Manifest already provides structured data.

## Boundary Rules

- Compiler produces source truth; it does not read Host Schema, Host Bridge or Sinan catalog.
- Tooling / CLI may package outputs and run audits.
- Host Schema is the host capability snapshot.
- Usage Manifest is script demand.
- Host Bridge is confirmed mapping; Host Bridge Candidate is unconfirmed evidence.
- Partner dry-run report is partner-owned evidence, not Inscape core truth.
- Runtime State / Runtime Substate are not part of POC-1 package.

## Current Producers

The current package can be assembled manually from existing commands:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- compile-project samples -o graph\project-ir.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-usage-project samples -o usage\usage.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-host-schema-project samples -o host\host-schema-capabilities.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- audit-host-integration-project samples -o host\host-integration-audit.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o localization\l10n.csv
```

A future package command may wrap these steps, but Round 1 does not introduce it.

## Required Status States

Package-level reports should be able to represent:

- `ready`: artifact exists and passed shape checks.
- `missing`: required artifact not produced.
- `invalid`: artifact is present but cannot be parsed or has wrong format.
- `unsupported`: script uses a feature the partner profile does not support.
- `incompatible`: artifact format version is not accepted.
- `blocked`: dry-run cannot proceed until a manual mapping or missing input is supplied.

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

## Open Questions For Later Rounds

- Should a package command copy source files or reference workspace-relative source paths only?
- Should source locations remain embedded in each artifact, or also be indexed in a separate `source-locations.json`?
- Should Host Schema capabilities be included in every package, or only in readiness / audit packages?
- How should Host Bridge candidate reports record confidence, conflict and generated ownership?
- Which static fixture directory should become the long-term canonical readiness fixture set?

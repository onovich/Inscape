# Static Artifact POC Partner Handoff Kit

日期：2026-06-22

状态：Round 1 contract baseline；面向 Host Integration Package CLI 与 Readiness Report Generator 的 POC-1 partner dry-run 交接。

## 目标

本 handoff kit 把现有静态 Host Integration Package、package readiness report、Host Bridge Candidate contract 与 partner feedback 流程串成一条可交接的 POC-1 路径。

它回答：

- Inscape 侧如何生成一个静态 package。
- partner 侧应该读取哪些 artifact。
- partner dry-run 反馈应该如何回传。
- 哪些 evidence 可以进入人工审查。
- 哪些事情在 POC-1 阶段明确不能做。

本阶段 generic first。Sinan 只允许作为 partner profile、fixture 或 dry-run planning 示例，不成为 Inscape core dependency。

## 非目标

本 handoff kit 不实现：

- Host Bridge Candidate Generator。
- POC-2 catalog projection。
- generated apply。
- Runtime Preview Bridge。
- Sinan Runtime integration。
- Unity / Host SDK integration。
- full host save。
- Rollback / Trace Replay / Flashback。
- Presentation IR。
- Host Schema action policy expansion，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy` 或 `timeoutPolicy`。

任何 generated package、zip、临时 report 或 partner dry-run output 都不应提交到仓库。

## 交换模型

```text
Inscape workspace
  -> export-host-integration-package-project
  -> static Host Integration Package
  -> generate-host-integration-readiness-report-package
  -> package readiness report
  -> partner dry-run / manual audit
  -> partner feedback artifact
  -> Inscape + partner manual review
  -> later approved confirmed Host Bridge / adapter work
```

POC-1 成功只证明静态 artifact 可读、可追踪、可审查。它不证明 runtime integration 已存在，也不授权任何 host data write。

## Inscape Producer Workflow

从仓库根目录生成 package：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project <workspace> -o <package-dir>
```

基于已有 package 生成 readiness report：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package <package-dir> -o <package-dir>\reports\readiness-report.regenerated.json
```

交接前 producer 应确认：

- package directory 是本次交接专用输出目录，不在 git staged diff 中。
- `manifest.json` 存在且 artifact index 能指向 package 内相对路径。
- required artifacts 可解析。
- readiness report 是 deterministic JSON，且 `writesHostData = false`。
- `host/host-bridge-candidate.json` 若存在，只是 candidate evidence，不是 confirmed bridge。
- package 中的 source refs 使用 [Source Location External Contract](source-location-external-contract.md) 的 `compiler-1-based` 坐标。

## Expected Package Artifacts

POC-1 partner dry-run 可依赖的 package artifact：

```text
manifest.json
source/*.inscape
graph/project-ir.json
usage/usage.json
host/host-schema-capabilities.json
host/host-integration-audit.json
host/host-bridge-candidate.json
localization/l10n.csv
localization/anchor-map.json
source-map/source-locations.json
reports/readiness-report.json
```

Artifact 契约入口：

- [Host Integration Package Contract](host-integration-package-contract.md)
- [Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md)
- [Usage Manifest Contract](usage-manifest-contract.md)
- [Host Bridge Candidate Contract](host-bridge-candidate-contract.md)
- [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md)
- [Localization Anchor Export Contract](localization-anchor-export-contract.md)
- [Source Location External Contract](source-location-external-contract.md)

## Partner Dry-Run Workflow

Partner importer / reviewer 应按静态 artifact 顺序消费 package：

1. 读取 `manifest.json`，确认 package format、formatVersion 与 artifact path。
2. 读取 `reports/readiness-report.json` 或 producer 提供的 regenerated readiness report，先判断 package-level status。
3. 读取 `usage/usage.json`，理解脚本实际使用的 queries、actions 与 required ids。
4. 读取 `host/host-schema-capabilities.json` 与 `host/host-integration-audit.json`，确认哪些 usage 已有 schema / bridge support，哪些仍 blocked。
5. 读取 `graph/project-ir.json`、`localization/*` 与 `source-map/source-locations.json`，把 diagnostics 或 review items 跳回 Inscape source refs。
6. 如有 partner catalog，只能作为 partner evidence 参与人工匹配；不得把 partner runtime id 当作 Inscape Host Schema truth。
7. 输出 partner feedback artifact，保留 evidence、source refs、manual review decision 与 `writesHostData = false`。

Partner dry-run 不应重新实现 Inscape parser 语义。`.inscape` source 仅作为可读上下文和 source ref target；语义 truth 来自 package artifacts。

## Feedback Ownership

Partner feedback 是外部 review evidence。它可以包含：

- package validation notes。
- partner catalog match evidence。
- missing mapping diagnostics。
- candidate review decision。
- localization handoff comments。
- source ref corrections or ambiguity notes。

它不能包含：

- confirmed Host Bridge writes。
- generated apply instructions。
- formal host save payload。
- runtime execution trace。
- Host Schema policy expansion。

Feedback schema 见 [Static Artifact POC Partner Feedback Schema](host-integration-static-artifact-poc-partner-feedback-schema.md)。Generic fixture 见 [partner-feedback.generic.json](host-integration-static-fixtures/partner-feedback.generic.json)。

## Manual Review Gate

Candidate 或 partner feedback 被接受后，仍必须经过人工审查。接受结果只能说明：

- evidence 被认为可信；
- 后续可由明确 owner 在单独批准阶段转写到 confirmed Host Bridge 或 partner adapter artifact；
- POC-1 package / feedback 本身仍不是 runtime truth。

`accepted-to-bridge` 或 partner-side `accepted` decision 不会自动写入 `inscape.host.bridge.json`。

## Sinan Profile Boundary

Sinan 可作为第一批 partner profile / dry-run planning 示例：

- profile metadata 可标记 `partner = "sinan"`。
- Sinan catalog projection 只能作为 partner-owned evidence。
- Sinan runtime ids、data paths、Director / World / Timeline / Camera details 与 UI runtime semantics 不进入 Compiler / Host Schema truth。
- `src/Internal` 不读取 Sinan catalog。

更多 Sinan POC-1 口径见 [Sinan Static Artifact POC Planning Note](sinan-cooperation/sinan-static-artifact-poc-planning-note.md)。

## Validation Entry Points

交接套件本身的 docs-level 验证：

```powershell
git diff --check
rg -n "host-integration-static-artifact-poc-partner-handoff|Static Artifact POC Partner Handoff|PartnerHandoffKitSmoke|partner-feedback.generic" docs
```

现有静态 artifact smoke：

```powershell
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
```

Round 3 会新增 `PartnerHandoffKitSmoke.js` 覆盖 feedback fixture parse 与 handoff boundary。

## Round 1 Self-Check

- Handoff path 从 package generation 到 partner feedback 是静态 artifact exchange。
- Partner feedback 是 evidence，不是 confirmed Host Bridge 或 host data write。
- Sinan 只作为 partner profile / fixture / planning example。
- 本文没有定义 Runtime integration、Host SDK、generated apply、full host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy expansion。

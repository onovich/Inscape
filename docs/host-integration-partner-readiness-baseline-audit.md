# Host Integration Partner Readiness Baseline Audit

日期：2026-06-21

状态：Round 1 baseline audit / artifact inventory

## 结论

Host Integration Partner Readiness 可以从现有 Host Schema / Host Bridge / Usage Manifest / Host Integration Audit / Project IR / localization extraction 能力上启动。当前已有足够的静态 artifact 作为 POC-1 基础，但仍缺少对外 integration package contract、external graph contract、source location external contract、localization anchor export contract、Host Bridge candidate contract、固定 fixture set、POC checklist 和 final validation report。

本轮未修改 Runtime / Compiler / SelfHostedEditor / UnityPlugin 行为。Sinan 只作为 partner profile / fixture 参考，不成为 Inscape core dependency。

## Round 1 范围

本轮只做：

- 审计现有可复用 artifact 与命令。
- 明确 POC-1 所需 artifact inventory。
- 列出当前缺口与后续轮次输入。
- 输出 `docs/host-integration-package-contract.md` 初稿。

本轮不做：

- 不接入 Sinan Runtime。
- 不做 Runtime Preview Bridge、live preview、runtime state sync 或 bidirectional edit。
- 不直接写 Sinan `data/**/*.json`。
- 不生成 Sinan 正式业务 data。
- 不引入 Sinan-specific core semantics。
- 不新增 Host Schema action policy。

## 已有静态 artifact 能力

| Artifact | 当前来源 | 当前状态 | POC-1 用法 |
| --- | --- | --- | --- |
| `.inscape` source | project workspace / samples | 已有 | partner dry-run 的 narrative source truth |
| Project IR | `compile-project` | 已有 | 外部 importer 的 narrative graph 输入 |
| Compiler diagnostics | `compile-project` / diagnostics commands | 已有 | source diagnostic fixture 和回源报告 |
| Host Schema capability | `inspect-host-schema-project` | 已有 | 宿主能力清单浏览、audit 输入 |
| Usage Manifest | `inspect-usage-project` | 已有 | 脚本实际 query / action / required id 需求 |
| Host Integration Audit | `audit-host-integration-project` | 已有 | unknown / missing / mismatch 对账报告 |
| Host Bridge capability | LanguageServer / Tooling capability path | 已有 | 已配置 bridge 的只读视图 |
| Localization CSV | `extract-l10n-project` | 已有 | partner localization handoff 和 anchor 验证 |
| Source locations | Compiler / Tooling 1-based location | 已有 | diagnostics / report 回到 `.inscape` |
| Runtime authoring evidence | P5 Runtime authoring surfaces | 已有，但非 POC-1 主输入 | 后续 runtime bridge HOLD，当前只作为边界参考 |

## Round 1 smoke 证据

在临时目录执行了以下命令，输出不纳入提交：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- compile-project samples -o <temp>\samples-project.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-host-schema-project samples -o <temp>\host-schema-capabilities.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-usage-project samples -o <temp>\usage.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- audit-host-integration-project samples -o <temp>\host-integration-audit.json
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o <temp>\l10n.csv
```

结果：

| Output | Format / shape | Evidence |
| --- | --- | --- |
| `samples-project.json` | `inscape.project-ir`, `formatVersion: 1`, top-level `diagnostics`, `documents`, `entryNodeName`, `graph`, `hasErrors`, `rootPath` | PASS |
| `host-schema-capabilities.json` | `inscape.host-schema.capabilities`, top-level `hostSchema`, `queries`, `actions`, `events`, `workspace` | PASS |
| `usage.json` | `inscape.usage`, summary included `sourceCount`, `queryCount`, `actionCount`, `requiredIdCount`, `nonLiteralArgumentCount` | PASS |
| `host-integration-audit.json` | `inscape.host-integration.audit`, summary included query/action/required id counts and diagnostics counts | PASS |
| `l10n.csv` | CSV header `anchor,node,kind,speaker,text,translation,sourcePath,line,column` | PASS |

Sample project smoke exposed existing sample audit diagnostics, which is expected for readiness planning: the audit artifact can represent missing / unknown / mismatch states without executing host runtime.

## POC-1 Artifact Inventory

POC-1 should package these artifacts as deterministic static files:

1. Source scripts
   - Workspace-relative `.inscape` files.
   - Treated as authoring truth.

2. Narrative Graph IR
   - Current source: `compile-project`.
   - Round 2 must define external stable fields and fields importers must not rely on.

3. Source location map / diagnostic locations
   - Current source: Compiler / Tooling source objects.
   - Round 3 must define external location shape, 1-based / 0-based conversion, path policy and range policy.

4. Localization anchors
   - Current source: `extract-l10n-project`.
   - Round 3 must define anchor / CSV / source map / line identity relationship.

5. Usage Manifest
   - Current source: `inspect-usage-project`.
   - Represents script demand, not host truth.

6. Host Schema capability snapshot
   - Current source: `inspect-host-schema-project`.
   - Represents host-declared capability, not generated from script usage.

7. Host Integration Audit report
   - Current source: `audit-host-integration-project`.
   - Represents对账结果：unknown query / action、missing bridge id、missing handler、parameter mismatch.

8. Host Bridge candidate report
   - Missing.
   - Round 4 must define candidate / confidence / conflict / manual review / generated ownership.

9. Static fixture manifest
   - Missing.
   - Round 4-5 must cover minimal dialogue、branching、localization、missing speaker、unknown action、unsupported feature、source diagnostic.

10. Partner profile note
   - Missing for Sinan POC-1.
   - Round 5 must document Sinan Static Artifact POC planning without runtime integration.

## Current Command Inventory

| Command | Role in readiness package | Current limitation |
| --- | --- | --- |
| `compile-project` | Produces project IR and diagnostics | External stable field contract not yet split out |
| `inspect-host-schema-project` | Produces host capability catalog | Host Schema is capability truth only, not mapping truth |
| `inspect-usage-project` | Produces script usage demand | Does not execute host, does not validate query truth |
| `audit-host-integration-project` | Produces usage/schema/bridge audit | Does not create Host Bridge candidate report yet |
| `extract-l10n-project` | Produces localization CSV with anchors and source | Anchor export contract not yet split out |
| `preview-project` | Produces HTML preview | Not a POC-1 static integration artifact |
| Runtime authoring HTTP / model checks | Validates P5 authoring workflow | Runtime Preview Bridge remains HOLD |

## Gap List

- Integration package manifest / directory contract is missing.
- Narrative Graph IR external contract is missing.
- Source location external contract is missing; existing `source-location-contracts.md` is editor / compiler oriented, not partner package oriented.
- Localization anchor export contract is missing.
- Host Bridge candidate contract is missing.
- Fixture set is not yet defined as stable readiness package inputs.
- Static artifact smoke is not yet formalized.
- POC-1 acceptance checklist is missing.
- Sinan Static Artifact POC planning note is missing.
- Final validation report is missing.

## Architecture Baseline

- `Inscape.Compiler` remains `.inscape` syntax, graph, source map and diagnostics truth.
- Tooling / CLI are the current package-producing layer for static artifacts.
- Host Schema remains host-declared capability contract.
- Usage Manifest remains script-demand contract.
- Host Bridge remains mapping / handler / resource coordinate contract.
- Host Integration Audit remains对账 report; it does not execute Runtime or host handlers.
- Sinan may provide catalog / dry-run report / partner profile fixture later, but not core dependency.

## Round 2 Input

Round 2 should use this baseline to complete:

- `docs/host-integration-package-contract.md`
- `docs/narrative-graph-ir-external-contract.md`

The next round should avoid expanding into source location, localization or Host Bridge candidate details beyond the connection points needed for package shape.

# SelfHostedEditor P3 Baseline Audit

日期：2026-06-18

状态：P3 Round 1 baseline audit

本轮只做基线审计与接力收口，不实现新语法、Host Schema 迁移、Usage Manifest、Host Integration Audit 或 Runtime State 正式模型。

## 本轮范围

- 已读 P3 goal 执行指南、P3 Runtime / Language 讨论记忆、ADR 0021、Host Schema / Host Bridge / Query Interpolation / Runtime 相关文档。
- 已审计当前 Host Schema / Host Bridge / Query Interpolation / Runtime 的代码入口。
- 已确认当前 `queries[]` / `events[]` / `actions[]` 状态、迁移风险与 P3 第一刀后续轮次。
- 未改 Compiler、Tooling、LanguageServer、VSCode、SelfHostedEditor 或 Runtime 行为。

## 当前入口状态

### Host Schema

当前实现仍以 `queries[]` + `events[]` 为可执行链路：

- `src/Internal/Tooling/HostSchema/Domains/HostSchemaQueryReaderDomain.cs` 读取并归一化 `queries[]`。
- `src/Internal/Tooling/HostSchema/Domains/HostSchemaEventReaderDomain.cs` 读取并归一化 `events[]`。
- `src/Internal/Tooling/HostSchema/Domains/HostSchemaCapabilityCatalogDomain.cs` 输出 `inscape.host-schema.capabilities`，当前字段为 `queries` 与 `events`。
- `src/Internal/Tooling/HostSchema/Domains/HostSchemaTemplateWriterDomain.cs` 仍导出 `queries[]` + `events[]` 示例。
- `src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json` 仍定义 `events`，尚未定义 `actions`。
- `inspect-host-schema-project` 与 `--host-schema-capabilities-project` 当前仍输出 `events[]`。

P3 文档与 ADR 已把目标口径改成统一 Host Schema `queries[]` + `actions[]`。因此 Round 2 / Round 3 必须把 `actions[]` 接入 schema、template、Tooling reader、CLI / LanguageServer capability endpoint、VSCode / SelfHostedEditor consumption，同时保留旧 `events[]` 兼容窗口。

### Host Bridge

Host Bridge 当前仍是 Inscape 可读 ID 到宿主 ID / 资源 / handler / query implementation 的映射层：

- `src/Internal/Tooling/HostBinding/Domains/HostBindingCapabilityCatalogDomain.cs` 读取 host bridge `ids[]`，并汇总脚本中的 speaker 与 `@timeline` 出现位置。
- capability payload 为 `inscape.host-binding.capabilities`，包含 `speakers[]` 与 `bindings[]`。
- Unity GUID、Addressables key、asset path 等字段只在 Host Bridge / ExternalSupport / adapter 方向出现，不进入 Compiler。

P3 风险是不要把 Action implementation 或 Unity / Bird 项目 ID 塞进 Host Schema 或 Compiler。`actions[]` 只描述能力；实现映射仍属于 Host Bridge / adapter。

### Query Interpolation

当前 `[]` 工具链仍是第一版简单 path 插值：

- `QueryInterpolationAuditDomain` 只收集 `[player.gold]` 这类简单 path。
- 带参数函数如 `has_item("silver_key")` 不是当前文本插值主链路。
- `audit-query-interpolation-project` 只对照 Host Schema `queries[]` 做显式非阻断审计，不接默认 Problems，也不改变 Compiler 诊断。

P3 条件表达式将允许函数调用和布尔表达式，但必须作为条件语法的 Compiler / IR 能力推进，不能回灌到第一版文本插值审计里。

### Runtime

当前 Runtime 已有 `NarrativeRuntime` 和 `runtime-project`：

- `src/Internal/Runtime/StoryRuntime/Domains/NarrativeRuntime.cs` 只消费 Compiler graph，不解析 `.inscape` 源文本。
- `NarrativeRuntimeStateModel` 当前只包含 `currentNodeName`、`path`、`visibleStepCount`。
- `NarrativeRuntimeSnapshotModel` 输出 `inscape.runtime-state`，主要服务 SelfHostedEditor Player / Preview 调试。
- `runtime-project` 支持 `--state`、`--continue`、`--advance-flow`、`--rewind`、`--rewind-flow`、`--choose`。

这不是 P3 讨论中的正式最小存档 / Runtime State contract。P3 Runtime State 仍缺少 `runtimeVersion`、`scriptVersion`、`position`、`flow`、`facts`、`random`、`host.checkpointId` 与 `ValidateStateAgainstCurrentScript` 最小验证结果。

## 缺口清单

### Host Schema v2

- 缺 `HostSchemaActionCapabilityModel` / action reader。
- 缺 `actions[]` JSON schema 与 template。
- 缺 `events[] -> actions[]` 兼容策略和测试。
- 缺 CLI / LanguageServer capability payload 的 `actions[]` 字段。
- VSCode / SelfHostedEditor Host capability UI 仍显示 Events，不显示 Actions。

### Usage / Requirement Manifest

- 尚无 `inspect-usage-project` CLI。
- 尚无 `inscape.usage` JSON contract。
- 尚无脚本内 query / action 使用扫描输出。
- 尚无 source location、literal args、context、required ids 的共享模型。

### Host Integration Audit

- 尚无 `audit-host-integration-project` CLI。
- 尚无 Usage + Host Schema + Host Bridge 对账报告。
- 当前已有 `audit-query-interpolation-project`，但它只覆盖第一版文本插值 query，不覆盖 action 或条件 query。

### Condition Syntax

- `dsl-syntax-guide.md` / `dsl-language.md` 当前尚未纳入 P3 条件语法。
- Compiler 尚无 option condition `- [condition] text -> target` 或 conditional jump `? [condition] -> target` 的 parser / IR。
- LanguageServer / VSCode / SelfHostedEditor 尚无条件语法诊断、补全或 hover。

### Runtime State

- 当前 `NarrativeRuntimeStateModel` 是 Player snapshot 状态，不是 P3 minimal Runtime State。
- 尚无 `ExportState()` / `ImportState()` / `ValidateStateAgainstCurrentScript()` contract。
- 尚无 narrative facts 模型：visited / visit_count / seen / choice_made / last_choice。
- 尚无 host-owned gameplay facts 与 Inscape-owned narrative facts 的代码级边界 smoke。

## 迁移风险

- `events[]` 历史字段已被 CLI、LanguageServer、VSCode、SelfHostedEditor smoke 和 JSON schema 使用；直接替换会破坏现有作者提示和测试。
- `delivery` / `sideEffects` 与 P3 `mode: fire | wait | handoff` 不是一一等价字段，需要明确兼容映射或 legacy projection。
- `[]` 文本插值的简单 path 与 P3 条件表达式函数调用共用方括号外形，后续 parser 必须按语境区分。
- `runtime-project` 当前已输出 `inscape.runtime-state`，P3 若复用同名 format 必须避免让 Preview snapshot 与正式最小存档 contract 混淆。
- Host Bridge 可携带项目 ID / Unity GUID / Bird ID；P3 audit 可以检查这些映射是否存在，但不能把这些字段提升为 Host Schema 或 Compiler truth。

## 第一刀范围确认

P3 第一刀继续按执行指南推进：

1. Round 2：Host Schema v2 minimum contract，先定义 `queries[]` / `actions[]` 以及 legacy `events[]` 兼容。
2. Round 3：Tooling / CLI / LanguageServer / editor host capability consumption 迁移到 `actions[]`。
3. Round 4-6：Usage Manifest contract、`inspect-usage-project`、`audit-host-integration-project`。
4. Round 7-9：条件语法 contract、Compiler / IR 最小实现、Tooling / LanguageServer / Editor consumption。
5. Round 10-11：Runtime query provider / internal facts 与 Runtime State 最小模型。
6. Round 12：最小端到端 smoke 与文档收口。

本阶段不实现完整 Save / Load、完整 Rollback、Trace Replay、Flashback Playback、Presentation IR 或通用 Unity package。

## 架构自检

- Compiler 当前未改动；宿主 schema、bridge、usage、audit 仍不属于 Compiler 真相。
- Tooling 是 Host Schema / Host Bridge / Query Audit 的共享用例层；CLI 与 LanguageServer 只调用 Tooling。
- VSCode 与 SelfHostedEditor 当前消费 shared capability payload，不直接成为 schema reader 真相。
- Runtime 当前只消费 Compiler graph；未引入 Unity、VSCode、HTML、Bird 或具体项目 ID。
- P3 后续实现必须避免在 VSCode / SelfHostedEditor 重写 parser、schema reader 或 runtime semantics。

## 本轮验证

本轮为文档审计；最低验证门为 `git diff --check`。若后续补代码，需恢复完整仓库验证矩阵。

# SelfHostedEditor P2 Documentation And ADR Closure Audit

状态：P2 Round 13 已完成

日期：2026-06-17

后续补充：P2 Round 14 已完成最终验证并宣布 PASS，详见 [SelfHostedEditor P2 Final Validation Report](self-hosted-editor-p2-final-validation-report.md)。本文保留 Round 13 当时的文档 / ADR 收口判断。

## 本轮目标

P2 Round 13 只做文档、契约和交接口径收口，不新增 Host Schema / Host Bridge / Unity-Bird 功能，也不宣布 P2 PASS。P2 PASS 仍需要 Round 14 全量验证后判断。

本轮同时复核了 P1.5 文档收口方案的旧口径：

```text
P1.5 document sync: PASS
P2 entry allowed: YES
Blocking reason if NO: none
```

`README`、P1 执行计划、handoff 与 TODO 当前不再把 packaged app 未 bundle LanguageServer artifact 或 `process-per-request` fallback 写成 P1.5 阻塞项。

## 文档收口结果

- `docs/agent-handoff.md` 已推进到 P2 Round 13 快照，下一轮明确为 P2 Round 14 全量验证与首轮修复。
- `docs/todo.md` 已补 P2 Round 13 完成项，并把 P2.5 Host Schema / Host Bridge / Unity-Bird 入口条件收紧为 Round 14 P2 PASS 之后。
- `src/ExternalSupport/SelfHostedEditor/README.md` 已补 P2 收口门：P2 已进入文档/验证收口，但尚未 PASS；后续 Host integration 不能抢跑。
- `docs/self-hosted-editor-architecture-plan.md` 已同步 P2 Round 13 状态、后续入口条件与 Round 14 验证矩阵。
- P1.5 文档收口方案已标记完成，保留为 P1.5 -> P2 入口证据。

## ADR 判断

本轮不新增 ADR。

原因是 P2 没有改变既有长期架构决策，而是在既有 ADR 和 contract 文档上完成实现与验证收口：

- stable node id / author title 分离仍由 [ADR 0013](adr/0013-author-title-and-stable-node-id.md) 与 [Stable Node ID Contract](stable-node-id-contract.md) 约束。
- SelfHostedEditor 仍是 `ExternalSupport` 宿主客户端，由 [ADR 0017](adr/0017-self-hosted-editor-external-support-boundary.md) 约束。
- backend session 不采用通用 RPC、dev-host cache 不等同正式 ProjectSession，仍由 [ADR 0018](adr/0018-self-hosted-editor-backend-session-boundary.md) 约束。
- desktop backend v0 与 Electron workspace/save 策略仍由 [ADR 0019](adr/0019-self-hosted-editor-embedded-backend-v0.md) 和 [ADR 0020](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md) 约束。

本轮选择更新既有 contract 文档，而不是新写 ADR：

- [Stable Node ID Contract](stable-node-id-contract.md) 记录 P2 的单候选 manual-review apply、dry-run/apply result、backup metadata 与 Electron desktop 写回边界。
- [Localization Diff Alignment Contract](localization-diff-alignment-contract.md) 记录 P2 的 presenter signals、相似文本人工候选、不静默复用，以及 host config CSV 不得混作 localization previous CSV。
- [本地化提取](l10n-extraction.md) 记录 `update-l10n` / `update-l10n-project --from` 的 previous CSV header guard。

## 后续入口条件

后续 Host Schema / Host Bridge / Unity-Bird 集成只能在以下条件同时满足后启动：

- Round 14 完整 P2 验证矩阵通过，并在 handoff / TODO 中记录 `P2 PASS`。
- 任何 Host Schema / Host Bridge 工作继续只消费 shared `Tooling` / `LanguageServer` capability，不在 SelfHostedEditor 或 VSCode 复制 JSON parsing、scoring、migration 或 apply 语义。
- Unity-Bird 适配继续保持 `ExternalSupport` / adapter 边界，不让 UnityEngine / UnityEditor 依赖进入 `Internal`。
- Bird L10N 格式、Host Config CSV 与 Inscape localization CSV 继续保持模型分离，不能为了宿主导入方便削弱 `anchor` / `translation` contract。
- batch review / multi-apply 若重新评估，必须先补共享 Tooling / CLI batch dry-run、batch result、per-item failure 与 rollback contract；P2 结论仍是不做批量入口。

如果 Round 14 任一验证失败，则进入第 15-18 轮缓冲收口修复，不开启 P2.5。

## Round 14 验证入口

Round 14 应至少运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

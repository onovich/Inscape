# SelfHostedEditor P0 12 轮内执行方案

状态：已执行完成

日期：2026-06-15

适用范围：`src/ExternalSupport/SelfHostedEditor`

相关文档：

- [Agent 接手指南](agent-handoff.md)
- [TODO](todo.md)
- [SelfHostedEditor 当前阶段 100% 收口推进计划](self-hosted-editor-current-stage-100-plan.md)
- [SelfHostedEditor desktop backend v0 实施计划](self-hosted-editor-desktop-backend-v0-plan.md)
- [ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](adr/0019-self-hosted-editor-embedded-backend-v0.md)
- [ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)

## 目标

本计划用于把 P0，也就是进入 SelfHostedEditor desktop backend v0 前的 current-stage readiness，压缩在 12 轮以内完成。

P0 的目标是把当前 dev-host / backend-client / fallback / session vocabulary 阶段内已经能决定的边界全部收口，不把含混状态带进正式 Electron + embedded EditorBackend 实现。

执行结果：本轮已在 12 轮预算内完成 P0 current-stage readiness 收口。完成范围包括 CSS warning 清零、Summary `migration-target` 关闭、fallback catalog 收口、project-session status 真实性、stdio spike 支持范围决策、Workbench 集成 contract、文档同步与全量验证准备。正式 Electron / embedded EditorBackend / `DocumentBufferStore` / autosave-recovery / full long-lived LanguageServer 仍按 P1 / P1.5 后续计划推进。

P0 完成后应满足：

1. 正常 hosted 路径与 draft/offline fallback 不混淆。
2. malformed shared payload 一律显示显式错误，不被 UI-only draft model 掩盖。
3. `ScriptDocumentModelBuilder` 只作为登记过 reason 的 fallback 使用。
4. `EditorBackendClient` 是前端唯一业务 backend 入口；业务 `Scripts/` 不直接打 `/api/*`。
5. `project-session` / `language-session-request` 明确仍是 dev-host mode 迁移词汇，不冒充正式 backend。
6. 当前结构检查、model contract、HTTP smoke、VSCode parity、.NET build 和 Internal tests 全绿。
7. README、architecture、backend migration map、handoff 与 TODO 口径一致。
8. 当前可消除的 warning 和维护债不再留下。

P0 不包括：

1. 实现 Electron desktop shell。
2. 实现正式 embedded EditorBackend。
3. 实现持久化 `DocumentBufferStore`。
4. 默认启用 full long-lived LanguageServer。
5. 删除所有 offline fallback。
6. 把 dev host 改造成产品 backend。

## 新 session 启动步骤

接手 session 先读：

```text
docs/agent-handoff.md
docs/todo.md
docs/self-hosted-editor-current-stage-100-plan.md
docs/self-hosted-editor-desktop-backend-v0-plan.md
```

然后检查工作区：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

注意：当前已有一批未提交文档改动和新增文档。实现 P0 时不要回滚、覆盖或混淆这些既有变更；如果需要继续改同一批文档，先读 diff，按现有口径追加或修正。

## 10 轮主计划

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 1 | 基线审计 | 跑 SelfHostedEditor `check:structure` / `check:style-structure`，列出 CSS hard-coded colors、style owner、行数阈值、fallback catalog 中仍含混的点；只形成清单，不扩大范围。 |
| 2 | CSS / style structure warning 清零 | 把可 token 化颜色迁到 token；确实不能 token 化的 Monaco / 状态色进入白名单并写清原因；`check:syntax`、`check:structure`、`check:style-structure` 无当前可消除 warning。 |
| 3 | Workspace Summary 收口 | 关闭 `migration-target` 口径，确认 hosted aggregation summary 是 current-stage normal path；hosted inputs 完整时必须 `provider: "shared"`，只有 inputs 不完整才允许 draft fallback。 |
| 4 | Preview / StoryGraph fallback 再硬化 | malformed compiler/shared payload 显示 `contract-error`，不能回落到 draft/offline model；unavailable 才允许 offline draft。 |
| 5 | Localization / Outline fallback 再硬化 | 空 hosted localization presenter 保持 hosted 空状态；`review-unavailable` 才允许 draft table；Outline malformed symbols 显示 LanguageServer error，只有请求失败才 draft fallback。 |
| 6 | fallback reason catalog 收口 | `ScriptDocumentFallbackPolicy` / fallback catalog 不再出现含混 owner 或 `migration-target`；每个 fallback 都有明确触发条件和 owner。 |
| 7 | `project-session` status 真实性收口 | status 显示 dev-host mode、session id、workspace request snapshot、language mode、Runtime / line-map / localization bounded-cache 摘要；禁止泄露文档正文、CSV、line-map、Runtime snapshot 本体。 |
| 8 | `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` spike 决策收口 | 明确当前只支持 diagnostics / documentSymbols，或扩展到六个 authoring endpoint；status、README、smoke 与 contract 保持一致。 |
| 9 | Workbench 集成 contract | 覆盖默认 sample、hosted summary、Preview provider、Graph provider、Localization 空 hosted review、Outline error、Preview choice click invariant。 |
| 10 | 文档与全量验证收口 | 更新 README / architecture / backend migration map / handoff / TODO；跑 P0 全量验证；提交或准备提交，确保 diff 边界清楚。 |

## 2 轮缓冲

| 轮次 | 用途 |
|---|---|
| 11 | 如果 Round 4-5 fallback contract 比预期复杂，把 Preview/StoryGraph 与 Localization/Outline 的测试和修复拆开补齐。 |
| 12 | 如果全量验证暴露跨模块回归，用于修验证、补文档、整理 diff；不得借机进入 P1 实现。 |

## 每轮建议验证

轻量轮默认跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

样式相关轮增加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
```

语言与 HTTP 相关轮按需增加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
```

涉及 VSCode parity 或最终收口时增加：

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

最终收口增加：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

## P0 完成判定

P0 完成时必须满足：

1. `check:structure` 不再输出当前可消除 warning。
2. fallback catalog 没有仍可在当前阶段解决的 `migration-target`。
3. Summary / Preview / StoryGraph / Localization / Outline 都有 provider-aware contract。
4. malformed shared payload 均显示显式错误，不被 draft/offline model 掩盖。
5. project-session status 真实表达 dev-host mode、session id、workspace snapshot、language mode 与 bounded cache。
6. status 类 payload 不泄露文档正文、CSV、line-map 或 Runtime snapshot 本体。
7. optional stdio spike 的 supported endpoints 和 fallback 行为已明确。
8. README / architecture / backend migration map / handoff / TODO 没有互相矛盾的状态描述。
9. P0 全量验证通过。
10. 工作树变更边界清楚，可以提交。

## 风险控制

- 不在 P0 中引入 Electron、preload、正式 embedded backend、真实 `DocumentBufferStore` 或 autosave/recovery 实现。
- 不把 dev-host `/api/*` 包装成最终产品 API。
- 不把 `project-session` / `language-session-request` 文案写成正式 backend 已完成。
- 不把 Summary 再下沉成 shared Internal model，除非出现明确跨宿主需求；当前阶段接受 hosted aggregation summary 作为 normal path。
- 不为了清 warning 做大规模样式重写；只处理当前可消除 warning、owner 分类和必要白名单。
- 不让 fallback 修复变成删除 fallback；offline/draft fallback 仍允许存在，但必须显式、有 owner、有触发条件。

## 建议提交粒度

如果每轮都能形成独立闭环，优先小提交：

```text
refactor: close self hosted style structure warnings
refactor: close self hosted summary fallback status
test: harden self hosted fallback contracts
refactor: complete self hosted project session status
test: add self hosted workbench integration contract
docs: close self hosted current-stage readiness plan
```

如果改动量小，也可以合并为一个阶段提交：

```text
refactor: close self hosted current-stage readiness
```

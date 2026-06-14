# SelfHostedEditor 当前阶段 100% 收口推进计划

状态：已完成 P0 收口

日期：2026-06-14

完成更新：2026-06-15

适用范围：`src/ExternalSupport/SelfHostedEditor`

相关后续决策：

- [ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](adr/0019-self-hosted-editor-embedded-backend-v0.md)
- [ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)
- [SelfHostedEditor desktop backend v0 实施计划](self-hosted-editor-desktop-backend-v0-plan.md)

本文目标是把**现阶段已经能做决定的部分推到 100%**。这里的 100% 不是指正式 desktop backend 已完成，而是指当前 dev-host / backend-client / fallback / session vocabulary 阶段内，所有可判定的边界、警告、契约、文档和验证都不再留下含混空间。

2026-06-15 执行结果：P0 current-stage readiness 已按本文口径完成。CSS warning 已清零，Workspace Summary 的 `migration-target` 分类已关闭，fallback catalog 不再包含 current-stage `migration-target`，`project-session` status 会报告 language-session mode 与 supported endpoints，stdio spike 明确只覆盖 diagnostics / documentSymbols，Workbench integration contract 已补齐。正式 desktop backend、Electron shell、持久化 `DocumentBufferStore`、默认 full long-lived LanguageServer、跨重启 session restore 与多窗口 session ownership 仍属于后续 P1 / P1.5。

## 目标定义

当前阶段的 100% 应满足：

1. 正常 hosted 路径与 draft/offline fallback 不混淆。
2. malformed shared payload 一律是显式错误，不被草模掩盖。
3. `ScriptDocumentModelBuilder` 只作为登记过 reason 的 fallback 使用。
4. `EditorBackendClient` 是前端唯一业务 backend 入口；业务 `Scripts/` 不直接打 `/api/*`。
5. `project-session` / `language-session-request` 明确仍是 dev-host mode 迁移词汇，不冒充正式 backend。
6. 所有当前结构检查、model contract、HTTP smoke、VSCode parity、.NET build 和 Internal tests 全绿。
7. 文档、TODO、handoff 与代码实际状态一致。
8. 当前可消除的 warning 和维护债不再留下。

当前阶段的 100% 不包括：

1. 正式 desktop backend 进程。
2. 真正持久化 `ProjectSession` / `DocumentBufferStore`。
3. 文件权限、文件监控、跨重启恢复和多窗口 session ownership。
4. 默认启用全量常驻 LanguageServer。
5. 删除所有 offline fallback。
6. 把 dev host 改造成产品 backend。

其中 desktop backend v0 的物理形态已经在 ADR 0019 中决定为嵌入式 EditorBackend；本计划仍只负责进入 v0 实现前的 current-stage readiness 收口。

## 总体路线

建议分 8 个小提交推进，每个提交都能独立验证：

```text
Round 1  基线与 warning 清零
Round 2  Workspace Summary fallback 关闭 migration-target
Round 3  fallback contract 再硬化
Round 4  project-session status 真实性收口
Round 5  LanguageSession stdio spike 决策收口
Round 6  Workbench 集成 smoke 收口
Round 7  正式 backend 非目标与触发条件文档化
Round 8  全量验证、文档同步、提交
```

## Round 1：基线与 warning 清零

目标：消除当前阶段能直接消除的维护噪声。

执行项：

1. 将 `SelfHostedEditorEditorAuthoring.css`、`SelfHostedEditorPreview.css`、`SelfHostedEditorStoryGraph.css` 中仍然存在的 hard-coded colors 迁到已有 token 或新增语义 token。
2. `SelfHostedEditorStyleStructureContractCheck.js` 从 warning 口径推进到可失败口径，或者为确实无法 token 化的 Monaco / 状态色建立白名单。
3. 复查 `EditorBackendClient.js` 等新增代码的缩进和局部可读性小瑕疵。
4. 复查主要 controller 行数，尤其 `StoryGraphPreviewController.js`。如果超过当前阶段约束，就继续抽出 provider status / graph contract guard / layout helper；如果不拆，则把阈值和原因写进 CSS/structure 文档，避免“目标漂移”。

验收标准：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
```

期望结果：不再出现 hard-coded color warning；结构检查对新增债务有明确阻断或白名单。

## Round 2：Workspace Summary fallback 关闭 migration-target

目标：把 Summary 从“仍在迁移目标”收口为“当前阶段已完成的 hosted normal path + explicit unavailable fallback”。

历史当前状态：

- `WorkspaceSummaryHostedModelBuilder` 已是正常路径。
- `ProjectWorkspaceDraftSummaryModelBuilder` 已承接 draft fallback。
- `ProjectWorkspaceSummaryModelBuilder` 仍是兼容门面。
- `workspace-summary-status` 仍标为 `migration-target`，文档也还保留“shared project-summary backend model”表述。

2026-06-15 更新：上述第四项已收口，`workspace-summary-status` 现在是 hosted summary inputs unavailable 的 `temporary-hosted-fallback`，不再是 `migration-target`。

需要先做一个小决定：

```text
Decision A:
当前阶段是否接受 hosted aggregation summary 作为 100% normal path？
```

建议决定：接受。

理由：

- Summary 当前只聚合已有 hosted payload，不创造新的语义 truth。
- VSCode 暂无同一 summary model 的直接消费需求。
- 为 Summary 单独下沉 Internal shared model 的收益不足以抵消新 contract 成本。

执行项：

1. 将 `WorkspaceSummaryStatus` 从 `migration-target` 调整为 `temporary-hosted-fallback` 或等价的 closed fallback 分类。
2. 文案改成“hosted summary inputs unavailable fallback”，不再写成“待迁移主路径”。
3. model contract 增加断言：当 Compiler graph 与 hosted localization 都存在时，Workbench summary 必须是 `provider: "shared"`。
4. model contract 增加断言：只有 hosted inputs 不完整时才允许 `provider: "draft-fallback"`。
5. 更新 README、architecture plan、handoff、TODO，删除“Summary 仍待迁移”的过期口径。

验收标准：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

完成后，Summary 这项可以按当前阶段记为 100%。

## Round 3：fallback contract 再硬化

目标：确保 Preview / StoryGraph / Localization / Outline 的 fallback 边界不仅代码上存在，而且有足够 contract 防回归。

执行项：

1. Preview：
   - 增加 Workbench 级断言：Compiler graph 正常时 `data-preview-provider` 必须是 `compiler-project` 或 Runtime-backed provider。
   - malformed `compiler-project` graph 必须显示 `contract-error`。
   - no graph/unavailable 才允许 `offline-draft`。
2. StoryGraph：
   - malformed compiler graph 必须显示 `contract-error`。
   - unavailable 才允许 `offline-draft`。
   - provider status 文本与 `dataset.graphProvider` 一致。
3. Localization：
   - 空 hosted presenter 必须保持 `provider: "localization-review"`，并显示空 hosted state。
   - `review-unavailable` 才能进入 draft table。
   - draft fallback 下 updated CSV export / linked-file replace 必须禁用并解释原因。
4. Outline：
   - LanguageServer malformed symbols 必须显示 `language-server-error`。
   - 只有请求失败才允许 draft outline。
5. `ScriptDocumentFallbackPolicy` reason catalog 中不再出现含糊 owner 或 migration target。

验收标准：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

完成后，fallback 迁出可以按当前阶段记为 100%。

## Round 4：project-session status 真实性收口

目标：让 session 面板与 `project-session` 状态完整表达当前 dev-host 事实，不夸大也不遗漏。

执行项：

1. `EditorBackendProjectSessionModel` 增加可选的 language session mode 输入：
   - 默认：`process-per-request`。
   - `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 时：显示 `stdio-spike` 或等价明确名称。
2. `project-session` status 可以暴露 supported endpoints：
   - 默认 language endpoints：diagnostics / completions / definition / references / hover / documentSymbols 都是 process-per-request。
   - stdio spike endpoints：diagnostics / documentSymbols。
3. status 允许暴露 last error / stale reason / age / cache count，但继续禁止暴露 workspace text、Runtime snapshot、CSV、line-map 本体。
4. Sidebar session panel 保持轻量展示：backend mode、session id、language mode、runtime/line/localization bounded-cache 状态。
5. `SelfHostedEditorProjectSessionContractCheck` 覆盖：
   - 不泄露 secret document text。
   - 不泄露 cache entries 内容。
   - stdio 开关下 status 能反映 spike mode。

验收标准：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
```

完成后，Backend Session v0 可以按当前阶段记为 100%。

## Round 5：LanguageSession stdio spike 决策收口

目标：把 optional long-lived LanguageServer spike 从“能跑”推进到“边界已决策”。

先做能力审计：

```text
Decision B:
当前 Inscape.LanguageServer --stdio 是否已经稳定支持六个 authoring endpoint？

diagnostics
documentSymbols
completions
definition
references
hover
```

建议策略：

1. 如果 stdio protocol 已支持全部六个 endpoint：
   - 在 `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 下扩展到六个 endpoint。
   - 默认路径仍保持 process-per-request。
   - 增加 stdio 开关下的 semantic parity / references smoke。
2. 如果 stdio protocol 只稳定支持 diagnostics / documentSymbols：
   - 明确记录“当前阶段只支持两个 endpoint”。
   - status 中显示 supported endpoints。
   - 不把未支持 endpoint 半接入。

验收标准：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
$env:SELF_HOSTED_EDITOR_LANGUAGE_SESSION='stdio'; npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

完成后，LanguageSession spike 可以按当前阶段记为 100%。注意：这仍不等于默认启用正式 long-lived LanguageServer。

## Round 6：Workbench 集成 smoke 收口

目标：补齐“单元 / model contract 已过，但真实工作台组合是否一致”的最后一层信心。

建议优先用现有 fake DOM harness，不急着引入新浏览器测试框架。若后续已经有浏览器自动化依赖，再补 in-app/browser smoke。

执行项：

1. 新增或扩展 Workbench 集成 contract：
   - 加载默认 sample。
   - 走 hosted summary。
   - Preview 显示 Compiler/Runtime provider。
   - Graph 显示 Compiler graph provider。
   - Localization 空 hosted review 不混入 draft rows。
   - Outline malformed payload 显示 error。
2. 增加 preview choice click invariant 的集成断言：
   - Runtime 可用时 choice click 推进 reading Preview。
   - 编辑器 reveal 到目标 block title。
3. 如果使用真实 HTTP smoke：
   - 仍用随机端口。
   - 不依赖固定 `5178`。
   - 不手工 curl 作为主基线。

验收标准：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
```

完成后，工作台组合风险可以按当前阶段记为 100%。

## Round 7：正式 backend 非目标与触发条件文档化

目标：把“现在不做”的部分也变成明确决策，而不是隐性欠账。ADR 0019 已经决定 v0 采用嵌入式 EditorBackend，本轮需要确保 current-stage 文档全部引用同一口径。

需要写进 ADR 0018 或新增 ADR follow-up：

1. 现在不做正式 desktop backend。
2. 现在不做持久化 `DocumentBufferStore`。
3. 现在不把 dev-host session cache 说成产品 session state。
4. 现在不默认启用 full long-lived LanguageServer。
5. 现在不删除 offline-only editor authoring fallback。
6. 现在不把 `previousCsv` body 变成长期 backend 状态协议。

同时写清触发条件：

1. 需要桌面壳文件权限模型时，启动正式 backend。
2. process-per-request 性能成为真实瓶颈时，推进默认 long-lived LanguageServer。
3. 多文件编辑、跨窗口、保存/恢复成为产品需求时，设计 `DocumentBufferStore`。
4. VSCode 与 SelfHostedEditor 共同需要同一 summary presenter 时，再下沉 shared project summary model。
5. Runtime 需要持续交互和外部 host state 时，再设计 long-lived RuntimeSession。

验收标准：

```powershell
docs/adr/0018-self-hosted-editor-backend-session-boundary.md 已更新
docs/self-hosted-editor-backend-migration-map.md 已更新
docs/agent-handoff.md 已更新
docs/todo.md 已更新
```

完成后，“不做什么”也算当前阶段 100%。

## Round 8：全量验证与提交

目标：把当前阶段 100% 变成可交接状态。

完整验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
$env:SELF_HOSTED_EDITOR_LANGUAGE_SESSION='stdio'; npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

提交前检查：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
```

建议提交粒度：

```text
refactor: close self hosted current-stage fallback boundaries
refactor: complete self hosted project session status
test: harden self hosted workbench contracts
docs: close self hosted current-stage backend decisions
```

如果改动量小，也可以合并为一个阶段提交。

## 完成后的评分预期

按当前阶段口径：

| 项目 | 当前评估 | 目标 |
|---|---:|---:|
| Summary hosted path | 90% | 100% |
| Preview / StoryGraph fallback | 90%-92% | 100% |
| Localization hosted/draft 分离 | 90% | 100% |
| Backend Session v0 | 88%-90% | 100% |
| LanguageSession spike | 75%-85% | 100% current-stage |
| CSS 可维护性 | 87% | 100% current-stage |
| 文档与决策边界 | 90% | 100% |

按正式 backend 口径：

| 项目 | 完成度 |
|---|---:|
| 真正 desktop backend | 0%-10% |
| 真正 long-lived ProjectSession | 20%-30% |
| 默认 long-lived LanguageServer | 20%-40%，取决于 Round 5 决策 |
| 当前阶段 backend migration readiness | 95%-100% |

不要把这两张表混算。当前目标是第二张表最后一行到 100%，不是强行把正式 backend 做完。

## 最终成功标准

当前阶段 100% 完成时，应满足：

1. `check:structure` 不再输出可消除 warning。
2. fallback catalog 中没有仍可在当前阶段解决的 `migration-target`。
3. Summary / Preview / StoryGraph / Localization / Outline 都有 provider-aware contract。
4. project-session status 能真实表达 dev-host mode、session id、workspace snapshot、language mode 与 bounded cache。
5. optional stdio spike 的 supported endpoints 和 fallback 行为已被明确决策。
6. README / architecture / backend migration map / handoff / TODO 没有互相矛盾的状态描述。
7. 全量验证通过。
8. 工作树 clean，阶段提交完成。

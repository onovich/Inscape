# SelfHostedEditor 重构计划

状态：阶段验收完成（2026-06-13，第 11 轮 / 14 轮内收口）

适用范围：`src/ExternalSupport/SelfHostedEditor`

本文面向后续负责重构 SelfHostedEditor 的 AI 或工程代理。目标不是把子项目机械拆碎，而是在保持现有契约和体验不变的前提下，继续降低 UI controller 复杂度，压住 UI-only fallback 的语义风险，并为未来真实 editor backend / desktop session 做准备。

## 执行状态

- 2026-06-13 第 1 轮完成：StoryGraph rendering 边界拆分。`StoryGraphPreviewController.js` 从 1025 行降到 824 行，新增 `StoryGraphNodeRenderer` 负责节点卡片、端口和输出行 DOM，新增 `StoryGraphEdgeRenderer` 负责 SVG edge layer / path 创建。controller 仍保留 layout、reference projection、viewport、drag / retarget 和 hover 编排，阶段 1 尚未完成到 350 到 500 行目标；下一轮继续拆 interaction / viewport。
- 第 1 轮验证：改动前已通过阶段 0 SelfHostedEditor 全套轻量基线；改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。
- 2026-06-13 第 2 轮完成：StoryGraph viewport 边界拆分。新增 `StoryGraphViewportController` 负责 viewport DOM、pan / zoom / reset、transform 应用、graph-space 坐标换算和 node position 读取。`StoryGraphPreviewController.js` 从 824 行降到 662 行，仍保留 node drag、connection drag / retarget、hover highlight、layout 和 reference projection；阶段 1 仍需下一轮拆 interaction / geometry 才能接近 350 到 500 行目标。
- 第 2 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。
- 2026-06-13 第 3 轮完成：StoryGraph interaction / geometry 边界拆分。新增 `StoryGraphInteractionController` 负责 node drag、connection drag / retarget、connection target hit test 和 preview path，新增 `StoryGraphPortGeometryModelBuilder` 负责端口中心和连接曲线路径。`StoryGraphPreviewController.js` 从 662 行降到 472 行，阶段 1 的 350 到 500 行目标已达成；reference projection / layout 暂留 controller 作为 feature orchestration。
- 第 3 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。下一轮进入阶段 2：Preview controller 拆分。
- 2026-06-13 第 4 轮完成：Preview controller 拆分第一刀。新增 `PreviewCompilerGraphContractGuard` 负责 compiler graph preview line 契约守卫，新增 `PreviewRuntimePreferenceModelBuilder` 负责 Runtime snapshot 优先级判断、active line 对齐判断和 snapshot 到 reading preview model 的映射。`PreviewPanelController.js` 从 1002 行降到 811 行；阶段 2 尚未达到 350 到 500 行目标，下一轮继续拆 DOM renderer、interaction controller 或 Flow presenter。
- 第 4 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:runtime-http`、`check:semantic-parity-http`。Compiler graph contract error 与 Runtime-backed reading preview 行为保持不变。
- 2026-06-13 第 5 轮完成：Preview controller 目标区间收口。新增 `PreviewBlockRenderer` 负责正文、metadata tag、query token 与 typewriter DOM，新增 `PreviewChoiceRenderer` 负责 choice list DOM，新增 `PreviewFlowStatePresenter` 负责 Flow 可见行、choice 显示和动画行索引。`PreviewPanelController.js` 从 811 行降到 478 行，阶段 2 的 350 到 500 行目标已达成。
- 第 5 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:runtime-http`、`check:semantic-parity-http`。choice click、Runtime-backed continue / rewind / Flow 与 compiler graph contract error 行为保持不变；下一轮进入阶段 3：AppEntry composition root 收口。
- 2026-06-13 第 6 轮完成：AppEntry composition root 收口。新增 `SelfHostedEditorDomBindings` 负责 DOM 查询与启动错误 DOM 写入，新增 `SelfHostedEditorFeatureBootstrapper` 负责 controller / bridge 创建和 workspace context provider 装配，新增 `SelfHostedEditorWorkbenchRenderController` 负责 workbench render 状态，新增 `SelfHostedEditorNodeRenameDialog` 与 `ScriptBlockEditPatchBuilder` 承担入口内的 UI-only 辅助职责。`SelfHostedEditorAppEntry.js` 从 793 行降到 331 行，阶段 3 的 200 到 350 行目标已达成。
- 第 6 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:semantic-parity-http`、`check:runtime-http`、`check:static-assets-http`。Monaco / loading / sample loading / Runtime / Preview / Graph 初始化路径保持由入口 `main()` 编排；下一轮进入阶段 4：压缩 UI-only fallback 使用面。
- 2026-06-13 第 7 轮完成：UI-only fallback 使用面第一轮压缩。新增 `ScriptDocumentFallbackPolicy` 作为 `ScriptDocumentModelBuilder` 的唯一生产入口，所有生产调用点必须登记 fallback reason；当前分类覆盖 offline-only UI convenience 与 hosted bridge unavailable fallback。`SelfHostedEditorStructureContractCheck.js` 会拦截 `Scripts/` 下绕过 policy 的直接 builder import，model contract 覆盖 reason catalog 与缺 reason 抛错。
- 第 7 轮验证：通过 `check:syntax`、`check:structure`、`check:model`。Preview malformed Compiler graph 仍由 `PreviewCompilerGraphContractGuard` 报 explicit contract error，不会落回 draft fallback。README 已记录 fallback policy 边界；下一轮进入阶段 5：Localization controller 轻量化。
- 2026-06-13 第 8 轮完成：Localization controller 轻量化。新增 `LocalizationTableRenderer` 负责 review table / action button / translation input DOM，新增 `LocalizationCsvFileController` 负责 previous CSV file handle、updated CSV download / replace 和 translation overrides 收集，新增 `LocalizationVisibleRowsModelBuilder`、`LocalizationReviewRowsModelBuilder` 与 `LocalizationExportReadinessModelBuilder` 分别承担 filter 可见行、Tooling presenter row 映射和 updated / replace readiness。`LocalizationEditorController.js` 从 823 行降到 432 行，阶段 5 的 300 到 450 行目标已达成。
- 第 8 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:localization-review-http`、`check:localization-update-http`。Tooling presenter review action、draft filter、updated CSV、replace linked baseline 行为保持不变；下一轮进入阶段 6：EditorSurface controller 轻量化。
- 2026-06-13 第 9 轮完成：EditorSurface controller 轻量化。新增 `EditorLineHintController` 负责 hint rail DOM、stable id hover / copy、title add / rename / refs button 和 block reorder drag visual state，新增 `EditorSemanticDecorationController` 负责 Monaco semantic decorations、active block decorations、metadata / query inline token decorations 和 decoration id 生命周期。`EditorSurfaceController.js` 从 819 行降到 407 行，阶段 6 的 350 到 500 行目标已达成。
- 第 9 轮验证：通过 `check:syntax`、`check:structure`、`check:model`、`check:references-http`、`check:line-map-http`、`check:semantic-parity-http`。Stable id hint、refs overlay 入口、source reveal HTTP smoke 和 semantic parity 行为保持不变；下一轮进入阶段 7：产品化 backend 准备。
- 2026-06-13 第 10 轮完成：产品化 backend 准备。新增 `self-hosted-editor-backend-migration-map.md`，把当前 17 个 `/api/*` endpoint 映射到未来 `languageSession`、`runtimeSession`、`lineIdentitySession`、`localizationSession`、`stableNodeMap` 等业务窄接口，并区分 Editor UI state、dev-host transport cache、future backend project session 和 shared semantic truth。新增 ADR 0018，明确不把 `/api/*` 机械升级为通用 RPC，不把 dev-host bounded cache 当正式 project session。架构方案已链接 migration map 和 ADR。
- 第 10 轮验证：通过 `check:syntax`、`check:structure`、`check:model`。当前 dev host 没有被改成复杂 backend 框架，仍作为轻量开发服务器和 smoke 入口；下一轮进入阶段性大验收。
- 2026-06-13 第 11 轮完成：总体验收。阶段性大验收矩阵通过，额外复核 VSCode manifest / structure、最大 controller 行数、`ScriptDocumentModelBuilder` 生产入口、backend migration map endpoint 覆盖和 handoff / TODO 一致性；未发现需要继续扩范围的功能问题。
- 第 11 轮验证：通过 `dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`、`npm --prefix src\ExternalSupport\VSCode run check:structure`、`check:semantic-parity`，以及 SelfHostedEditor 的 `check:syntax`、`check:structure`、`check:model`、`check:semantic-parity-http`、`check:runtime-http`、`check:localization-review-http`、`check:localization-update-http`、`check:node-map-http`、`check:static-assets-http`、`check:session-cache-http`、`check:line-map-http`、`check:host-schema-http`、`check:host-binding-http`、`check:references-http`。
- 第 11 轮审计：最大 controller 为 `PreviewPanelController.js` 483 行，`StoryGraphPreviewController.js` 477 行，`LocalizationEditorController.js` 432 行，`EditorSurfaceController.js` 407 行，`SelfHostedEditorAppEntry.js` 331 行；`Scripts/` 下没有超过 500 行的 JS；17 个 dev-host `/api/*` route 已全部记录在 backend migration map；生产代码只通过 `ScriptDocumentFallbackPolicy` 触达 `ScriptDocumentModelBuilder`。

## 当前判断

当前 SelfHostedEditor 综合架构约为 8.6 / 10（第 11 轮验收后）。

优势：

- 正常路径已经消费 `LanguageServer`、`Tooling`、`Runtime`、`CLI`，浏览器侧没有成为第二套语义真相。
- Dev host 已拆出 HTTP、API handler、payload、process、session、static asset、workspace bridge。
- UI controller 主要厚点已经压到 500 行以内，并按 controller、renderer、model builder、feature bootstrap 边界拆开。
- UI-only draft fallback 已收敛到 `ScriptDocumentFallbackPolicy`，生产直接 import 会被 structure contract 拦截。
- HTTP body 上限、session TTL / 容量、process timeout / error details、static asset allowlist、CSP / nosniff 等边界已经建立。
- 回归护栏很强：syntax、structure、model、bridge contract、semantic parity、真实 HTTP smoke 都已制度化。

主要债务：

- 产品化 backend / desktop project session 尚未真正实现；当前只有 migration map 和 ADR 固化边界。
- `ScriptDocumentModelBuilder` 仍作为受控 UI-only fallback 存在，后续不能给它增加 hosted 语义能力。
- 当前 dev host 仍以临时 workspace + process-per-call 为主，不是最终产品化的长生命周期 backend。
- Workbench CSP 仍因 Monaco 和当前资源方式保留受控 `unsafe-eval` / `unsafe-inline`。

## 目标分数

短期目标：

| 维度 | 当前 | 目标 |
|---|---:|---:|
| SelfHostedEditor 综合分 | 8.6 | 8.6 |
| 前端模块组织 | 8.4 | 8.3 |
| 可读性 | 8.4 | 8.4 |
| 产品化准备度 | 8.0 | 8.0 |
| 稳定性 / 回归 | 9.1 | 保持 9.0+ |

不追求短期全项 9 分。SelfHostedEditor 作为宿主 UI 层，达到 8.5 左右已经足够健康；9 分以上应留给 shared semantic contract、安全边界和回归体系。

## 不改变项

除非任务明确要求，本计划内所有重构都必须保持：

- package script 命令名不变。
- HTTP API 成功 payload shape 不变。
- `check:model`、`check:structure`、`check:syntax` 入口不变。
- `check:semantic-parity-http` 覆盖的作者能力结果不变。
- Preview choice click 行为不变：点击选项必须推进阅读面到目标 block，并 reveal 目标标题到编辑器。
- Compiler graph contract error 行为不变：Compiler graph 已返回但 `previewLines` 缺失或不匹配时，不能回退到 draft fallback。
- Localization review / update 继续消费 Tooling / CLI，不在浏览器里重造 CSV 语义。
- Node map review / apply 继续调用 shared CLI，不在浏览器里直接改写 sidecar 语义。
- Host Schema / Host Binding 继续来自 LanguageServer capability，不在浏览器里解析配置作为真相。

## 总体策略

优先拆 UI controller，不优先动 dev host。

当前 dev host 已经比较健康，下一阶段收益最高的是把 UI controller 拆成：

- renderer：只负责 DOM 创建和局部渲染。
- presenter / view model adapter：只把已得到的 shared payload 转成 UI 可消费结构。
- interaction controller：只负责事件、拖拽、快捷动作和回调。
- state coordinator：只协调当前 feature 的局部状态，不重算 shared 语义。

命名要表达业务职责，避免 `Utils`、`Helpers`、`Manager`、`Common`。

## 阶段 0：基线冻结

目标：在任何拆分前确认当前行为和回归链路稳定。

操作：

1. 记录当前最大文件、模块体量和已知风险。
2. 跑 SelfHostedEditor 全套轻量验证。
3. 若某项验证失败，先修复或记录为环境问题，不在失败基线上继续重构。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
```

完成标准：

- 所有检查通过。
- 明确本轮只做等价重构。
- 当前 package script 和 HTTP contract 作为基线。

## 阶段 1：拆分 StoryGraph controller

目标文件：

```text
src/ExternalSupport/SelfHostedEditor/Scripts/StoryGraph/Controllers/StoryGraphPreviewController.js
```

当前问题：

- 单文件同时承担 graph DOM render、节点布局、端口测量、SVG edge 绘制、pan / zoom、drag / retarget、reference node projection、hover 高亮。
- 这是当前最大 UI 文件，也是后续图编辑能力扩展最容易膨胀的位置。

建议拆分：

```text
Scripts/StoryGraph/Controllers/StoryGraphPreviewController.js
Scripts/StoryGraph/Controllers/StoryGraphViewportController.js
Scripts/StoryGraph/Controllers/StoryGraphInteractionController.js
Scripts/StoryGraph/Renderers/StoryGraphNodeRenderer.js
Scripts/StoryGraph/Renderers/StoryGraphEdgeRenderer.js
Scripts/StoryGraph/Models/StoryGraphViewModelProjector.js
Scripts/StoryGraph/Models/StoryGraphReferenceProjectionModelBuilder.js
Scripts/StoryGraph/Models/StoryGraphPortGeometryModelBuilder.js
```

职责边界：

- `StoryGraphPreviewController` 只保留 feature orchestration。
- `StoryGraphNodeRenderer` 只创建节点、端口、输出行 DOM。
- `StoryGraphEdgeRenderer` 只绘制 / 更新 SVG edge。
- `StoryGraphViewportController` 只处理 pan、zoom、reset 和坐标换算。
- `StoryGraphInteractionController` 只处理拖拽、retarget、disconnect、hover。
- `StoryGraphReferenceProjectionModelBuilder` 只做 view-only reference node projection，不修改 Compiler graph truth。
- `StoryGraphPortGeometryModelBuilder` 只读取 DOM geometry 并产出绘线所需坐标。

禁止事项：

- 不把 graph edge 语义从 Compiler payload 改成浏览器重算真相。
- 不改变拖拽后写回文本 patch 的 contract。
- 不把 reference node 当成真实节点写回。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- `StoryGraphPreviewController.js` 降到约 350 到 500 行。
- StoryGraph 相关 contract 仍覆盖 reference node、edge hover、choice retarget、真实 Compiler graph 消费。
- 文件命名能从目录直接看出职责。

## 阶段 2：拆分 Preview controller

目标文件：

```text
src/ExternalSupport/SelfHostedEditor/Scripts/Preview/Controllers/PreviewPanelController.js
```

当前问题：

- 单文件同时承担 Compiler graph contract 校验、Runtime snapshot 偏好、Flow presenter、choice / continue / back interaction、DOM render、query token render、metadata render。
- Preview 是作者体验核心，继续增长会提高回归风险。

建议拆分：

```text
Scripts/Preview/Controllers/PreviewPanelController.js
Scripts/Preview/Controllers/PreviewInteractionController.js
Scripts/Preview/Renderers/PreviewBlockRenderer.js
Scripts/Preview/Renderers/PreviewChoiceRenderer.js
Scripts/Preview/Renderers/PreviewRuntimePathRenderer.js
Scripts/Preview/Models/PreviewCompilerGraphContractGuard.js
Scripts/Preview/Models/PreviewRuntimePreferenceModelBuilder.js
Scripts/Preview/Models/PreviewFlowStatePresenter.js
Scripts/Preview/Models/PreviewQueryTokenFragmentBuilder.js
```

职责边界：

- `PreviewCompilerGraphContractGuard` 只负责拒绝 malformed Compiler graph，不做 fallback。
- `PreviewRuntimePreferenceModelBuilder` 只决定 Runtime snapshot 是否优先于 Compiler presenter。
- `PreviewFlowStatePresenter` 只处理 UI 层 Flow 展示状态和 Runtime reading progress 的映射。
- `PreviewBlockRenderer` / `PreviewChoiceRenderer` 只处理 DOM。
- `PreviewInteractionController` 只处理 choice、continue、back、flow advance / rewind 事件。

禁止事项：

- 不弱化 compiler graph contract error。
- 不让 draft fallback 覆盖已经返回的 malformed Compiler data。
- 不在 Preview 里重新实现 Runtime 语义。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- `PreviewPanelController.js` 降到约 350 到 500 行。
- Preview / Runtime model contract 仍覆盖 choice click、continue、rewind、Flow、Runtime preference、compiler graph contract error。

## 阶段 3：收口 AppEntry composition root

目标文件：

```text
src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorAppEntry.js
```

当前问题：

- 入口文件 import 很多 controller 和 bridge。
- DOM 查询、controller 创建、事件 wiring、sample loading、feature 状态协调集中在一个文件。
- 虽然它主要是 composition root，但 700 行以上会让新 agent 接手成本偏高。

建议拆分：

```text
Scripts/Entries/SelfHostedEditorAppEntry.js
Scripts/Entries/SelfHostedEditorDomBindings.js
Scripts/Entries/SelfHostedEditorFeatureBootstrapper.js
Scripts/Entries/Features/EditorAuthoringFeature.js
Scripts/Entries/Features/PreviewFeature.js
Scripts/Entries/Features/StoryGraphFeature.js
Scripts/Entries/Features/LocalizationFeature.js
Scripts/Entries/Features/HostCapabilityFeature.js
Scripts/Entries/Features/WorkspaceFeature.js
```

职责边界：

- `SelfHostedEditorDomBindings` 只查询 DOM 并返回命名 bindings。
- `SelfHostedEditorFeatureBootstrapper` 只按顺序创建 feature。
- 每个 `*Feature` 只创建本 feature controller、bridge、store，并暴露最少 wiring surface。
- `SelfHostedEditorAppEntry` 保留 `main()`、全局错误处理、启动顺序。

禁止事项：

- 不引入全局 service locator。
- 不把所有 controller 都塞进一个 `context` 巨对象后到处传。
- 不改变 UI 初始化顺序导致 Monaco / loading / sample loading 行为回归。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- `SelfHostedEditorAppEntry.js` 降到约 200 到 350 行。
- Feature bootstrap 文件职责清楚，不形成新的巨型 `Manager`。
- 入口仍一眼能看出应用启动顺序。

## 阶段 4：压缩 UI-only fallback 使用面

目标文件和模块：

```text
Scripts/ProjectWorkspace/Models/ScriptDocumentModelBuilder.js
Scripts/Preview/Controllers/*
Scripts/StoryGraph/Controllers/*
Scripts/Localization/Controllers/*
Scripts/EditorAuthoring/Controllers/*
Scripts/LanguageServer/Bridges/*
```

当前问题：

- `ScriptDocumentModelBuilder` 仍被 Preview、StoryGraph、Localization、Summary、Diagnostics、DocumentSymbols fallback 等多处使用。
- 它作为 offline fallback 是合理的，但不能继续扩展成第二套 parser / semantic truth。

计划：

1. 给每个 fallback 使用点标注分类：
   - offline-only UI convenience
   - hosted bridge unavailable fallback
   - legacy compatibility fallback
   - should be replaced by shared contract
2. 对 hosted 正常路径已经有 shared contract 的功能，确保 fallback 不覆盖 shared failure。
3. 对没有 shared contract 的 UI-only 功能，记录后续应迁往 Tooling / LanguageServer / Runtime 的候选。
4. 在 structure 或 model contract 中守住关键限制。

禁止事项：

- 不新增基于 `ScriptDocumentModelBuilder` 的语义能力。
- 不让 fallback 在 shared payload malformed 时静默接管。
- 不用 fallback 结果覆盖 LanguageServer / Tooling / Runtime 的错误状态。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

完成标准：

- `ScriptDocumentModelBuilder` 的使用点有明确理由。
- model contract 覆盖“shared payload 错误不能被 draft fallback 掩盖”的关键路径。
- README 或 architecture plan 更新 fallback 边界。

## 阶段 5：Localization controller 轻量化

目标文件：

```text
src/ExternalSupport/SelfHostedEditor/Scripts/Localization/Controllers/LocalizationEditorController.js
```

当前问题：

- 文件约 700 行，承担 review table render、filter、draft override、CSV baseline 状态、导出 readiness、native file handle 写回、review action 展开等。
- 本地化功能仍在快速扩展，后续容易重新变成大控制器。

建议拆分：

```text
Scripts/Localization/Controllers/LocalizationEditorController.js
Scripts/Localization/Controllers/LocalizationDraftInteractionController.js
Scripts/Localization/Controllers/LocalizationCsvFileController.js
Scripts/Localization/Renderers/LocalizationTableRenderer.js
Scripts/Localization/Renderers/LocalizationStatusRenderer.js
Scripts/Localization/Models/LocalizationVisibleRowsModelBuilder.js
Scripts/Localization/Models/LocalizationExportReadinessModelBuilder.js
```

职责边界：

- Table renderer 不处理 CSV 写回。
- CSV file controller 不处理 review row render。
- Draft interaction controller 不重算 alignment 或 candidate score。
- Export readiness 只是 UI 状态，不改变 CLI update 语义。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

完成标准：

- `LocalizationEditorController.js` 降到约 300 到 450 行。
- review action、draft filter、updated CSV、replace linked baseline 都仍有 contract 覆盖。

## 阶段 6：EditorSurface controller 轻量化

目标文件：

```text
src/ExternalSupport/SelfHostedEditor/Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js
```

当前问题：

- 文件约 700 行，承载 Monaco setup、source selection、line hints、stable id hover、refs button、semantic styling、rename / patch 等多类交互。

建议拆分：

```text
Scripts/EditorAuthoring/Controllers/EditorSurfaceController.js
Scripts/EditorAuthoring/Controllers/EditorLineHintController.js
Scripts/EditorAuthoring/Controllers/EditorSourceRevealController.js
Scripts/EditorAuthoring/Controllers/EditorSemanticStyleController.js
Scripts/EditorAuthoring/Controllers/EditorReferenceButtonController.js
Scripts/EditorAuthoring/Models/EditorSelectionStateModelBuilder.js
```

职责边界：

- Monaco adapter 保持薄。
- Line hint 只处理稳定 id 展示，不生成 line identity。
- Source reveal 只消费 LanguageServer / workspace source location。
- Semantic style 只处理 decorations，不做语义判断。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- `EditorSurfaceController.js` 降到约 350 到 500 行。
- Stable id hint、refs overlay、source reveal、semantic styling 仍有 model/HTTP smoke 护栏。

## 阶段 7：产品化 backend 准备

目标：为未来从 dev host 迁到真实 editor backend 做边界准备，不急于实现桌面 backend。

当前 dev host 仍有合理限制：

- 临时 workspace 驱动。
- 每次请求调用 CLI / LanguageServer / Runtime process。
- session cache 是 dev-host 生命周期，不是正式 project session。

计划：

1. 梳理当前 `/api/*` endpoint，标记哪些应迁移为 long-lived backend service。
2. 抽象出 backend-facing client interface，但不引入过度通用 RPC。
3. 区分三类状态：
   - editor UI state
   - dev-host transport cache
   - future backend project session
4. 为 runtime、line-map、localization baseline 记录正式 session 需求。
5. 写 ADR 或更新 architecture plan。

禁止事项：

- 不为了未来 backend 把当前 dev host 大改成复杂框架。
- 不提前引入未使用的 service abstraction。
- 不改变当前本地 preview server 开发体验。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

完成标准：

- 有明确的 backend migration map。
- 当前 dev host 仍能作为轻量开发服务器运行。
- future backend 方向进入文档或 ADR，而不是散落在代码注释里。

## 推荐执行顺序

建议按以下小提交推进：

1. `refactor: split self hosted story graph rendering`
2. `refactor: isolate self hosted story graph interactions`
3. `refactor: split self hosted preview presenter`
4. `refactor: isolate self hosted preview rendering`
5. `refactor: split self hosted app bootstrap`
6. `refactor: document self hosted draft fallback boundaries`
7. `refactor: split self hosted localization table`
8. `refactor: split self hosted editor surface`
9. `docs: map self hosted backend migration`

每个提交只做一个清楚边界，不把 StoryGraph、Preview、Localization 混在同一轮。

## 验证矩阵

| 改动区域 | 必跑 |
|---|---|
| StoryGraph | `check:syntax`, `check:structure`, `check:model`, `check:node-map-http`, `check:semantic-parity-http` |
| Preview | `check:syntax`, `check:model`, `check:runtime-http`, `check:semantic-parity-http` |
| AppEntry / bootstrap | `check:syntax`, `check:structure`, `check:model`, `check:semantic-parity-http` |
| Localization | `check:syntax`, `check:model`, `check:localization-review-http`, `check:localization-update-http` |
| EditorSurface / source reveal | `check:syntax`, `check:model`, `check:references-http`, `check:line-map-http`, `check:semantic-parity-http` |
| Dev host / API | `check:model`, `check:process-bridge`, `check:payload-bridge`, `check:static-assets`, related HTTP smoke |
| Session / cache | `check:session-cache`, `check:session-cache-http`, affected feature smoke |

阶段性大验收：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
```

## 终局判断标准

这轮计划完成后，SelfHostedEditor 应达到：

- Dev host 继续保持薄 transport / adapter 层。
- 前端最大 controller 控制在 500 行左右，且大文件有明确聚合理由。
- `ScriptDocumentModelBuilder` 明确只作为 offline fallback，不承担 hosted 语义真相。
- Preview、StoryGraph、Localization、EditorSurface 的核心交互都有 focused contract。
- 新 agent 可以从 entry、feature bootstrap、controller、renderer、model builder 的命名快速定位职责。
- 综合架构评分达到 8.6 左右，不牺牲迭代速度去追求无意义的 9+。

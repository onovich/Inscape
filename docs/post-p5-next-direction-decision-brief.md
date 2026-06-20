# Post-P5 Next Direction Decision Brief

日期：2026-06-20

## 结论

- P5 SelfHostedEditor Runtime authoring / productization 已 PASS。
- 当前没有已批准的新研发 phase。
- 下一候选方向仍必须由用户批准；本 brief 只提供比较、推荐和决策问题。
- 推荐下一步：优先批准 **Host Bridge / Host Schema 自动化与代码生成收口** 的 scoping first slice；完成后再用它降低 **Unity / Host SDK 第一刀** 的集成风险。

## P5 已完成能力

- SelfHostedEditor 已具备最小 Runtime authoring workflow：Host Schema / Host Bridge capability 浏览、session-only mock query、Runtime-backed Preview、Runtime action request / pending / resume、Runtime status、Log / Backlog、Branch Receipts、Runtime Substate export / validate / compatible import，以及 Runtime States inventory。
- Runtime / CLI 仍是 condition evaluator、query provider consumption、action dispatch、pending / resume、Log、branch receipt、Runtime State 和 Runtime Substate 的语义真相。
- SelfHostedEditor 只做 backend command / transport、bridge、presenter、UI、authoring workflow 与 smoke 编排。
- P5 final validation 矩阵和边界扫描均通过；没有必须进入 P5 Round 13-15 buffer fix 的阻塞缺陷。

## 候选方向对比

| 方向 | 建议优先级 | 推荐轮数 | 决策性质 |
| --- | --- | --- | --- |
| D. Host Bridge / Host Schema 自动化与代码生成收口 | 高 | 4-6 轮 | 最稳妥的下一刀，可降低 Unity / Host SDK 风险 |
| A. Unity / Host SDK 第一刀 | 中高 | 6-8 轮 | 产品可见度高，但依赖 Host Bridge 自动化边界 |
| B. 高级运行时调试 | 中 | 6-10 轮 | 作者调试价值高，但容易扩张 Runtime / Host policy |
| C. Presentation IR / 跨引擎 / 独立 Runtime | 低到中 | 8-12+ 轮 | 长期战略方向，当前资料仍偏远期 |

## A. Unity / Host SDK 第一刀

### 目标

- 定义并验证一个薄 Unity / Host SDK 入口，让 Unity 项目能消费 Inscape Compiler / Runtime / Host Schema / Host Bridge 的 shared contracts。
- 优先围绕 Host Schema capability、Host Bridge mapping、Runtime Host delegate query / action dispatcher 和 UnitySample / Bird 回归样例做第一刀。
- 保持 Unity / Bird 作为 `ExternalSupport` / adapter，不让 `Inscape.Compiler` 或 `Internal/Runtime` 依赖 Unity。

### 不目标

- 不把 Bird 数据结构、Addressables、ScriptableObject 或 Unity GUID 写入 Host Schema / Compiler。
- 不直接实现完整 Unity runtime product、完整 Host SDK、Unity package 发布或 Bird 正式资源提交策略。
- 不把 Timeline 变成 DSL 内建演出语言；Timeline 仍作为 Host action / bridge hook / 后续 Presentation IR 候选讨论。

### 依赖的已有能力

- Narrative Graph IR、source mapping、项目级编译、Host Schema `queries[]` / `actions[]`、Usage Manifest、Host Integration Audit。
- Runtime delegate / mock / recorded query provider、action dispatcher、pending / resume、Runtime State / Substate、Log / branch receipts。
- P2.5 UnitySample / Bird dry run、Unity Editor Importer 原型和 Host Bridge / ExternalSupport 边界收口。

### 主要收益

- 最快把 Inscape 从编辑器 authoring 闭环带回真实游戏宿主。
- 能用真实 Unity 项目暴露 Host Bridge、Runtime Host、query/action dispatcher 和 asset binding 的缺口。
- 对用户可见价值强，便于验证 Inscape 的“文本源 -> IR -> 宿主 adapter”主张。

### 最大风险

- 过早绑定 Bird、Addressables、ScriptableObject 或某个 Unity 版本，污染通用 contract。
- Host Bridge handler / query implementation 字段还不够稳定时，Unity SDK 容易写成一次性 adapter。
- Unity 环境验证成本高，失败可能来自 Unity 编译、项目资源、Importer、Addressables 或 Host Bridge，而不是 Inscape 核心。

### 最小第一刀范围

- 输出 Unity Host SDK boundary contract：包位置、输入 contract、Host Schema / Host Bridge / Runtime Host adapter 的职责。
- 实现或验证一个 thin adapter smoke：读取 shared capability / bridge，构造 delegate query provider 与 action dispatcher skeleton，使用 UnitySample fixture 证明不需要复制 Runtime evaluator。
- 只在 `ExternalSupport/UnityPlugin` 或独立 Unity 支持包内动手；`Internal` 只允许补缺共享 contract，不允许引入 Unity 依赖。

### 预计会话轮数

- 6-8 轮：2 轮 contract / boundary，2-3 轮 thin adapter / smoke，1-2 轮 UnitySample / Bird 回归，1 轮 final validation / docs。

### 验证矩阵草案

- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- UnityPlugin / UnitySample 相关 tests 或 smoke
- Host Schema / Host Bridge / Usage Manifest audit commands
- Unity SDK boundary scan：`src/Internal` 不出现 Unity / Bird / Addressables / ScriptableObject 依赖
- `git diff --check`

### 必须延后的内容

- 完整 Host SDK package 发布、Unity Inspector UX、Addressables 默认集成、Bird 正式资源提交策略。
- 非 Unity 引擎支持、完整 Presentation IR、Timeline 编辑器。

### 需要用户决策

- 是否接受先以 UnitySample / Bird 作为回归 fixture，而不是正式产品目标。
- 是否允许进入本地 Unity / Bird 项目验证，以及验证失败时是否只写报告不强行修 Unity 业务代码。
- 第一刀产物应偏 SDK contract、Unity Editor tool，还是 runtime host adapter。

## B. 高级运行时调试：有限 Rollback / Trace / Recorded Replay / Flashback

### 目标

- 在现有 Runtime authoring 基础上，把 Log、有限 Rollback、Trace Replay、recorded query / action receipt 和 Flashback Playback 拆成可独立验收的调试方向。
- 优先选择最小调试价值闭环：记录 branch-affecting query / action evidence，解释路径，而不是完整重放宿主世界。

### 不目标

- 不实现完整游戏世界 replay。
- 不新增 Host Schema action policy 字段，如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不把 Log、Rollback、Trace Replay、Flashback 混成一个功能。
- 不把 Runtime Substate 扩张成完整 host save。

### 依赖的已有能力

- Runtime branch receipts、Log entries、action request / pending / resume、formal Runtime State、Runtime Substate。
- P5 Branch Receipts、Log / Backlog、Runtime States 和 Substate authoring surfaces。
- P3 / P4 已确认普通 Runtime State 不默认包含完整 Log、完整 query/action trace 或 Rollback stack。

### 主要收益

- 显著增强作者和开发者解释“为什么走到这个分支”的能力。
- 可以复用 P5 已有 bounded surfaces，先做可见化和 recorded evidence，而不是新建大系统。
- 对 Runtime 问题定位价值高，尤其是 query provider、action dispatcher 和 pending resume。

### 最大风险

- 很容易被误解为正式 save/load、完整 time travel 或 Unity 世界 replay。
- Rollback 跨宿主破坏性 action 需要 host checkpoint / undo / idempotency，否则必须作为 barrier。
- 如果提前加入细粒度 action policy，会把 Host Schema 做胖，并反向污染 P3/P4/P5 已收敛边界。

### 最小第一刀范围

- 只做 Trace Explanation / recorded evidence brief + model：展示历史 query receipt、chosen choice、action request result、source jump 和 Runtime provider metadata。
- 若进入 Rollback，也只做有限内存、当前 session、遇宿主 action barrier 即停止的 prototype contract；不跨读档保留。
- Flashback Playback 只作为展示历史文本 / branch explanation 的候选，不做状态回放。

### 预计会话轮数

- 6-10 轮：2 轮 contract / naming split，2-3 轮 recorded evidence model / UI，2 轮 limited rollback barrier smoke，1-2 轮 docs / final validation。

### 验证矩阵草案

- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- Runtime tests covering query receipts / action receipts / rollback barrier
- SelfHostedEditor model / runtime / runtime-http checks if UI surface changes
- Boundary scan for forbidden policy fields
- Boundary scan for ExternalSupport Runtime evaluator / action dispatcher duplication
- `git diff --check`

### 必须延后的内容

- 完整 Trace Replay timeline、完整 host world replay、Flashback gameplay product、persistent rollback stack。
- Host action policy 扩张，除非用户明确批准新的 Host Schema phase。

### 需要用户决策

- 这个方向第一刀是 Trace Explanation、有限 Rollback contract，还是 Flashback UX 原型。
- 是否接受默认 barrier：跨宿主副作用 action 不回退。
- 是否允许后续单独开启 Host action policy 设计。

## C. Presentation IR / 跨引擎 / 独立 Inscape Runtime

### 目标

- 研究 Inscape 是否需要从 Narrative Graph IR 之外抽象 Presentation IR，支撑 Unity 外运行时、Web / Godot / Bevy / 自研轻量演出层或完整视觉小说 runtime。
- 明确 Timeline 是宿主资源 hook、Presentation IR、还是姊妹工具，而不是在当前 DSL 核心里隐式扩张。

### 不目标

- 不实现跨引擎 runtime。
- 不实现独立 VN 引擎、资源系统、转场、设置、构建和分发。
- 不把 Timeline 生成、演出调度或素材管理写入 Compiler truth。

### 依赖的已有能力

- Compiler 输出 Narrative Graph IR、源映射、项目级编译和 Runtime playable MVP。
- Editor design 中的多视图工作台设想。
- DSL ecosystem positioning 对 Ren'Py、Narrat、Arcweave / articy 的长期参照。
- roadmap 阶段 4 对“脱离 Unity 的完整 Inscape 技术栈”的远期目标。

### 主要收益

- 能回答 Inscape 长期是否只是宿主 adapter，还是会成长为独立 narrative runtime / presentation runtime。
- 可提前保护 IR、Runtime Host 和 editor model 的跨引擎扩展性。
- 对未来 Web / Desktop / 非 Unity 发布有战略价值。

### 最大风险

- 当前离 P5 authoring 闭环较远，容易变成大而散的架构研究。
- Presentation IR 会牵涉资源、动画、音频、Timeline、UI layout、platform packaging，验证成本高。
- 若过早实现，会削弱近期 Unity / Host Bridge / Runtime authoring 的确定性。

### 最小第一刀范围

- 只做 scoping / ADR / fixture design：定义 Presentation IR 是否存在、和 Narrative Graph IR / Runtime State / Host action 的边界。
- 用 1-2 个样例说明“宿主 Timeline hook”和“Presentation IR command”的区别。
- 不改 Compiler / Runtime 行为，除非用户批准后单独开 phase。

### 预计会话轮数

- 8-12+ 轮：2-3 轮 research / ADR，2-3 轮 IR contract draft，2-4 轮 prototype fixture / renderer spike，1-2 轮 validation / docs。若做真实跨引擎 runtime，应另立更大 phase。

### 验证矩阵草案

- 文档阶段：`git diff --check`、docs references scan、ADR index check。
- Prototype 阶段：Compiler / Runtime tests, renderer smoke, no Unity dependency scan, no Runtime semantics duplication scan。
- Cross-engine 阶段需要单独定义 platform smoke，不应沿用 P5 validation matrix。

### 必须延后的内容

- 完整独立游戏 runtime、完整视觉演出系统、Unity 外平台发布、资源 pipeline。
- 节点图编辑器和 Presentation IR 双向编辑。

### 需要用户决策

- 是否现在投入远期架构研究，还是先把 Host Bridge / Unity 方向补成可落地集成。
- Presentation IR 是近期 scoping，还是 2027+ roadmap 中的长期阶段。

## D. Host Bridge / Host Schema 自动化与代码生成收口

### 目标

- 把 Host Schema / Host Bridge 从手写文件和样例 adapter 进一步收口到可生成、可审计、可回归的连接层。
- 优先定义 Host Bridge query / action handler 字段、Attribute / source generator / runtime registration 输出草案、generated dispatcher 与 manual bridge 的合并规则。
- 让后续 Unity / Host SDK 第一刀可以基于稳定 contract，而不是直接读取项目内部 API。

### 不目标

- 不实现完整 Unity SDK。
- 不新增 Runtime evaluator、query evaluator、action dispatcher 或 substate validator 的外部复制。
- 不把 Unity GUID、asset path、Addressables key、Bird ID 或 handler implementation 写进 Host Schema / Compiler。
- 不新增 rollback / replay / failure / timeout policy。

### 依赖的已有能力

- Host Schema capability catalog、Host Bridge capability output、Usage Manifest、Host Integration Audit。
- P2.5 Host Schema / Host Bridge 边界收口。
- Unity Host Bridge Preparation Plan 中的 Attribute scanning / generator 前置节点。
- P5 SelfHostedEditor Host capability / Runtime authoring surfaces。

### 主要收益

- 是四个方向里最能降低后续复杂度的一刀：先把连接层 contract 打稳，再做 Unity / Host SDK。
- 验证成本主要在文档、Tooling、CLI 和 smoke，低于直接进入 Unity 环境。
- 可减少手写 schema / bridge 漂移，补齐 unknown query / missing handler / required id 的项目级回归。

### 最大风险

- 如果过早实现代码生成，可能把未确认的项目命名、路径或 Unity 结构写成长期契约。
- 如果只做文档没有 smoke，后续 Unity / SDK 仍会卡在相同缺口。
- Handler implementation contract 需要谨慎，不应把宿主业务 API 直接暴露给 DSL。

### 最小第一刀范围

- 输出 Host Bridge automation contract：query implementation、action handler、resource binding、generated/manual merge、source location 和 audit diagnostic。
- 增强或新增一个 CLI / Tooling audit fixture：Usage + Host Schema + Host Bridge + generated candidate 对账。
- 可选只生成“待确认表”，不生成最终业务代码。

### 预计会话轮数

- 4-6 轮：1-2 轮 contract / audit gap，1-2 轮 Tooling / CLI fixture，1 轮 SelfHostedEditor / VSCode capability parity if needed，1 轮 final validation / docs。

### 验证矩阵草案

- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- Host Schema / Host Bridge / Usage Manifest / Host Integration Audit command smoke
- VSCode / SelfHostedEditor capability parity checks if payload changes
- Boundary scan: no Unity / Bird dependency in `src/Internal`
- Boundary scan: no forbidden Host Schema policy fields
- `git diff --check`

### 必须延后的内容

- Unity Attribute implementation、source generator package、Unity Editor scanner、runtime dispatcher generation。
- Host SDK package and product UX.

### 需要用户决策

- 是否把下一 phase 定为 Host Bridge automation scoping + minimal audit smoke。
- 是否允许修改 shared Host Bridge contract fields。
- 生成物第一刀是“待确认表”还是可执行 dispatcher skeleton。

## 推荐

建议先批准 **Host Bridge / Host Schema 自动化与代码生成收口** 的 scoping first slice，理由是：

- 它直接服务 Unity / Host SDK，但不要求立刻进入 Unity 环境。
- 它能把 query implementation、action handler、resource binding、generated/manual merge 和 audit diagnostic 的缺口先收敛。
- 它最不容易破坏 P5 已守住的边界：Compiler / Runtime 语义仍在 Internal，ExternalSupport 只消费 shared contracts。

若用户更看重短期产品可见度，也可以直接批准 **Unity / Host SDK 第一刀**，但建议把第一刀明确限制为 thin adapter + Host Bridge contract smoke，不做完整 Unity package 或 Bird 正式资源改动。

## 需要用户拍板

- 下一 phase 选择哪个方向：A Unity / Host SDK、B 高级运行时调试、C Presentation IR / 跨引擎 / 独立 Runtime、D Host Bridge / Schema 自动化。
- 如果选择 D，第一刀是否允许改 Host Bridge contract 字段，还是只做文档 / audit gap。
- 如果选择 A，是否允许接触 Unity / Bird 本地项目做 smoke，以及失败时是否只报告不修外部项目。
- 如果选择 B，第一刀是 Trace Explanation、有限 Rollback，还是 Flashback UX scoping。
- 如果选择 C，是否接受它是远期架构研究，不期待短期可运行产品。

## 下一步

用户批准一个方向后，再输出该方向的独立 goal-mode execution guide。当前不能自动进入 Unity / Host SDK、Rollback / Trace Replay / Flashback、Presentation IR、完整 host save 或 Host Schema action policy 扩张。

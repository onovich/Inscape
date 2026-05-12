# 渐进式重构计划

状态：执行中

最后更新：2026-05-11

本文把 Inscape 的重构拆成大目标、中目标、小目标，目标是让代码逐步接近游戏项目中常见的清晰入口、生命周期式流程、数据/逻辑/表现/适配分层，同时不破坏当前 DSL、CLI、VSCode 和预览体验。当前长期结构已经收敛为：Internal 下的 `Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`，以及 ExternalSupport 下的 `UnityPlugin`。

当前主动重构范围只覆盖 Internal 侧：`Inscape.Core`、`Inscape.Cli`、`src/Internal/VSCode/vscode-inscape` 与测试组织。`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 和 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 继续作为 ExternalSupport 过渡样例保留隔离，不纳入这一轮内部重构，只要求不反向污染 Compiler，并能继续承担 Host Bridge / UnityPlugin 回归素材。

重构原则见 [编码与命名规范](coding-conventions.md)。本文只安排执行顺序和验收方式。

## 评分目标

当前主观可维护性评估：

```text
整体：5.5 / 10
Core：7 / 10
CLI：5 / 10
VSCode：4 / 10
测试组织：6 / 10
文档与架构意识：8 / 10
```

阶段目标：

```text
短期目标：7 / 10
中期目标：8 / 10
长期目标：8.5 / 10
```

不追求一次性到 9 分以上，因为 Inscape 同时包含 DSL、工具链、编辑器、预览、Host Bridge 和未来 Runtime Host，天然复杂。重构目标是让复杂度被边界吸收，而不是消失。

## 大目标 A：建立清晰入口和生命周期心智

目标：让项目不再只有分散的 CLI / VSCode / Preview 入口，而是逐步形成可读的工具链主入口和未来运行时主入口。

### 中目标 A1：明确当前入口地图

小目标：

- 标注 Compiler 入口：`InscapeCompiler`、`ProjectCompiler`。
- 标注内部工具入口：CLI `CliCore`、VSCode `activate()`、LanguageServer server entry。
- 在文档中明确：当前没有游戏式主循环，因为项目仍处于编译器 + 工具链阶段。
- 明确未来运行时入口是 `NarrativeRuntime`；内部工具链短期继续按 `Tooling` 的共享业务模块推进，而不是预设 `InscapeProjectService` 一类总服务。
- 新增或重命名类型时，优先把层级和范围信息放进目录或命名空间，而不是继续扩张 `CliProject*`、`CliSingleFile*` 一类前导范围词。

验收标准：

- 新成员能在 10 分钟内说清“编译从哪里进、项目从哪里进、预览从哪里进”。
- 文档中不再把 Preview 临时播放器误写成正式 Runtime Host。

状态：已部分完成，见 [代码结构规划](code-structure.md) 和 [编码与命名规范](coding-conventions.md)。

### 中目标 A2：按显式职责补齐工具链应用层

小目标：

- 不预设 `InscapeProjectService`、`Workspace`、`ProjectSystem` 之类大而泛的工具链总服务。
- 继续把项目级流程从 `Cli` 上提到 `Tooling`，按 `ProjectSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 等共享业务模块拆分。
- 具体类型命名采用 ADR 0010 的目录优先主语/角色模型：范围词不是类型名前缀的默认选择，`Support` / `Helper` 一类弱语义命名应优先被拆分。
- CLI、VSCode 与未来 Language Server 逐步通过 `Tooling` + `Compiler` 复用共享流程与语义能力，而不是各自重新拼装，也不是先引入巨型门面。
- 保留 `ProjectCompiler` 作为 Compiler 编译能力，不让它承担文件系统、配置和工具编排职责。

验收标准：

- CLI 和 VSCode 不再无序拼装项目编译流程。
- 项目配置读取、override、entry override、source map / reveal payload 查询有清晰边界和命名。
- 如确实出现统一门面，也必须建立在已稳定的窄模块之上，并保持其本身足够薄。
- 现有项目级测试全部通过。

风险：

- 容易把 CLI 文件系统逻辑提前塞进 Core，或以“统一入口”为名重新做一个大杂烩服务。
- 需要谨慎拆分，避免同时改动输出格式。

建议优先级：高。

### 中目标 A3：Runtime 阶段再引入 `NarrativeRuntime`

小目标：

- 只在 Runtime Host 设计明确后创建运行时入口。
- 生命周期方法参考：`Initialize()`、`LoadGraph()`、`Start()`、`EnterNode()`、`Continue()`、`Choose()`、`ExitNode()`、`SaveState()`、`RestoreState()`、`Dispose()`。
- Runtime 只消费 IR，不解析 `.inscape` 源文本。
- Host 事件通过 dispatcher / bridge 进入 Unity 或其他宿主。

验收标准：

- 同一份 IR 能被 Preview、Unity Host 或未来独立 Runtime 消费。
- 运行时状态集中管理，可存档、可回放、可追溯 source anchor。

风险：

- 过早创建 Runtime 会反向污染当前 Core。

建议优先级：中长期。

## 大目标 B：拆解大文件，降低阅读和回归成本

目标：把当前最容易“改新功能坏旧功能”的大入口文件拆成职责明确的小模块。

### 中目标 B1：拆分测试文件

小目标：

- 保留轻量无第三方测试 runner。
- 按领域拆分测试：Core 编译、项目编译、CLI、Preview、本地化、UnitySample Adapter。
- 将断言工具和临时文件工具移到共享测试辅助文件。
- 测试名继续使用行为描述。

验收标准：

- `tests/Inscape.Tests/TestCore.cs` 不再承载全部测试实现。
- 新增测试能快速放入对应文件。
- `dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build` 继续通过。

收益：高。

风险：低。

建议优先级：最高。它最适合作为第一轮安全重构。

## 当前最高优先级（2026-05-11）

当前最高优先级已经再次收敛：先完成目录骨架可见化，再恢复各层内部的细粒度职责收口。

原因：

1. 近期多轮重构虽然完成了大量局部收口，但仓库外形仍然保留旧项目平铺、旧路径和旧 solution 边界，导致成果不可见。
2. `Compiler`、`VSCode`、`LanguageServer`、`UnityPlugin` 等长期层级仍缺乏明确目录落点。
3. `UnityPlugin` 外部支持层尚未真正退出默认 .NET solution 编译链。

执行顺序：

1. 先冻结目录规则，详见 [目录优先重构蓝图](directory-first-reframe-plan.md) 与 [ADR 0012](adr/0012-directory-first-repository-reframe-order.md)。
2. 先创建 `src/Internal`、`src/ExternalSupport`、`tests/Internal`、`tests/ExternalSupport` 以及各 Layer / Business / Role 目录，并为稳定目录补 `README.md` 规则文件。
3. 再迁 `Inscape.Core`、`Inscape.Tooling`、`Inscape.Cli`、VSCode 前端与 Unity 原型的大目录路径。
4. 再更新 `Inscape.slnx` 与 `ProjectReference`，并把 UnityPlugin 相关项目移出默认 .NET solution 编译链。
5. 只有在路径稳定后，才继续项目名、命名空间、类型名迁移，以及 Tooling / VSCode / LanguageServer 的逐层重构。

当前最明显的不符合点详见 [目录优先重构蓝图](directory-first-reframe-plan.md#当前最明显的不符合点)。

### 中目标 B2：拆分 CLI command 分发

小目标：

- 先提取配置读取、路径归一化、输出辅助等纯工具职责。
- 把每个主要命令拆成独立 command handler。
- 提取 `CommandOptions`、`CommandResult`、`OutputWriter`、`ConfigLoader`。
- 让 `CliCore.cs` 只保留参数分发、命令表和退出码处理。
- 当前散落在 `Cli` 的共享流程逐步上提到 `Tooling`，让 `Cli` 回到“宿主入口”而不是“共享业务承载层”。
- 当前平铺类型名中的范围词和弱语义词只视为过渡状态；长期优先目录化，再收敛类型名为具体主语 + 角色。
- 项目级命令逐步调用更窄的项目编排 helper，而不是回到大而泛的项目总服务。

验收标准：

- 新增 CLI 命令不需要继续扩张 `CliCore.cs` 主体。
- 命令帮助、错误码、JSON/CSV/HTML 输出保持兼容。
- CLI 测试全部通过。

当前进展：顶层元命令（`help` / `commands` / `export-host-schema-template`）、单文件命令分支和项目级命令分支都已从 `CliCore` 主入口中抽离；项目 `.inscape` 源扫描/读取/override、预览样式读取等共享流程已上提到 `Inscape.Tooling`；单文件/项目编译前置流程也已分别收回 `CliSingleFileCommand` 与 `CliProjectCommand`，不再保留独立 `CliCompiler*` 过渡 helper。当前下一步应继续把真正共享的流程上提到 `Tooling`，并把仍停留在 `Cli` 的单命令局部编排继续收紧到各自入口，而不是继续放大 `ProjectService`、`Workspace` 或 `Support` 大层。

收益：高。

风险：中。

建议优先级：高。

### 中目标 B3：拆分 VSCode extension

小目标：

- 拆出 providers：completion、definition、reference、hover、CodeLens。
- 拆出 commands：preview、localization、host schema、style、quick guide。
- 拆出 preview bridge：open/reuse preview、source reveal、preview reveal、pending reveal。
- 拆出 workspace index：节点、speaker、host binding、schema capability 的轻量索引；这是 VSCode 作者体验层的索引，不等同“Workspace”架构总层。
- 拆出 style loader / decoration controller。

验收标准：

- `src/Internal/VSCode/vscode-inscape/extension.js` 变成注册入口，而不是全部逻辑实现。
- 正文 / 选项文本链接态回归清单全部通过。
- 修改单个 provider 不应影响 preview bridge 或 style loader。

收益：最高。

风险：高。

建议优先级：高，但必须分多次小提交。

## 大目标 C：强化数据契约，减少重复推断

目标：把各层共同依赖的结构显式化，避免 CLI、VSCode、Preview、Adapter 各自猜 source location、entry、binding、reveal payload。

### 中目标 C1：统一 source map 契约

小目标：

- 明确节点、对白行、旁白、选项提示、选项项、跳转、metadata、inline tag 的 source range 表达。
- 让预览跳源码、诊断定位、Ctrl+Click 文本定位预览、本地化 anchor 回查尽量使用同一套 source map。
- 给 source map 加测试样例，覆盖中文对白、选项、metadata 和跨文件。

验收标准：

- 任意源位置可以稳定映射到 IR 对象或诊断对象。
- 任意可预览对象可以稳定跳回源码。
- 不再需要 VSCode 为正文 / 选项文本重复推断过多语义。

收益：高。

风险：中。

建议优先级：高。

### 中目标 C2：统一 preview reveal payload

小目标：

- 定义源码到预览的 reveal payload。
- 定义预览到源码的 reveal payload。
- 让 VSCode command、selection bridge、webview message 使用同一数据结构。
- 文档化字段含义与兼容策略。

验收标准：

- `Inscape: Reveal Current Selection In Preview` 与 Ctrl+Click 文本定位走同一 reveal 逻辑。
- 预览中的源码按钮与 diagnostics 跳转共用同一 source reveal 逻辑。

收益：中高。

风险：中。

建议优先级：高。

### 中目标 C3：建立 workspace index 过渡模型

小目标：

- 定义轻量索引对象：nodes、references、speakers、host bindings、metadata、schema capabilities。
- VSCode 当前扫描逻辑先收敛到 index，未来 Language Server 可替换 index 来源。
- 区分 authoring hint 与 Core 语义真相。

验收标准：

- Provider 不直接散落扫描文件。
- 补全、跳转、引用、Hover 共享索引数据。
- Language Server 设计可以直接复用该索引契约。

收益：高。

风险：中。

建议优先级：中高。

## 大目标 D：保持 Core 干净，隔离表现和宿主业务

目标：让 Core 长期保持可移植、可测试、可被 CLI、VSCode、Unity、独立编辑器共同复用。

### 中目标 D1：Core 数据/逻辑分层复查

小目标：

- 检查 `Model` 是否仍是纯数据契约。
- 检查 `Parsing` 是否只做语法识别。
- 检查 `Analysis` 是否只做验证并输出 diagnostics。
- 检查 `Localization` 是否只依赖 Core 数据和文本锚点。

验收标准：

- Core 不出现 Unity、VSCode、HTML、Bird、Addressables 依赖。
- Core 类型命名符合 `Parser` / `Validator` / `Resolver` / `Builder` / `Result` / `Options` / `Context` 规则。

收益：中。

风险：低。

建议优先级：中。

### 中目标 D2：Adapter / Host Bridge 隔离

小目标：

- 继续保持 UnitySample 作为实验 adapter，但暂不投入主动重构工时。
- 设计 Host Bridge 配置模型，解决 Inscape 可读 ID 到项目内部 ID / 资源 / 事件 / 查询实现的映射。
- 用 UnitySample 当前输出作为未来 generator 的回归样例。
- 不把 Bird、ScriptableObject、Addressables 写进 Core。

验收标准：

- Adapter 可以替换，Core 输出不变。
- Host Bridge 可以表达 UnitySample 当前能力，但不被 UnitySample 限死。

收益：高。

风险：中。

建议优先级：中高。

## 大目标 E：建立防回归工作流

目标：让“正确行为”不再依赖个人记忆，而是变成测试、手测清单、ADR 和发布流程。

### 中目标 E1：变更前写行为契约

小目标：

- 每个非平凡功能改动先写 3 到 5 条用户可观察行为。
- 标明本次改动属于 Core、CLI、VSCode、Preview、Adapter、Style 中哪一层。
- 标明不能破坏哪些旧行为。

验收标准：

- PR / 提交说明能看出改动层级和回归范围。
- 新功能不会默认跨层修改。

收益：高。

风险：低。

建议优先级：立即执行。

### 中目标 E2：固定 VSCode 交互回归清单

小目标：

- 默认无下划线。
- Ctrl+指向有链接态。
- Ctrl+Click 正文 / 选项复用预览并定位。
- speaker、`-> target`、host binding 导航不回归。
- 改扩展后重建并重装 `.vsix`。

验收标准：

- 每次 VSCode 交互改动都能按清单复测。
- 回归经验继续更新到 ADR / handoff / tooling 文档。

收益：高。

风险：低。

建议优先级：立即执行。

### 中目标 E3：重构提交拆分规则

小目标：

- 单独提交纯移动 / 重命名。
- 单独提交行为变更。
- 单独提交文档和 ADR。
- 每个提交保持测试可运行。

验收标准：

- 出现回归时，可以用 git history 快速定位是哪一层引入。
- review 时不需要同时理解重命名和业务逻辑变更。

收益：中高。

风险：低。

建议优先级：立即执行。

## 推荐执行顺序

### 第一轮：低风险、提升阅读性

1. 拆分测试文件。
2. 提取测试辅助工具。
3. 梳理 Core 入口和 source map 相关测试名。
4. 保持所有测试通过。

目标：整体可维护性从 5.5 提升到约 6.3。

### 第二轮：CLI 模块化

1. 建立 command handler 命名和目录。
2. 先迁移配置读取、路径归一化、只读命令等低风险辅助职责。
3. 再迁移 `commands` / `help` / `check` / `diagnose` / `compile`。
4. 最后迁移 preview / l10n / UnitySample 导出命令。

目标：整体可维护性提升到约 6.8。

### 第三轮：VSCode 模块化

1. 先拆 style / config loader。
2. 再拆 workspace index。
3. 再拆 providers。
4. 最后拆 preview bridge 和 reveal 流程。
5. 每一步都跑 VSCode 交互回归清单。

目标：整体可维护性提升到约 7.2。

### 第四轮：统一项目服务和定位契约

1. 明确 CLI、VSCode、Preview 共用的数据契约与组合边界。
2. 统一 compile / diagnose / l10n / index / reveal payload 调用方式。
3. 如有必要，再设计建立在窄模块之上的薄组合层，但不把它当新“真相层”。
4. 让 CLI 和 VSCode 逐步消费统一契约。

目标：整体可维护性提升到约 7.8。

### 第五轮：Host Bridge 和 Runtime 前置设计

1. 设计 Host Bridge 数据模型。
2. 用 UnitySample 验证 generator / adapter 可替换性。
3. 写 Runtime Host ADR。
4. Runtime 阶段再引入 `NarrativeRuntime`。

目标：中长期可维护性稳定在 8 到 8.5。

## 暂缓事项

以下事项不要在第一轮重构中做：

- 不要同时替换 DSL 语法。
- 不要重写 parser。
- 不要引入大型框架或第三方依赖。
- 不要把 Preview 临时播放器升级成正式 Runtime。
- 不要把 UnitySample 逻辑迁回 Core。
- 不要把 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 纳入当前主动重构范围。
- 不要在拆文件时顺手改输出格式。

## 每轮完成标准

每轮重构至少满足：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\Internal\VSCode\vscode-inscape\extension.js
```

如果涉及 VSCode 扩展行为，还必须执行扩展重建安装流程，并手动验证关键交互。

## 预期收益

- 新成员更容易找到入口。
- 用户能用游戏项目经验审查生命周期和模块边界。
- 新功能能挂到明确模块，而不是继续扩大大文件。
- 回归定位从“猜是哪层的问题”变成“按契约和边界排查”。
- Roadmap 中的 Language Server、Host Bridge、Editor Alpha、Runtime Host 都有更稳的承载结构。

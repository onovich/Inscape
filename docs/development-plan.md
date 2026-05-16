# 研发计划

状态：持续维护

最后更新：2026-05-16

本文用于把当前已经确认的架构结论转成研发顺序。它不替代 [路线图](roadmap.md)，而是把接下来 1 到 3 轮可执行工作压成具体阶段。

## 当前前提

- Internal 架构收敛为：`Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`
- ExternalSupport 当前只确认：`UnityPlugin`
- 当前 `Inscape.Compiler` 已完成项目名、命名空间与主要角色后缀收敛
- 当前 `Inscape.Cli` 已退回命令入口、参数和输出适配层，主要共享流程已上提到 `Tooling`
- 当前 `src/Internal/VSCode/vscode-inscape` 已完成 B 阶段拆分，`extension.js` 主要保留注册入口、实例装配和少量 glue
- Unity 支持长期不进入默认 .NET solution 编译链
- LanguageServer 与 Runtime 已建立 Internal 基线项目，但 VSCode 前端尚未切到 C# LanguageServer 主路径

当前研发顺序已新增一个更高优先级前置阶段：先完成目录骨架与目录规则，再恢复 Tooling、VSCode、LanguageServer 和 UnityPlugin 的细粒度重构。详见 [目录优先重构蓝图](directory-first-reframe-plan.md)。

## 阶段 -1：目录骨架与目录规则前置

目标：先让长期结构在仓库外形中可见。

状态：已完成第一轮。

具体任务：

1. 冻结目录铁律与 ADR。
2. 创建 `src/Internal`、`src/ExternalSupport`、`tests/Internal`、`tests/ExternalSupport`。
3. 创建 `Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`、`UnityPlugin` 的 Layer / Business / Role 目录。
4. 为稳定目录补 `README.md` 规则文件。
5. 迁大目录路径，更新 solution 与项目引用，并把 UnityPlugin 相关项目移出默认 .NET solution 编译链。

阶段门槛：

- 仓库外形已经能一眼看出 Internal 与 ExternalSupport。
- VSCode 与 Unity 相关长期代码不再停留在顶层 `tools/`。
- 后续所有细粒度重构都能基于新目录树进行。

## 阶段 0：文档与边界同步

目标：把架构结论固化为团队共识，避免继续在旧口径上开发。

完成标准：

- [x] 命名规则同步到 [编码与命名规范](coding-conventions.md)
- [x] Internal / ExternalSupport 边界形成 ADR
- [x] 代码结构规划同步更新
- [x] 接手文档记录最新认知结论

## 阶段 1：抽出 Tooling 中间层

目标：把当前 Cli 里的共享流程移到可复用的 Tooling。

状态：已完成第一轮。后续只在出现真实共享面时继续拆窄模块，不引入大而泛的 `ProjectService`。

优先模块：

1. `DslScriptSources`
2. `ToolConfig`
3. `Preview`
4. `Localization`
5. `HostSchema`
6. `HostBinding`

具体任务：

1. 为 `Inscape.Tooling` 建立项目壳或目录边界。
   - 当前已落地：`src/Internal/Tooling/Inscape.Tooling.csproj` 位于 Tooling 根目录，源码已按 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 的 `Domains` / `Models` 目录组织。
2. 把配置读取、项目源发现、预览样式等共享能力上提到 `Tooling`，并保持 `Cli` 仅保留参数与输出适配。
3. 把只服务单个入口的项目/单文件编译前置流程收回各自 `Command`；若未来出现真实共享面，再由 `Tooling` 统一调 `Compiler`。
4. 把预览构建、本地化导出更新、HostSchema 模板导出收束到 `Tooling`。
5. 让 `Cli` 退化成命令入口与文件输出适配层。

阶段门槛：

- `Cli` 不再拥有共享项目扫描和配置读取真相。
- 现有 CLI 命令行为保持兼容。

## 阶段 2：规划并建立 C# LanguageServer 基线

目标：让 VSCode 的重语义能力开始摆脱 CLI 进程桥接。

状态：已建立基线。当前已具备 diagnostics、definition、references、completion 的第一层 provider；下一步补 outline / hover 范围和 VSCode 前端迁移边界。

第一批能力：

1. 诊断
2. 跳转定义
3. 引用查找
4. 补全
5. 源映射查询

具体任务：

1. 创建 `Inscape.LanguageServer` 项目壳。
2. 明确前后端边界：VSCode 前端只保留 client、Webview 和轻 UI。
3. 让 LanguageServer 直接调用 `Compiler` / `Tooling`。
4. 先迁移诊断与定义跳转，再迁移引用和补全。

阶段门槛：

- VSCode 至少一项重语义能力已不再借道 CLI。
- LanguageServer 的输入输出契约被文档化。

## 阶段 3：拆分 VSCode 前端

目标：把 `extension.js` 从单文件入口拆成可维护模块。

状态：已完成 B 阶段拆分。后续重点转向 Host Schema query / event 作者体验、预览增量体验和 LanguageServer client 迁移。

目标模块：

1. `ExtensionEntry`
2. `LanguageFeatures`
3. `EditorAuthoring`
4. `PreviewWebview`
5. `LanguageServer` client

具体任务：

1. 拆 provider。
2. 拆 command。
3. 拆 preview bridge。
4. 拆 workspace index / authoring state。
5. 保持当前 Ctrl+Click 与预览定位体验不回退。

阶段门槛：

- `extension.js` 变为注册入口。
- VSCode 作者体验不回归。

## 阶段 4：固化 HostSchema / HostBinding，并规划 ExternalSupport

目标：让 Unity 支持从样例适配过渡到受控的外部支持链路。

状态：已完成非 Unity 研发与 Unity 计划准备。Unity 相关继续先做设计和计划，等方案落实后再进入代码研发。

具体任务：

1. 明确 `HostSchema` 与 `HostBinding` 的 Tooling 流程边界。
2. 把当前 UnitySample 输出视为 ExternalSupport 的过渡工件，而不是最终契约。
3. 为 `UnityPlugin` 定义输入工件、Attribute 扫描、桥接配置和资产填写流程。
4. 明确 `UnityPlugin` 的仓库内位置：`tools/` 下独立支持目录或独立 package。

阶段门槛：

- UnityPlugin 的输入输出契约明确。
- Unity 支持代码不进入默认 .NET solution 编译链。

## 阶段 5：Runtime 前置设计

目标：在不污染 Compiler 的前提下，为长期 Runtime 做准备。

状态：已建立 `NarrativeRuntime` 最小 IR 消费生命周期。后续再扩展 Host Bridge / Runtime Host，不回灌 Compiler。

具体任务：

1. 定义 `StoryRuntime`、`Input`、`Localization`、`HostBridge` 边界。
2. 明确 `TaskModel` / `ActionModel`、`Controller`、`Events` 的角色关系。
3. 先写运行时协议和状态模型，不急于实现完整 loop。

## 每阶段统一验证

每个阶段结束后至少执行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\Internal\VSCode\vscode-inscape\extension.js
```

若阶段涉及 `src/Internal/VSCode/vscode-inscape/`，额外执行：

```powershell
cd src\Internal\VSCode\vscode-inscape
npm run rebuild:vsix
```

目录迁移阶段的当前施工真相以 [目录优先重构蓝图](directory-first-reframe-plan.md) 为准。

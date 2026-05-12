# 目录优先重构蓝图

状态：冻结执行前方案

最后更新：2026-05-11

本文把 Inscape 当前已经确认的 Internal / ExternalSupport、目录优先命名、Tooling 中间层、UnityPlugin 外部支持层等结论，收束成一份真正可执行的仓库重构蓝图。

本文的目标不是再补一个“长期方向说明”，而是把后续重构顺序冻结为可检查的施工规则：

1. 先搭目录骨架。
2. 再迁大目录路径。
3. 再迁项目路径、solution 和项目引用。
4. 再迁项目名、命名空间和类型名。
5. 最后才回到每层内部的细粒度职责收口。

只要这份文档仍然有效，就不应再把主要精力继续放在旧目录里的局部 helper 收口上。

## 重构铁律

1. 目录骨架优先于类级重构。
2. 目录公式固定为 `Layer / Business / Role / File`。
3. 一级代码树只允许 `src/Internal` 与 `src/ExternalSupport` 两棵主树。
4. `tests/` 独立存在，但必须镜像 `src/` 的层级边界。
5. `tools/` 只允许放脚本、打包和开发辅助，不再承载长期产品源码。
6. Role 目录统一使用复数名：`Domains`、`Models`、`ViewModels`、`Controllers`、`Commands`、`Providers`、`Bridges`、`Entries`、`Systems`、`Contexts`、`Events`、`Factories`。
7. Git 空目录统一用 `README.md` 占位；该文件同时承担目录规则文档职责。
8. 迁移顺序固定为：目录路径 -> 项目路径 / solution -> 项目名 -> 命名空间 -> 类型名。
9. 任何新增长期源码都必须直接落在目标目录树下，不再继续堆在旧路径里。
10. `Cli` 默认不允许出现 `Domains` 目录；若出现，优先视为应上提到 `Tooling` 的信号。
11. Unity 相关长期代码只允许进入 `ExternalSupport/UnityPlugin`，不再进入默认 .NET solution 编译链。
12. 进入任一 Layer / Business 重构前，先阅读该目录的 `README.md`，再决定如何迁文件和改名。

## 当前最明显的不符合点

以下问题是当前仓库与既定架构之间最显眼、最影响“成果可见性”的差距。

| 编号 | 当前现实 | 目标结构 | 为什么现在必须先处理 |
| --- | --- | --- | --- |
| 1 | `src/` 仍是旧式平铺项目根 | `src/Internal` 与 `src/ExternalSupport` | 这是所有后续分层可见性的前提 |
| 2 | `src/Inscape.Core/` 仍是当前 Compiler 雏形 | `src/Internal/Compiler/`，后续再迁 `Inscape.Compiler` | 文档已把 Compiler 定义为真相层，但仓库外形还看不出来 |
| 3 | `src/Inscape.Tooling/` 还未进入 Internal 树 | `src/Internal/Tooling/` | Tooling 虽已落项目，但路径上还不是正式 Layer |
| 4 | `src/Inscape.Cli/` 还未进入 Internal 树 | `src/Internal/Cli/` | Cli 与 Tooling 的边界无法在路径上直接识别 |
| 5 | `src/Internal/VSCode/vscode-inscape/` 仍承载长期产品代码 | `src/Internal/VSCode/` | VSCode 目前看起来像外围工具，而不是正式 Internal 一层 |
| 6 | `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample/` 仍在默认 solution 中 | `src/ExternalSupport/UnityPlugin/`，并退出默认 .NET solution | 这直接违背 ExternalSupport 的既定边界 |
| 7 | `src/ExternalSupport/UnityPlugin/unity-bird-importer/` 仍在顶层 tools | `src/ExternalSupport/UnityPlugin/...` 或其他 ExternalSupport 子树 | Unity 外部原型仍未被收束到外部支持层 |
| 8 | `LanguageServer` 仍只存在于文档里 | `src/Internal/LanguageServer/` 空骨架先落地 | 长期方向缺乏任何可见落点 |
| 9 | `Runtime` 仍只存在于文档里 | `src/Internal/Runtime/` 空骨架先落地 | 未来阶段没有目录容器，会继续被无限推迟 |
| 10 | `tests/` 尚未镜像 Internal / ExternalSupport | `tests/Internal/...` 与 `tests/ExternalSupport/...` | 未来目录迁移会让测试组织继续滞后 |
| 11 | Layer / Business / Role 目录规则仍未落 README | 每个稳定目录都有 `README.md` 规则文件 | 没有规则文件就无法做到“先读目录规则再重构” |

## 目标目录骨架

### 代码主树

```text
src/
  Internal/
    Compiler/
    Tooling/
    Cli/
    VSCode/
    LanguageServer/
    Runtime/

  ExternalSupport/
    UnityPlugin/
```

### Compiler

```text
src/Internal/Compiler/
  README.md
  DslScript/
    README.md
    Domains/
    Models/
  StoryGraph/
    README.md
    Domains/
    Models/
  Localization/
    README.md
    Domains/
    Models/
  Diagnostics/
    README.md
    Domains/
    Models/
  TextContracts/
    README.md
    Domains/
    Models/
```

### Tooling

```text
src/Internal/Tooling/
  README.md
  ProjectSources/
    README.md
    Domains/
    Models/
  ToolConfig/
    README.md
    Domains/
    Models/
  Preview/
    README.md
    Domains/
    Controllers/
    Models/
    ViewModels/
  Localization/
    README.md
    Domains/
    Models/
    ViewModels/
  HostSchema/
    README.md
    Domains/
    Controllers/
    Models/
    ViewModels/
  HostBinding/
    README.md
    Domains/
    Controllers/
    Models/
    ViewModels/
  EditorAuthoring/
    README.md
    Domains/
    Models/
```

### Cli

```text
src/Internal/Cli/
  README.md
  Entries/
  Routing/
  DslScript/
    README.md
    Commands/
  StoryGraph/
    README.md
    Commands/
  Preview/
    README.md
    Commands/
  Localization/
    README.md
    Commands/
  HostSchema/
    README.md
    Commands/
  HostBinding/
    README.md
    Commands/
  ExternalSupport/
    README.md
    Commands/
  Models/
  ViewModels/
```

### VSCode

```text
src/Internal/VSCode/
  README.md
  ExtensionEntry/
  LanguageFeatures/
    README.md
    DslScript/
      README.md
      Providers/
    StoryGraph/
      README.md
      Providers/
    HostSchema/
      README.md
      Providers/
    HostBinding/
      README.md
      Providers/
    Metadata/
      README.md
      Providers/
  EditorAuthoring/
    README.md
    Bridges/
    Controllers/
    ViewModels/
  PreviewWebview/
    README.md
    Bridges/
    Commands/
    Controllers/
    ViewModels/
```

### LanguageServer

```text
src/Internal/LanguageServer/
  README.md
  ServerEntry/
  DslScript/
    README.md
    Providers/
    Controllers/
    Models/
  StoryGraph/
    README.md
    Providers/
    Controllers/
    Models/
  HostSchema/
    README.md
    Providers/
    Controllers/
    Models/
```

### Runtime

```text
src/Internal/Runtime/
  README.md
  StoryRuntime/
    README.md
    Systems/
    Contexts/
    Events/
    Models/
  Input/
    README.md
    Domains/
    Models/
  Localization/
    README.md
    Systems/
    Models/
  HostBridge/
    README.md
    Bridges/
    Events/
    Models/
```

### ExternalSupport / UnityPlugin

```text
src/ExternalSupport/UnityPlugin/
  README.md
  PluginEntry/
  ScriptImport/
    README.md
    Controllers/
    Models/
  AttributeScan/
    README.md
    Controllers/
    Models/
  HostBinding/
    README.md
    Controllers/
    Models/
  AssetConfigure/
    README.md
    Controllers/
    Models/
  ImportFlow/
    README.md
    Controllers/
    Events/
    Models/
```

### 测试主树

```text
tests/
  Internal/
    Compiler/
    Tooling/
    Cli/
    VSCode/
    LanguageServer/
    Runtime/
  ExternalSupport/
    UnityPlugin/
```

## 目录规则文件模板

每个稳定 Layer 和每个稳定 Business 目录，都必须放一个 `README.md`。其结构固定为：

1. 本目录职责。
2. 允许放入的子目录和文件。
3. 禁止放入的内容。
4. 命名公式与依赖边界。

Role 目录通常不单独写规则文件，除非该 Role 在当前业务中有额外边界。

## 分阶段执行计划

### 阶段 0：冻结规则文档

目标：

- 把目录优先铁律写入 `docs/` 与 ADR。
- 把“先目录、后改名”的顺序定为当前最高优先级。

完成标志：

- `docs/` 内存在一份主蓝图文档。
- 存在一条专门记录仓库重构顺序的 ADR。

### 阶段 1：创建目录骨架与 README 占位

目标：

- 先创建 `src/Internal`、`src/ExternalSupport`、`tests/Internal`、`tests/ExternalSupport`。
- 再创建各 Layer、Business、Role 目录。
- 所有空目录统一使用 `README.md` 占位。

完成标志：

- 仓库外形已经能一眼看出六层 Internal 和 UnityPlugin ExternalSupport。
- 即使尚未迁代码，也不存在“只有文档写着要有某层，仓库里却完全看不到”的情况。

### 阶段 2：迁大目录路径

目标：

- `src/Inscape.Core` 迁入 `src/Internal/Compiler`。
- `src/Inscape.Tooling` 迁入 `src/Internal/Tooling`。
- `src/Inscape.Cli` 迁入 `src/Internal/Cli`。
- `src/Internal/VSCode/vscode-inscape` 迁入 `src/Internal/VSCode`。
- `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 收束到 `src/ExternalSupport/UnityPlugin`。

规则：

- 这一阶段先只改路径，不要求同批次完成项目名和命名空间改名。

### 阶段 3：更新 solution 与项目路径引用

目标：

- 修正 `Inscape.slnx` 的项目路径。
- 修正 `ProjectReference` 的相对路径。
- 将 UnityPlugin 相关项目移出默认 .NET solution 编译链。

完成标志：

- 默认构建只覆盖 Internal 与 tests。
- ExternalSupport 不再混入主解决方案编译路径。

### 阶段 4：迁项目名

目标：

- `Inscape.Core` -> `Inscape.Compiler`
- `Inscape.Adapters.UnitySample` -> 正式 UnityPlugin 相关项目名
- 其他项目名与新 Layer 对齐

规则：

- 只有在目录路径和项目引用已经稳定后，才启动项目名迁移。

### 阶段 5：迁命名空间与类型名

目标：

- 命名空间跟随新 Layer / Business 结构对齐。
- 当前旧的 `Inscape.Core.*` 命名空间逐步退出。
- 最后再继续收敛类型名。

### 阶段 6：恢复逐层重构

目标：

- 在目录骨架稳定后，再回到各层内部的职责收口与命名清理。
- 每次只处理一个 Layer 或一个 Business。

规则：

- 每轮进入目录前先读 `README.md`。
- 若目录规则与现有代码冲突，优先调整代码，不回退目录规则。

## 每阶段统一验证

1. 目录阶段至少检查 `git diff`，确认迁移边界和 README 规则都符合计划。
2. 若涉及 solution 或项目路径，执行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
```

3. 若涉及 VSCode 前端路径或脚本迁移，额外执行：

```powershell
node --check src\Internal\VSCode\vscode-inscape\extension.js
```

或在 VSCode 正式迁入 `src/Internal/VSCode` 后，对新入口脚本执行等价检查。

## 关联文档

- [编码与命名规范](coding-conventions.md)
- [代码结构规划](code-structure.md)
- [渐进式重构计划](refactoring-plan.md)
- [研发计划](development-plan.md)
- [TODO](todo.md)
- [ADR 0010：采用目录优先的主语/角色命名模型](adr/0010-directory-first-subject-role-naming.md)
- [ADR 0011：采用 Internal / ExternalSupport 分层，并引入 Tooling 中间层](adr/0011-internal-tooling-and-external-support-boundary.md)

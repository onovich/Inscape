# UnityPlugin Package Boundary Plan

状态：计划

日期：2026-05-18

本文记录 `src/ExternalSupport/UnityPlugin` 的包边界、命名边界和 `Scripts` / `Resources` 拆分规则。当前只做准备和计划，不研发 Unity 功能。

## 当前结论

`UnityPlugin` 不是一个具体 Unity package，而是 ExternalSupport 下的 Unity 相关工作区。不要在 `src/ExternalSupport/UnityPlugin` 顶层建立通用 `Scripts` 或 `Resources`。

当前目录含义：

```text
src/ExternalSupport/UnityPlugin/
  Inscape.Adapters.UnitySample/    # .NET sample adapter, not final Unity package
  Inscape.UnitySample.Cli/         # sample adapter command-line entry
  unity-bird-importer/             # Bird Unity Editor importer prototype
```

## 模块定位

### `Inscape.Adapters.UnitySample`

定位：实验样例 adapter。

它保留从 Inscape project IR 导出 Unity/Bird 风格 manifest、CSV、L10N merge 和 host hook 的回归样例。它不是最终 Host Bridge、Runtime Host 或 Unity package。

当前不拆 `Scripts` / `Resources`，原因是它是普通 .NET sample adapter 项目，不是 Unity package。源码继续按现有业务目录组织，避免伪装成可直接投放 Unity 的包。

后续如果保留为独立样例仓库，可改名为更明确的 `UnitySampleAdapter` 或迁入样例仓库；如果被真实 Host Bridge generator 替代，应只保留必要回归 fixture。

### `Inscape.UnitySample.Cli`

定位：样例 adapter 的独立命令行入口。

它可以依赖 Internal Tooling 和 UnitySample adapter，但不进入默认 Internal solution 主路径。它不是 Unity package，也不应该拥有 Unity `Resources`。

当前不拆 `Scripts` / `Resources`，命令源码继续保持 `Entries` / `Commands`。若未来作为独立工具发布，可在自身项目根下补 `Scripts` 存放打包或迁移脚本。

### `unity-bird-importer`

定位：Bird 项目专用 Unity Editor importer 原型。

它当前不是可发布 Unity package，只是一个可复制到 Bird Unity 项目的 Editor 脚本样例。因此暂不改名、不移动源码、不补空目录。

如果后续保留并产品化，应先改成具体包根，例如：

```text
src/ExternalSupport/UnityPlugin/BirdImporter/
  package.json
  Scripts/
    Editor/
      ...
  Resources/
    ...
```

只有当该包根真实存在且需要 Unity package 交付时，才创建 `Scripts` / `Resources`。`Resources` 只放 Unity package 所需资源、模板、schema 或示例配置，不放 Inscape compiler / tooling 语义代码。

## 拆仓假设

将来可能拆成三个独立交付面：

- `Inscape.Unity`：真实 Unity package，包含 Runtime Host、Editor 工具、Attribute、生成器入口。
- `Inscape.Unity.BirdImporter`：Bird 专用 importer 包或样例包。
- `Inscape.UnitySampleAdapter`：只作为回归样例或迁移参考，不作为产品主路径。

拆仓前，本仓只维护清晰边界和验证入口，不提前制造空目录。

## 研发前置条件

进入 Unity 功能研发前，至少需要完成：

- Host Bridge query / event handler 字段草案。
- Unity Attribute 命名与扫描输出草案。
- Generated dispatcher 与 manual bridge 的合并规则。
- UnitySample 回归清单。
- Runtime Host hook phase、异步处理和 replay 策略。
- Bird importer 与 `InscapeGenerated` 资源提交策略。

## 自检规则

- 不创建 `src/ExternalSupport/UnityPlugin/Scripts`。
- 不创建 `src/ExternalSupport/UnityPlugin/Resources`。
- 不为未来规划创建空 Unity package。
- 不把 Unity / Bird 概念放进 `Inscape.Compiler`。
- 不把 UnitySample 的 `talkingId`、`roleId`、`L10N_Talking` 等字段升级为通用契约。
- 每个真实 Unity package 根如果出现 `Scripts` / `Resources`，必须有 README 说明交付形态和拆分依据。

# 0011：采用 Internal / ExternalSupport 分层，并引入 Tooling 中间层

状态：Accepted

日期：2026-05-11

## 背景

Inscape 当前已经出现三类明显不同的代码边界：

1. 编译期语义真相，例如 DSL 解析、图结构、诊断、本地化提取。
2. 共享工具流程，例如项目扫描、配置读取、预览构建、模板导出和报告生成。
3. 特定宿主入口，例如命令行、VSCode 和 Unity。

当前仓库里，部分共享工具流程暂住在 `Inscape.Cli` 中，导致 `Cli` 同时承担了入口适配和共享业务流程，边界开始变得模糊。

与此同时，Unity 支持又与 `Cli` / `VSCode` 存在本质差异：它依赖 Unity 环境、UnityEngine / UnityEditor 程序集和 Unity 的调用生命周期，不适合进入默认 .NET solution 编译链。

## 决定

1. Inscape 长期采用两大分层：
   - `Internal`
   - `ExternalSupport`
2. `Internal` 下收敛为六层：
   - `Compiler`
   - `Tooling`
   - `Cli`
   - `VSCode`
   - `LanguageServer`
   - `Runtime`
3. `Compiler` 是编译期真相层；当前 `Inscape.Compiler` 长期可向该命名收敛。
4. 新增 `Tooling` 作为中间用例层，用于承接当前 Cli 中的共享项目扫描、配置读取、预览构建、本地化、HostSchema、HostBinding 等流程。
5. `Cli` 只保留命令行入口职责：argv、stdout/stderr、退出码、命令目录与对 Tooling 的调用。
6. `VSCode` 长期采用“薄扩展前端 + C# LanguageServer”结构，减少对 Cli 进程桥接的依赖。
7. `UnityPlugin` 属于 `ExternalSupport`，不视为 Internal 五层的一员。
8. Unity 支持相关代码本体不应进入默认 .NET solution 编译链；当前仓库可以保留协议、导出工件、样例和外部导入原型。

## 原因

### 1. 共享工具流程不等于命令行入口

项目扫描、配置读取、预览构建、本地化流程和 HostSchema / HostBinding 流程，不仅被 Cli 需要，也会被 VSCode、LanguageServer 和未来外部支持复用。把它们长期放在 Cli 中，会让所有其他入口都只能借道 Cli。

### 2. VSCode 需要比 CLI 更稳定的语义桥接

VSCode 前端继续直接桥接 CLI 进程虽然能工作，但长期会限制诊断、补全和 source map 等语义能力的演进。引入 C# LanguageServer 可以直接复用 Compiler / Tooling，而不必在扩展前端或 CLI 中重复承载语义逻辑。

### 3. Unity 支持的编译环境天然不同

UnityPlugin 由 Unity 环境加载和驱动，依赖 UnityEngine / UnityEditor 程序集与 Unity 的生命周期。它与 Cli、VSCode 这种内部工具入口不同，更适合作为 ExternalSupport 保持隔离。

## 影响

正面影响：

- `Compiler` 与宿主 API 的边界更清晰。
- `Tooling` 让共享工具流程有稳定落点，不再滥留在 `Cli`。
- VSCode 可以沿着 LanguageServer 方向演进。
- Unity 支持不再被迫适配默认 .NET solution 编译链。

代价与边界：

- 短期内 `Inscape.Cli` 仍会继续混合承载一部分 Tooling 逻辑，属于过渡状态。
- 当前 `UnitySample` / `unity-bird-importer` 仍以样例和原型形式保留在仓库内，不会立即拆仓。

## 验证清单

1. 新增共享工具流程时，先判断它是否应落到 `Tooling`，而不是直接放进 `Cli`。
2. 新增 VSCode 重语义能力时，优先评估是否应进入 `LanguageServer`。
3. 新增 Unity 相关代码时，优先放到 `ExternalSupport/UnityPlugin`，避免进入默认 .NET solution 编译链。
4. `Compiler` 中不得出现 Unity、VSCode、命令行和 HTML 宿主依赖。

## 关联文件

- [docs/code-structure.md](../code-structure.md)
- [docs/coding-conventions.md](../coding-conventions.md)
- [docs/refactoring-plan.md](../refactoring-plan.md)
- [docs/todo.md](../todo.md)
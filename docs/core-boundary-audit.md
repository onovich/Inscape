# Core Boundary Audit

状态：执行中

最后更新：2026-05-15

本文记录大目标 D 的 Core / Compiler 边界巡检结果。它不是替代 [编码与命名规范](coding-conventions.md) 或 [渐进式重构计划](refactoring-plan.md)，而是每轮 D 阶段自检的留痕。

## D1.1 Compiler 依赖巡检

日期：2026-05-15

范围：

- `src/Internal/Compiler`
- `src/Internal/Compiler/Inscape.Compiler.csproj`
- `tests/Internal/Inscape.Tests/Compiler`

对照规则：

- Compiler 是编译期真相层，只承载 `DslScript`、`StoryGraph`、`Localization`、`Diagnostics` 与 `TextContracts`。
- Compiler 不依赖 Unity、VSCode、HTML rendering、CLI presentation、Bird、Addressables、ExternalSupport 或第三方宿主包。
- Internal / ExternalSupport 边界由目录表达；Compiler 命名空间保持适度粗粒度，不追求按目录继续细拆。

检查命令：

```powershell
rg -n "Unity|UnityEngine|UnityEditor|VSCode|vscode|Html|HTML|WebView|Bird|Addressable|Addressables|ScriptableObject|ExternalSupport|UnitySample|Inscape\.Cli|Inscape\.Tooling|Inscape\.LanguageServer|Inscape\.Runtime" src\Internal\Compiler tests\Internal\Inscape.Tests\Compiler
Get-Content -Raw src\Internal\Compiler\Inscape.Compiler.csproj
```

结果：

- `src/Internal/Compiler/Inscape.Compiler.csproj` 只有 `netstandard2.1` 与 nullable 设置，没有 `ProjectReference` 或第三方 `PackageReference`。
- `src/Internal/Compiler` 源码内没有 Unity、VSCode、HTML、Bird、Addressables、ExternalSupport、Tooling、Cli、LanguageServer 或 Runtime 依赖。
- 禁止词命中只来自目录 README 中的边界说明，以及 `tests/Internal/Inscape.Tests/Compiler/TestCoreCompilation.cs` 中的测试聚合 alias `using CliCore = Inscape.Cli.CliCore;`。该 alias 位于测试项目，不进入 Compiler 产物；后续测试拆分时可单独把 runner 入口依赖从 Compiler 测试文件中移走。

自检结论：

- D1.1 通过。Compiler 本体仍保持可移植、无宿主依赖、无默认外部支持污染。
- 暂不做代码改动，避免把测试组织整理混入依赖巡检提交。

## D1.2 Compiler 角色目录与命名自检

日期：2026-05-15

范围：

- `src/Internal/Compiler/DslScript`
- `src/Internal/Compiler/StoryGraph`
- `src/Internal/Compiler/Localization`
- `src/Internal/Compiler/Diagnostics`
- `src/Internal/Compiler/TextContracts`
- `src/Internal/Compiler/Entries`

对照规则：

- 目录表达 `Layer / Business / Role`，命名空间保持适度粗粒度。
- Compiler 允许主语为 `DslScript`、`StoryGraph`、`Localization`、`Diagnostics`、`TextContracts`。
- Compiler 类型终局后缀以 `Domain`、`Model` 为主；入口薄门面可使用 `Entry`。
- `Parser`、`Compiler`、`Validator`、`Resolver`、`Builder` 等动词角色应作为 `Domain` 前的动作限定，不单独作为终局后缀。
- 不保留 `Support`、`Helper`、`Manager`、`Utils`、`InscapeCore`、`InscapeParser`、`InscapeCompiler`、`ProjectCompiler` 等旧阶段命名。

检查命令：

```powershell
rg -n "namespace Inscape\.Compiler\.(Model|Parsing|Analysis|Compilation|Localization|Diagnostics|Text)|class .*Domain|class .*Model|enum .*Model|class .*Entry" src\Internal\Compiler
rg -n "\b(Helper|Support|Manager|Utils|ProjectService|Workspace|InscapeCore|InscapeParser|InscapeCompiler|ProjectCompiler|GraphValidator|AnchorValidator)\b" src\Internal\Compiler
```

结果：

- `DslScript`、`StoryGraph`、`Localization`、`Diagnostics`、`TextContracts` 均只承载 `Domains` / `Models` 角色目录；`Entries/CompilerEntry.cs` 是 Compiler 薄入口。
- 类型名已按 `DslScript*Domain`、`StoryGraph*Domain`、`Localization*Domain`、`*Model` 和 `CompilerEntry` 收敛。
- 命名空间当前保持在 `Inscape.Compiler.Model`、`Inscape.Compiler.Parsing`、`Inscape.Compiler.Analysis`、`Inscape.Compiler.Compilation`、`Inscape.Compiler.Localization`、`Inscape.Compiler.Diagnostics` 与 `Inscape.Compiler.Text` 这一级，没有继续按目录过细拆分。
- 弱语义和旧阶段命名未在 Compiler 本体命中。
- 已修正过期文档口径：Compiler 项目文件实际位于 `src/Internal/Compiler/Inscape.Compiler.csproj`，不再写成 `src/Internal/Compiler/Inscape.Compiler/` 子目录；`extension.js` 已完成 B 阶段拆分，不再描述为“尚未真正拆入目录”。

自检结论：

- D1.2 通过。Compiler 当前结构符合“目录表达层级与业务、类型表达主语与角色、命名空间适度粗粒度”的规范。


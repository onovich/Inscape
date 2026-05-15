# ExternalSupport Boundary Audit

状态：执行中

最后更新：2026-05-15

本文记录大目标 D 的 ExternalSupport / UnityPlugin 隔离巡检结果。核心原则是：Internal 可以提供 Compiler、Tooling、LanguageServer、Runtime 等通用能力；ExternalSupport 可以依赖 Internal，但 Internal 不应反向依赖 ExternalSupport 或宿主项目。

## D2.1 ExternalSupport 隔离自检

日期：2026-05-15

范围：

- `Inscape.slnx`
- `src/Internal`
- `tests/Internal`
- `src/ExternalSupport/UnityPlugin`
- `tests/ExternalSupport/UnityPlugin`

对照规则：

- 默认 solution 只构建 Internal 项目和 Internal 测试。
- UnitySample / importer 位于 `src/ExternalSupport/UnityPlugin`，回归测试位于 `tests/ExternalSupport/UnityPlugin`。
- ExternalSupport 可以引用 Internal 的 Compiler / Tooling，但 Internal 不引用 ExternalSupport。
- Unity、Bird、Addressables、ScriptableObject 等宿主词不得进入 Compiler；在 Tooling / VSCode 中若因兼容现有样例配置而出现，应视为 Host Bridge 收敛前的过渡点，而不是新的 Internal 业务边界。

检查命令：

```powershell
Get-Content -Raw Inscape.slnx
rg -n "UnitySample|Inscape\.Adapters\.UnitySample|Inscape\.UnitySample|unity-bird-importer|ExternalSupport|UnityPlugin|Bird|Addressables|UnityEngine|UnityEditor" src\Internal tests\Internal Inscape.slnx
rg -n "ProjectReference|Inscape\.Adapters\.UnitySample|Inscape\.UnitySample|UnityEngine|UnityEditor|Addressables|ScriptableObject|Bird" src\ExternalSupport tests\ExternalSupport
rg -n "ProjectReference|PackageReference" src\Internal tests\Internal
```

结果：

- `Inscape.slnx` 只包含 `src/Internal/{Compiler,Tooling,Cli,LanguageServer,Runtime}` 与 `tests/Internal/Inscape.Tests`，不包含 ExternalSupport 项目。
- Internal 项目引用方向保持单向：Cli / Tooling / LanguageServer / Runtime 只引用 Internal 项目，未引用 `Inscape.Adapters.UnitySample` 或 `Inscape.UnitySample.Cli`。
- ExternalSupport 项目引用 Internal Compiler / Tooling，并在自己的 CLI / tests 中引用 UnitySample adapter；这是允许方向。
- Unity / Bird / Addressables / UnityEditor / UnityEngine 命中都位于 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 或 ExternalSupport README。
- Internal 中仍有兼容残留：
  - `ToolConfigModel.UnitySample` 与对应路径归一化仍用于现有样例配置。
  - VSCode speaker / host binding hover 文案仍显示 `UnitySample roleId` / `UnitySample binding map`。
  - Internal CLI 测试显式确认不列出 UnitySample 命令。
- `src/Internal/Cli/README.md` 曾把 `ExternalSupport` 写入允许业务区域；本轮已移除，避免把外部支持误认为 Internal CLI 业务主语。

自检结论：

- D2.1 通过。ExternalSupport 没有进入默认 solution，也没有被 Internal 项目反向引用。
- `ToolConfigModel.UnitySample` 与 VSCode 文案是 D2.2 Host Bridge 契约前的兼容残留，后续应被通用 host bridge / binding config 命名逐步替换。


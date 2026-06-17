# SelfHostedEditor P2.5 Baseline Audit

日期：2026-06-17

状态：P2.5 Round 1 完成

## 目标

本轮只建立 Host Schema / Host Bridge 与 Unity-Bird 适配收口的基线，不做真实 Bird Import，不修改 Bird 正式资源，不进入 P3 语法或 Runtime 设计。

P2.5 的入口条件已经满足：`docs/self-hosted-editor-p2-final-validation-report.md` 记录 `P2 stable identity / localization review: PASS`，并允许 Post-P2 host integration work 进入后续阶段。本轮不重做 P2，只确认 P2 的 stable identity / localization review 语义没有被改写。

## 当前边界结论

- Host Schema 仍只描述 query / event / speaker / timeline 等能力清单。它可以帮助作者知道“能引用什么”，但不承载 Bird `talkingId`、`birdId`、Unity GUID、Addressables key 或 asset path 等项目内部坐标。
- Host Bridge 仍是 Inscape 可读 ID 到宿主 ID、资源、handler、query implementation 的映射层。Bridge 可以保存宿主自由对象，但这些字段不得升级为 Compiler 通用概念。
- Unity / Bird 相关实现仍位于 `src/ExternalSupport/UnityPlugin` 或外部 Bird 项目；`src/Internal/Tooling/HostBinding` 只保留通用扫描 / capability / binding 读写能力，并在 README 中明确不得硬编码 UnitySample、Bird、ScriptableObject 或 Addressables。
- Bird `talkingId/index` 与 `L10N_Talking.csv` 是 Bird adapter 输出坐标，不替代 Inscape line id / stable node id / localization CSV contract。
- Timeline 当前仍是外部演出资源引用 / 宿主事件示例。Bird Importer 只应把 `talking.exit` 映射为 `TalkingEffectTM.PlayTimeline`；其他 phase 必须在 dry run 报 warning，不静默映射。
- UnityPlugin 仍是 ExternalSupport 下的 Unity 工作区，不是通用 Unity package；真实 package 确定前不创建顶层 `Scripts` / `Resources`。

## Bird / Unity 环境

- Bird 项目路径：`D:\UnityProjects\Bird`，可用。
- Unity Editor：`D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe`，可用。
- Bird 仓库状态：`main...origin/main`，当前已有两处非 Inscape 试跑引入的字体 fallback 资产修改：
  - `Assets/Plugins/UnityPlugin/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF - Fallback.asset`
  - `Assets/Resources_Runtime/Font/LiberationSans SDF - Fallback.asset`
- Bird 当前没有 `Assets/Editor/InscapeBirdManifestImporter.cs`，也没有 `Assets/Resources_Runtime/Talking/InscapeGenerated/`。后续真实 dry run 若需要 importer，应采用临时复制并在结束后清理，避免把试跑产物与 Bird 现有改动混在一起。

## 代码边界审计

`rg -n "UnityEngine|UnityEditor|Bird\.|Addressables" src\Internal` 只命中 `src/Internal/Tooling/HostBinding/README.md` 的禁止说明，没有命中 Internal 生产代码。

`docs/host-schema.md` 中保留 Bird binding CSV 示例是 Host Bridge/Bird adapter 说明，不是将映射字段塞回 Host Schema 运行时契约。后续如继续改文档，需要保持“Schema 描述能力，Bridge 承担映射”的表达。

## P2.5 差距清单

1. 尚未形成 Bird importer、`.meta`、`InscapeGenerated`、Addressables 修改和 dry-run report 的提交策略。
2. 当前旧 `artifacts/bird-trial` dry run 报告没有 Timeline hook；主样例虽已有 `@timeline.talking.exit court_intro`，但旧 binding map 为空，需要重新生成或补齐真实 Bird Timeline 绑定。
3. 尚未在真实 Bird Unity 项目中复跑带 Timeline hook 的 batchmode Dry Run，因此 `TalkingEffectTM.PlayTimeline` 落地与 unsupported phase warning 仍未完成本轮证据。
4. Bird `L10N_Talking.csv` 真实格式还需要和 adapter 输出、Inscape localization CSV contract 做一次明确决策记录。
5. Host Bridge / ExternalSupport 边界已有文档基础，但 P2.5 结束前还需要最终同步 handoff / TODO / Host-Unity 文档口径。

## Round 1 验证

本轮建议矩阵：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding
git diff --check
```

结果：PASS。

## 下一轮

进入 Round 2：输出 Bird 提交策略与试跑边界，明确 dry-run-only、真实 Import 需确认、Addressables 显式开关和临时 importer 清理策略。

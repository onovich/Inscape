# SelfHostedEditor P2.5 Boundary Closure Audit

日期：2026-06-17

状态：P2.5 Round 6 完成

## 目标

本轮收口 Host Schema / Host Bridge / Unity-Bird 的边界口径，确认 P2.5 已完成低风险验证与决策，不进入 P3，也不启动通用 Unity package 产品化。

## 当前结论

- Host Schema 仍只描述能力清单，例如 query、event、speaker、timeline capability。它不承载 Unity GUID、asset path、Addressables key、Bird `talkingId` 或 `birdId`。
- Host Bridge 仍是映射层，负责把 Inscape 可读 ID 映射到宿主 ID、资源、handler、query implementation 和 adapter 所需坐标。
- Bird / Unity 适配继续留在 `src/ExternalSupport/UnityPlugin` 或外部 Bird 项目。`src/Internal` 没有引入 Unity / Bird 依赖。
- 当前可执行导出入口是 ExternalSupport 的 `export-unity-sample-*`；历史 `export-bird-*` 只保留为早期原型语境。
- Bird importer 已适配当前 Bird API：`TalkingSO.TalkingId` / `TimelineSO.TimelineId` 文件名解析属性、`RoleSO` 引用、`TalkingOptionTM` 不保存选项文本。
- Bird L10N 差异只进入 adapter / merge 层；通用 Inscape localization CSV 仍以 `anchor` 为核心。

## 本轮同步内容

- `docs/unity-editor-importer.md`：更新当前 importer 输入、Bird API 映射、P2.5 dry-run 记录和 batchmode manifest 路径。
- `src/ExternalSupport/UnityPlugin/unity-bird-importer/README.md`：更新当前可执行导出入口、Timeline ID 解析和选项文本边界。
- `docs/cli-command-reference.md`：将 Unity / Bird importer 参考命令从历史 Internal `export-bird-*` 改为 ExternalSupport `export-unity-sample-*`，并标明 P2.5 不执行真实 Import / Addressables。
- `docs/bird-adapter.md` 与 `docs/runtime-unity.md`：加 P2.5 更新说明，避免把早期 `export-bird-*` 当作当前主路径。
- `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`：将 choice option 审校映射从旧 `TalkingOptionTM.optionText` 改为 `L10N_TalkingOption.pending`，反映当前 Bird API。

## Debug 自检

- Round 4 已完成真实 Bird Unity batchmode Dry Run；`talking.exit` RESOLVE 到真实 TimelineSO，3 个 unsupported phase 明确 warning。
- Round 5 已跑 L10N merge preview，未改 Bird 正式 L10N。
- 本轮未再次写 Bird 项目；Bird 工作树仍只有进入前已有的两处字体 fallback 资产改动。
- 代码修复只在 ExternalSupport Unity/Bird adapter，未触碰 Compiler / Runtime / Host Schema 语义。

## 架构自检

命令：

```powershell
rg -n "UnityEngine|UnityEditor|Bird\.|Addressables" src\Internal
rg -n "Host Schema.*assetPath|Host Schema.*birdId|Host Schema.*unityGuid" docs src\Internal
```

结果：

- Internal grep 只命中 `src/Internal/Tooling/HostBinding/README.md` 的禁止说明。
- Host Schema grep 只命中文档中的禁止 / 边界说明，没有把资源坐标写入 Host Schema contract。

## 验证

本轮验证通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj
dotnet build src\ExternalSupport\UnityPlugin\Inscape.Adapters.UnitySample\Inscape.Adapters.UnitySample.csproj
dotnet build src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
git diff --check
```

## 剩余风险

- Bird adapter 尚未真正输出 `L10N_TalkingOption.csv`；目前只在 anchor map 中标记 `L10N_TalkingOption.pending`。
- Adapter 输出的 `L10N_Talking.csv` 仍未按 Bird 当前 `ID,Desc,ZH_CN,EN_US` 完整产品化。
- P2.5 不提交 Bird importer 或生成资源到 Bird 仓库；后续如果真实采用，需要单独 Bird-side PR / 提交策略。

这些风险不阻塞 P2.5，因为 P2.5 目标是验证与决策收口，不是通用 Unity package 或完整 Bird adapter 产品化。

## 下一轮

进入 Round 8 风格最终验证与收口：跑完整验证矩阵，更新 handoff / TODO，给出 P2.5 PASS/FAIL 与 P3 entry allowed。

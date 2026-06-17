# SelfHostedEditor P2.5 Bird Commit Strategy

日期：2026-06-17

状态：P2.5 Round 2 完成

## 目标

本轮决定 Bird importer、`.meta`、`InscapeGenerated` 资源、Addressables 修改、L10N 与 dry-run report 的提交和试跑边界。本轮不执行真实 Import，不修改 Bird Addressables，不覆盖 Bird 正式 L10N。

## 当前 Bird 仓库状态

`D:\UnityProjects\Bird` 可访问，Unity Editor `D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe` 可访问。

Bird 当前工作树并非干净，但现有改动不是本轮产生：

```text
 M Assets/Plugins/UnityPlugin/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF - Fallback.asset
 M Assets/Resources_Runtime/Font/LiberationSans SDF - Fallback.asset
```

当前 Bird 工作树没有：

- `Assets/Editor/InscapeBirdManifestImporter.cs`
- `Assets/Editor/InscapeBirdManifestImporter.cs.meta`
- `Assets/Resources_Runtime/Talking/InscapeGenerated/`
- `Assets/Resources_Runtime/Talking/InscapeGenerated.meta`

因此后续 Dry Run 如果需要 Unity 编译 importer，应把 Inscape 仓库内的 importer 临时复制到 Bird `Assets/Editor/`，跑完后删除该临时文件及 Unity 生成的 `.meta`，并确认 Bird git status 回到本轮进入时的两处字体改动。

## 提交策略

### Inscape 仓库

- 保留 `src/ExternalSupport/UnityPlugin/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs` 作为 Bird-specific Editor Importer 原型源码。
- `artifacts/bird-trial/**` 继续作为 ignored 本地试跑产物，不纳入提交。
- P2.5 只把 dry-run 结论写入 docs，不提交 Unity log、dry-run report 或 generated asset。

### Bird 仓库

- P2.5 Dry Run 阶段不向 Bird 仓库提交任何文件。
- `Assets/Editor/InscapeBirdManifestImporter.cs` 只有在 Bird 项目明确采用 Inscape importer 时才允许提交；提交时必须与 `.meta` 同一 changeset，并且说明它是 Bird-specific adapter，不是通用 Unity package。
- `Assets/Resources_Runtime/Talking/InscapeGenerated/` 只有在真实 Import 被人工确认后才允许生成并提交；提交应单独成组，便于审查 TalkingSO 数量、`talkingId` 范围、`nextTalking` 和 effects。
- Addressables 修改不得和 importer 或 TalkingSO 生成资源混在一起。只有显式使用 `-inscapeApplyAddressables` 且完成风险记录后，才允许提交 `TM_Talking.asset` 等 Addressables 变更。
- Bird 正式 `L10N_Talking.csv` 不由 P2.5 自动覆盖；只允许运行 merge preview，把输出和 report 留在 Inscape ignored artifacts 或另行审查。
- Bird 当前两处字体 fallback 资产改动视为预存外部状态，本阶段不回滚、不提交、不纳入 Inscape P2.5 结论。

## Dry Run 操作边界

允许：

- 生成 / 覆盖 Inscape ignored `artifacts/bird-trial/**`。
- 从 Inscape 仓库临时复制 importer 到 Bird `Assets/Editor/`。
- 执行 Unity batchmode `DryRunImportManifestFromCommandLine`。
- 读取 Bird Timeline / Talking / L10N 资源以完成 dry-run 计划和格式评估。
- 在 dry run 后清理本轮创建的临时 importer 与 `.meta`。

不允许：

- 调用 `ImportManifestFromCommandLine` 做真实 Import，除非用户另行确认。
- 使用 `-inscapeApplyAddressables`，除非用户另行确认。
- 覆盖或合并 Bird 正式 `L10N_Talking.csv`。
- 回滚 Bird 既有字体 fallback 资产改动。
- 把 Bird `talkingId`、TimelineSO、Addressables 或 `L10N_Talking.csv` 字段升级为 Inscape 通用 contract。

## Dry Run 前后自检

Dry Run 前：

```powershell
git -C D:\UnityProjects\Bird status --short --branch
Test-Path D:\UnityProjects\Bird\Assets\Editor\InscapeBirdManifestImporter.cs
Test-Path D:\UnityProjects\Bird\Assets\Resources_Runtime\Talking\InscapeGenerated
```

Dry Run 后：

```powershell
git -C D:\UnityProjects\Bird status --short --branch
git -C D:\UnityProjects\Bird status --short --untracked-files=all -- Assets/Editor Assets/Resources_Runtime/Talking/InscapeGenerated Assets/Plugins/UnityPlugin/AddressableAssetsData/AssetGroups/TM_Talking.asset Assets/Resources_Runtime/Localization/L10N_Talking.csv
```

验收结论应满足：

- 除进入前已有字体 fallback 资产改动外，Bird 工作树不留下 P2.5 临时文件。
- Dry Run report 位于 Inscape ignored artifacts 下，并由 P2.5 文档摘要留痕。
- 若 Unity 因缺少 importer 无法执行，本阶段只允许临时复制 importer，不改 Inscape Internal 或 Host Schema。

## 下一轮

进入 Round 3：重新生成带真实 Timeline 绑定的 Bird manifest。优先使用 `samples/court-loop.inscape` 里的 `@timeline.talking.exit court_intro`，如果 Bird 当前 Timeline 资源无法自动匹配该 alias，则在 ignored `artifacts/bird-trial/bird-bindings.csv` 中记录人工确认的最小绑定，不修改主样例。

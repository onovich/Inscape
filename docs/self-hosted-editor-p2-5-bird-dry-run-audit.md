# SelfHostedEditor P2.5 Bird Dry Run Audit

日期：2026-06-17

状态：P2.5 Round 4 完成

## 目标

本轮在真实 Bird Unity 项目中执行 batchmode Dry Run，验证真实 Timeline 绑定链路：

- `talking.exit` 可以解析到真实 `TimelineSO`，并会在真实 Import 时生成 `TalkingEffectTM.PlayTimeline`。
- `node.enter`、`talking.enter`、`node.exit` 明确输出 `UNSUPPORTED_PHASE` warning，不静默映射。
- Dry Run 不写 Bird `.asset`、Addressables 或正式 L10N。

## 输入

Bird / Unity 环境：

```text
Bird: D:\UnityProjects\Bird
Unity: D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe
```

Manifest：

```text
D:\LabProjects\Inscape\artifacts\bird-trial\phase-export\bird-manifest-p2-5-phases.json
```

该 manifest 来自 ignored phase fixture，包含 4 个 Timeline hook，并全部绑定到 Bird 真实 Timeline：

```text
Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset
GUID: b07842ff2fa161e459e024dc1a9fae7f
```

## Importer 修复

首次复制旧 importer 到当前 Bird 项目后，Unity 编译失败。原因是 Bird 当前 API 已迁移：

- `TalkingSO.TalkingId` / `TimelineSO.TimelineId` 从 ScriptableObject 文件名解析 ID。
- `TalkingTM` 不再包含 `talkingId`、`roleId`、`textAnchorIndex`、`textVerticalAlignment`、`textHorizontalAlignment`。
- `TalkingOptionTM` 不再包含 `optionText`；选项文本应继续留在 L10N / manifest 审查链路。

本轮只修 `src/ExternalSupport/UnityPlugin/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs`，让 Bird-specific importer 适配当前 Bird API；未修改 `Internal`、Host Schema 或通用 localization contract。

## Dry Run 命令

本轮按 Round 2 策略临时复制 importer 到 Bird：

```text
D:\UnityProjects\Bird\Assets\Editor\InscapeBirdManifestImporter.cs
```

然后执行：

```powershell
& "D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "D:\UnityProjects\Bird" `
  -executeMethod Inscape.Unity.BirdImporter.InscapeBirdManifestImporter.DryRunImportManifestFromCommandLine `
  -inscapeManifest "D:\LabProjects\Inscape\artifacts\bird-trial\phase-export\bird-manifest-p2-5-phases.json" `
  -inscapeOutputFolder "Assets\Resources_Runtime\Talking\InscapeGenerated" `
  -logFile "D:\LabProjects\Inscape\artifacts\bird-trial\unity-dry-run-p2-5-phases-fixed-rerun.log"
```

Unity 第一次启动会导入临时 Editor 脚本，不生成 report；复跑后执行 importer 方法并成功生成：

```text
D:\LabProjects\Inscape\artifacts\bird-trial\phase-export\bird-import-dry-run-report.txt
```

## 结果

Dry Run report 关键摘要：

```text
create TalkingSO: 4
update TalkingSO: 0
timeline hooks: 4
unresolved timeline hooks: 0
unsupported timeline hook phases: 3
warnings: 3
```

Timeline hook plan：

```text
UNSUPPORTED_PHASE court_intro -> talkingId 100000 phase=node.enter
RESOLVE court_intro -> Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset -> talkingId 100000 phase=talking.exit
UNSUPPORTED_PHASE court_intro -> talkingId 100002 phase=talking.enter
UNSUPPORTED_PHASE court_intro -> talkingId 100003 phase=node.exit
```

验收结论：

- `talking.exit` 已解析到真实 Bird `TimelineSO`。Importer 的真实 Import 路径会为 supported phase 创建 `TalkingEffectTM { type = TalkingEffectType.PlayTimeline, timelines = [timelineSO] }`。
- 其他三个 phase 均输出明确 `UNSUPPORTED_PHASE` warning，不会生成 Bird effect。
- `unresolved timeline hooks: 0`，说明 GUID / asset path 绑定可用。

## 写盘自检

Dry Run 前后检查：

- `Assets/Resources_Runtime/Talking/InscapeGenerated` 不存在，Dry Run 没有创建 TalkingSO。
- `Assets/Plugins/UnityPlugin/AddressableAssetsData/AssetGroups/TM_Talking.asset` 未出现本轮 diff。
- `Assets/Resources_Runtime/Localization/L10N_Talking.csv` 未出现本轮 diff。
- 临时 `Assets/Editor/InscapeBirdManifestImporter.cs`、`.meta` 和 `Assets/Editor.meta` 已删除。

清理后 Bird 仓库仍只有进入 P2.5 前已有的两处字体 fallback 资产改动：

```text
 M Assets/Plugins/UnityPlugin/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF - Fallback.asset
 M Assets/Resources_Runtime/Font/LiberationSans SDF - Fallback.asset
```

## Debug 自检

- 最小 phase fixture 先跑通，再跑真实 Bird Unity batchmode。
- 旧 importer 编译失败后，已定位为 Bird API 演化，不修改 Core；修复位于 ExternalSupport Bird importer。
- Timeline 解析问题优先检查 binding map / manifest / Unity GUID，本轮没有改 Compiler。
- Dry Run 没有 `.asset`、Addressables 或 L10N 写盘。

## 架构自检

- `Inscape.Compiler` 与 `src/Internal` 未引入 Unity / Bird 依赖。
- Bird API 演化由 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 吸收。
- Host Schema 仍不承载 Unity GUID / asset path；资源坐标只存在于 ignored trial artifact 和 adapter manifest。
- Bird L10N 与 Inscape localization CSV 仍分离；本轮未覆盖、合并或修改 Bird 正式 L10N。
- 未进入 P3 语法、Runtime、Time Travel、热重载或通用 Unity package 产品化。

## 下一轮

进入 Round 5：评估 Bird `L10N_Talking.csv` 真实格式、phase fixture / UnitySample 输出和 Inscape localization CSV contract 的关系，默认保持 Bird L10N 只影响 adapter / merge 策略，不改变通用 localization CSV。

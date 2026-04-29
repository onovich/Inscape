# Unity Bird Importer Prototype

状态：原型草案

本目录提供一个可复制到 Bird Unity 项目的 Editor Importer 原型。它读取 `export-bird-project` 生成的 `bird-manifest.json`，创建或更新 Bird `TalkingSO` 资源，并把 Timeline Hook 转换为 `TalkingEffectTM.PlayTimeline`。

## 安装方式

把 `Editor/InscapeBirdManifestImporter.cs` 复制到 Bird 项目的任意 `Editor/` 目录，例如：

```text
D:\UnityProjects\Bird\Assets\Editor\InscapeBirdManifestImporter.cs
```

Bird 当前工程已经引用 `Newtonsoft.Json`。如果目标 Unity 项目没有该包，需要先安装 `com.unity.nuget.newtonsoft-json`。

## 使用方式

1. 先在 Inscape 仓库导出 Bird 数据：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-binding-map config\bird-bindings.csv -o artifacts\bird-export
```

2. 回到 Unity，点击菜单：

```text
Inscape > Bird > Dry Run Import Manifest...
Inscape > Bird > Import Manifest...
Inscape > Bird > Import Manifest And Apply Addressables...
```

3. 先执行 `Dry Run Import Manifest...`，选择 `artifacts\bird-export\bird-manifest.json`。
4. 选择生成 `TalkingSO` 的 Unity 目录，例如：

```text
Assets/Resources_Runtime/Talking/InscapeGenerated
```

5. 在 Unity Console 查看将创建、更新和缺失引用的计划；Dry Run 也会在 manifest 同目录写入 `bird-import-dry-run-report.txt`。
6. 计划确认后再执行 `Import Manifest...`。

也可以用 Unity batchmode 执行 Dry Run，便于之后接入 CI 或本地脚本：

```powershell
& "D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "D:\UnityProjects\Bird" `
  -executeMethod Inscape.Unity.BirdImporter.InscapeBirdManifestImporter.DryRunImportManifestFromCommandLine `
  -inscapeManifest "D:\LabProjects\Inscape\artifacts\bird-trial\export\bird-manifest.json" `
  -inscapeOutputFolder "Assets/Resources_Runtime/Talking/InscapeGenerated" `
  -logFile "D:\LabProjects\Inscape\artifacts\bird-trial\unity-dry-run.log"
```

确认 Dry Run 报告后，也可以用 batchmode 执行真实 Import：

```powershell
& "D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "D:\UnityProjects\Bird" `
  -executeMethod Inscape.Unity.BirdImporter.InscapeBirdManifestImporter.ImportManifestFromCommandLine `
  -inscapeManifest "D:\LabProjects\Inscape\artifacts\bird-trial\export\bird-manifest.json" `
  -inscapeOutputFolder "Assets/Resources_Runtime/Talking/InscapeGenerated" `
  -logFile "D:\LabProjects\Inscape\artifacts\bird-trial\unity-import.log"
```

如果需要在导入后立刻把生成的 `TalkingSO` 加入 Bird 的 `TM_Talking` Addressables group / label，可以增加显式开关：

```powershell
& "D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "D:\UnityProjects\Bird" `
  -executeMethod Inscape.Unity.BirdImporter.InscapeBirdManifestImporter.ImportManifestFromCommandLine `
  -inscapeManifest "D:\LabProjects\Inscape\artifacts\bird-trial\export\bird-manifest.json" `
  -inscapeOutputFolder "Assets/Resources_Runtime/Talking/InscapeGenerated" `
  -inscapeApplyAddressables `
  -logFile "D:\LabProjects\Inscape\artifacts\bird-trial\unity-import-aa.log"
```

## 当前行为

- 通过 manifest 的 `talkings` 创建或更新 `TalkingSO`。
- 通过 `nextTalkingId` 串联 `TalkingTM.nextTalking`。
- 通过 `options[].nextTalkingId` 生成 `TalkingOptionTM`。
- 通过 `hostHooks` 中的 `kind=timeline` 生成 `TalkingEffectTM.PlayTimeline`。
- Timeline 资源优先按 `unityGuid` 查找，其次按 `assetPath`，最后按 `birdId` 扫描现有 `TimelineSO.tm.timelineId`。
- 生成的资源文件名为 `SO_Talking_Inscape_<talkingId>.asset`。
- Dry Run 会输出创建 / 更新计划、既有 `TalkingTM` 的字段级变化、缺失 `nextTalkingId`、Timeline Hook 解析结果和 warning 计数，并在 manifest 同目录写入 `bird-import-dry-run-report.txt`，不修改 `.asset`。
- Dry Run 报告会尽量附带 Inscape `node`、`kind`、`anchor` 和 `source`，方便从 Unity 导入计划追溯回 DSL 源文本。
- `DryRunImportManifestFromCommandLine` 支持 `-inscapeManifest` 和 `-inscapeOutputFolder` 参数，`-inscapeOutputFolder` 可传 `Assets/...` 或 Unity 项目内绝对路径。
- `ImportManifestFromCommandLine` 使用同一组参数执行真实导入，会创建或更新 `.asset`。
- `ImportManifestFromCommandLine` 增加 `-inscapeApplyAddressables` 显式开关，打开后会调用 Bird 现有 `TalkingSO.ApplyAA()`，把生成资源加入 `TM_Talking` group / label。

## 当前限制

- 原型会覆盖生成资源的 `TalkingTM` 字段，不做字段级人工合并。
- 只生成 Talking 结构，不自动合并或覆盖 Bird 的 `L10N_Talking.csv`。
- 只处理 Timeline Hook，不处理背景、立绘、音频等其他 host binding。
- 没有 Addressables 自动分组；生成后可用 Bird 现有 `TalkingSO.ApplyAA()` 或后续 Importer 扩展处理。
- Dry Run 已有 Console 文本报告和独立报告文件，还没有字段级 diff UI、选择性合并和回滚能力。

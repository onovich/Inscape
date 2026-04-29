# CLI 命令速查

状态：基线

最后更新：2026-04-29

本文集中记录 Inscape CLI 的常用命令。README 只保留开发入口示例；具体命令、产物和用途以后优先维护本文。

## 基本约定

当前未打包成全局命令时，统一使用：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- <command> <args>
```

如果未来发布为 `inscape` 可执行文件，命令主体保持一致：

```powershell
inscape <command> <args>
```

终端内也可以直接查询：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- help export-bird-project
```

## 单文件命令

| 命令 | 用途 | 常用输出 |
| --- | --- | --- |
| `check` | 检查单个 `.inscape` 文件并输出诊断 | stderr 诊断 |
| `diagnose` | 编译单文件并输出 IR + 诊断 JSON | JSON |
| `compile` | 编译单文件并输出 Graph IR JSON | JSON |
| `preview` | 生成单文件 HTML 调试预览 | HTML |
| `extract-l10n` | 从单文件提取本地化 CSV | CSV |
| `update-l10n` | 基于旧 CSV 精确继承译文并更新本地化表 | CSV |

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check samples\court-loop.inscape
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose samples\court-loop.inscape -o artifacts\court-loop.diagnostics.json
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- compile samples\court-loop.inscape -o artifacts\court-loop.json
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview samples\court-loop.inscape -o artifacts\court-loop.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n samples\court-loop.inscape -o artifacts\court-loop.l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n samples\court-loop.inscape --from artifacts\old-l10n.csv -o artifacts\court-loop.l10n.updated.csv
```

## 项目级命令

项目级命令会递归扫描根目录下的 `.inscape` 文件，并忽略 `.git`、`bin`、`obj`、`node_modules` 和 `artifacts`。

| 命令 | 用途 | 常用输出 |
| --- | --- | --- |
| `check-project` | 检查整个项目 | stderr 诊断 |
| `diagnose-project` | 编译项目并输出 Project IR + 诊断 JSON | JSON |
| `compile-project` | 编译项目并输出 Project IR JSON | JSON |
| `preview-project` | 生成项目级 HTML 调试预览 | HTML |
| `extract-l10n-project` | 从项目提取本地化 CSV | CSV |
| `update-l10n-project` | 基于旧 CSV 精确继承译文并更新项目本地化表 | CSV |

通用参数：

- `--entry node.name`：临时指定项目入口，不修改源文件。
- `--override source.inscape temp.inscape`：用临时文件内容覆盖某个源文件，主要供 VSCode 未保存内容使用。
- `-o path`：输出到指定文件。

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose-project samples -o artifacts\samples.diagnostics.json
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- compile-project samples -o artifacts\samples-project.json
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples --entry court.cross_exam.loop -o artifacts\samples-project.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.updated.csv
```

## Bird 适配命令

Bird 命令服务 Unity/Bird 连接层，不应与本地化 CSV 混用。角色表、宿主绑定表、Bird L10N 和 Inscape 本地化表是不同产物。

| 命令 | 用途 | 常用输出 |
| --- | --- | --- |
| `export-bird-role-template` | 扫描对白 speaker，生成角色绑定模板 | `speaker,roleId` CSV |
| `export-bird-binding-template` | 扫描 Timeline Hook，生成宿主绑定模板 | `kind,alias,birdId,unityGuid,addressableKey,assetPath` CSV |
| `export-bird-project` | 导出 Bird manifest、L10N、锚点映射和报告 | 输出目录 |
| `merge-bird-l10n` | 将 Inscape 生成的 `L10N_Talking.csv` 合并到 Bird 现有表，并输出审查报告 | CSV |

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples -o config\bird-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples --bird-existing-role-name-csv D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_RoleName.csv --report artifacts\bird-export\bird-roles.report.csv -o config\bird-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-binding-template samples -o config\bird-bindings.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-binding-template samples --bird-existing-timeline-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Timeline -o config\bird-bindings.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-role-map config\bird-roles.csv --bird-binding-map config\bird-bindings.csv -o artifacts\bird-export
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- merge-bird-l10n artifacts\bird-export\L10N_Talking.csv --from D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_Talking.csv --report artifacts\bird-export\L10N_Talking.merge-report.csv -o artifacts\bird-export\L10N_Talking.merged.csv
```

`export-bird-project` 输出：

```text
bird-manifest.json
L10N_Talking.csv
inscape-bird-l10n-map.csv
bird-export-report.txt
```

常用参数：

- `--bird-talking-start 100000`：设置新 `talkingId` 起点。
- `--bird-role-map roles.csv`：读取 `speaker,roleId` 角色绑定。
- `--bird-existing-role-name-csv path`：仅用于 `export-bird-role-template`，读取 Bird `L10N_RoleName.csv`，对唯一匹配的 speaker 自动填入 `roleId`。
- `--report report.csv`：用于 `export-bird-role-template` 或 `merge-bird-l10n`，输出人工审查报告。角色报告状态包括 `unique`、`ambiguous`、`missing`、`unscanned`。
- `--bird-binding-map bindings.csv`：读取资源 / Timeline 宿主绑定。
- `--bird-existing-talking-root path`：扫描现有 Talking `.asset`，避让已使用的 `talkingId`。
- `--bird-existing-timeline-root path`：仅用于 `export-bird-binding-template`，扫描现有 Timeline `.asset` / `.meta` 辅助填表。

`merge-bird-l10n` 合并规则：

- 保留 Bird 现有但当前 Inscape 导出未涉及的行。
- 新增 Inscape 行会追加到表尾。
- 同 ID 且源文本未变时，保留现有译文。
- 同 ID 但源文本变化时，写入新源文本并清空目标语言列，旧源文本和旧译文写入 `--report` 报告供人工参考。
- 不处理选择项文本；选择项仍在 `TalkingOptionTM.optionText` 和 `inscape-bird-l10n-map.csv` 中审查。

## Unity / Bird Importer 命令

这些命令在 Unity 项目中执行，不属于 Inscape CLI。先将 `tools\unity-bird-importer\Editor\InscapeBirdManifestImporter.cs` 复制到 Bird 项目的 `Assets\Editor\`。

生成一份可用于 Bird dry-run 的最小导出包：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples --bird-existing-role-name-csv D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_RoleName.csv -o artifacts\bird-trial\bird-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-binding-template samples --bird-existing-timeline-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Timeline -o artifacts\bird-trial\bird-bindings.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-existing-talking-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Talking --bird-binding-map artifacts\bird-trial\bird-bindings.csv -o artifacts\bird-trial\export
```

用 Unity batchmode 执行 Importer Dry Run：

```powershell
& "D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "D:\UnityProjects\Bird" `
  -executeMethod Inscape.Unity.BirdImporter.InscapeBirdManifestImporter.DryRunImportManifestFromCommandLine `
  -inscapeManifest "D:\LabProjects\Inscape\artifacts\bird-trial\export\bird-manifest.json" `
  -inscapeOutputFolder "Assets/Resources_Runtime/Talking/InscapeGenerated" `
  -logFile "D:\LabProjects\Inscape\artifacts\bird-trial\unity-dry-run.log"
```

Dry Run 成功后会生成：

```text
artifacts\bird-trial\export\bird-import-dry-run-report.txt
```

确认 Dry Run 报告后执行真实 Import：

```powershell
& "D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "D:\UnityProjects\Bird" `
  -executeMethod Inscape.Unity.BirdImporter.InscapeBirdManifestImporter.ImportManifestFromCommandLine `
  -inscapeManifest "D:\LabProjects\Inscape\artifacts\bird-trial\export\bird-manifest.json" `
  -inscapeOutputFolder "Assets/Resources_Runtime/Talking/InscapeGenerated" `
  -logFile "D:\LabProjects\Inscape\artifacts\bird-trial\unity-import.log"
```

真实 Import 后同步设置 Bird Addressables：

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

## 验证命令

每次修改 CLI、Core、VSCode 工具或文档链接后，建议运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check tools\vscode-inscape\extension.js
node -e "JSON.parse(require('fs').readFileSync('tools/vscode-inscape/package.json','utf8')); JSON.parse(require('fs').readFileSync('tools/vscode-inscape/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('tools/vscode-inscape/syntaxes/inscape.tmLanguage.json','utf8')); console.log('json ok')"
git -c safe.directory=D:/LabProjects/Inscape diff --check
```

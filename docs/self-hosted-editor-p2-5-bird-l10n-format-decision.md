# SelfHostedEditor P2.5 Bird L10N Format Decision

日期：2026-06-17

状态：P2.5 Round 5 完成

## 目标

本轮评估 Bird 当前 `L10N_Talking.csv`、P2.5 adapter 输出和 Inscape 通用 localization CSV contract 的关系，决定 Bird 真实格式是否需要影响通用 Inscape CSV 字段和列顺序。

结论：不影响。Bird L10N 是 adapter / merge 层格式，不改变 Inscape 通用 localization CSV contract。

## 当前 Bird L10N 事实

Bird 当前 `D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_Talking.csv` 表头：

```text
ID,Desc,ZH_CN,EN_US
```

当前样例行：

```text
2001,菲利波,「阁下，今天的宣判真是漂亮。『终身苦役』——拉巴萨家族这次损失惨重。」,
```

Bird runtime 代码事实：

- `L10N.Init()` 通过 `LoadCSV_WithParagraphBreak("L10N_Talking", ...)` 加载对白文本。
- 第 0 列是 `ID`，第 1 列是 `Desc`，第 2 列之后按语言 header 匹配，例如 `ZH_CN` / `EN_US`。
- 文本会把反引号还原为逗号、`%` 还原为双引号、`/br` 还原为换行。
- 文本支持 `<pr>`，runtime 会拆成 `talkingId + talkingIndex`。
- 选项文本当前走独立 `L10N_TalkingOption`，runtime 使用 `LoadCSV_WithSubId("L10N_TalkingOption", ...)`，坐标是 `talkingId + optionIndex`。

## 当前 Inscape / Adapter 输出

P2.5 phase fixture 输出的 `artifacts/bird-trial/phase-export/L10N_Talking.csv` 表头：

```text
ID,ZH_CN,EN_US,ES_ES
```

这仍是 UnitySample / Bird-compatible adapter 的运行时输出草案，不是 Inscape 源本地化表。它与 Bird 当前正式格式存在差异：

- Bird 当前有 `Desc` 列，adapter 输出暂没有。
- Bird 当前语言列为 `ZH_CN,EN_US`，adapter 默认仍输出 `ZH_CN,EN_US,ES_ES`。
- Bird 当前选项文本应进入 `L10N_TalkingOption`，adapter 当前只把选项文本保留在 manifest / 审校映射里。

本轮运行 merge preview：

```powershell
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- merge-unity-sample-l10n artifacts\bird-trial\phase-export\L10N_Talking.csv --from D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_Talking.csv --report artifacts\bird-trial\phase-export\L10N_Talking.p2-5.merge-report.csv -o artifacts\bird-trial\phase-export\L10N_Talking.p2-5.merged.csv
```

结果：

- 只写 ignored artifacts。
- 未改动 Bird 正式 `L10N_Talking.csv`。
- merge report 记录 4 个 `added` 行。
- 合并命令能生成审查输出，但后续 adapter 仍应显式支持 Bird 当前 `Desc` 与 `L10N_TalkingOption` 格式，而不是要求通用 Inscape localization CSV 改列。

## 决策

Inscape 通用 localization CSV 保持 P2 contract：

```text
anchor,node,kind,speaker,text,translation,status,sourcePath,line,column
```

或纯提取表：

```text
anchor,node,kind,speaker,text,translation,sourcePath,line,column
```

理由：

- `anchor` 是 Inscape 源文本和翻译流转的稳定键；Bird 的 `ID` 是 adapter 输出层运行时坐标。
- Bird 的 `Desc`、语言列集合、`<pr>` 拆段、`L10N_TalkingOption` 都是 Bird runtime 格式，不应变成 Compiler、Tooling 或 SelfHostedEditor 的通用事实。
- P2 已建立 localization CSV 与 host config CSV 的安全分离；P2.5 不应把 Bird L10N 当作 previous localization CSV 或通用表格编辑模型。
- Host Bridge / adapter manifest 才负责记录 `anchor -> talkingId/talkingIndex/optionIndex` 的映射。

## 后续 Adapter 问题

后续如果继续 Bird adapter，应在 ExternalSupport 层解决：

- `L10N_Talking.csv` 输出是否增加 Bird 当前需要的 `Desc` 列。
- 默认语言列是否从项目配置或 Bird 原表读取，而不是固定 `ZH_CN,EN_US,ES_ES`。
- 是否新增 `L10N_TalkingOption.csv` 输出和 merge preview，承载选择项文本。
- 是否把连续同配置文本合并为 `<pr>`，减少 TalkingSO 数量。
- merge preview 是否升级为 Bird-specific merge，明确保留 Desc、语言列顺序和人工译文。

这些都是 adapter / Bird 项目集成问题，不进入 P2.5 通用 contract。

## Debug 自检

- 已读取 Bird 当前正式 `L10N_Talking.csv` 表头与样例行。
- 已读取 Bird runtime `L10N.cs`，确认 `L10N_Talking`、`L10N_TalkingOption` 和 `<pr>` 行为。
- 已跑 merge preview，只输出 ignored artifacts。
- Bird 正式 L10N 未出现 git diff。

## 架构自检

- 未修改 `Internal` localization contract。
- 未修改 SelfHostedEditor localization review/update 模型。
- 未把 Bird `ID` / `Desc` / `L10N_TalkingOption` 引入 Host Schema。
- Bird L10N 继续作为 adapter / ExternalSupport 输出与 merge 问题处理。

## 下一轮

进入 Round 6：Host Bridge 与 ExternalSupport 边界收口，同步 Host Schema / Host Bridge / Unity plugin package boundary / Bird importer 文档口径，并运行最终前的边界验证。

# Bird Adapter 原型

状态：原型基线

最后更新：2026-04-29

本文记录第一版 Bird 导出原型。它用于验证 Inscape Project IR 能否低侵入地转换为 Bird 当前可消费的数据，不代表最终 Unity 导入流程。

## CLI

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples -o artifacts\bird-export
```

可选指定 `talkingId` 起点：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-talking-start 100000 -o artifacts\bird-export
```

可选提供角色映射：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-role-map config\bird-roles.csv -o artifacts\bird-export
```

如果想先从脚本里自动收集 speaker，再补角色表，可以先生成角色模板：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples -o config\bird-roles.csv
```

也可以读取 Bird 现有 `L10N_RoleName.csv`，自动填入能唯一匹配的 `roleId`：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples --bird-existing-role-name-csv D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_RoleName.csv --report artifacts\bird-export\bird-roles.report.csv -o config\bird-roles.csv
```

可选扫描现有 Bird `TalkingSO` 资源，避开已使用的 `talkingId`：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-existing-talking-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Talking -o artifacts\bird-export
```

可选提供宿主绑定表，把 Inscape 使用的资源别名 / Timeline 名称映射到 Bird 整数 ID 与 Unity 资源引用：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-binding-map config\bird-bindings.csv -o artifacts\bird-export
```

如果项目里已经写了 `@timeline alias`、`@timeline.<phase> alias`、`[timeline: alias]` 或 `[timeline.<phase>: alias]`，可以先生成绑定模板：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-binding-template samples -o config\bird-bindings.csv
```

也可以扫描现有 Bird Timeline 资源，自动填入能唯一匹配的 `timelineId`、Unity guid 和 asset path：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-binding-template samples --bird-existing-timeline-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Timeline -o config\bird-bindings.csv
```

该命令会扫描项目内 Timeline Hook，输出去重后的 CSV：

```text
kind,alias,birdId,unityGuid,addressableKey,assetPath
timeline,court.opening,,,,
```

之后由人补齐 `birdId`、`unityGuid`、`addressableKey` 或 `assetPath`。

扫描 Timeline 资源时会读取 `.asset` 内的 `timelineId:` 和同名 `.meta` 的 `guid:`。匹配规则会从文件名推导候选 alias，例如 `SO_Timeline_Ch1_01.asset` 可匹配 `ch1.01`、`ch1_01` 和 `SO_Timeline_Ch1_01`。只有唯一匹配时才会自动填表；无法唯一匹配的 alias 会保持空白。

项目级入口仍可用 `--entry node.name` 临时覆盖。

Bird 常用路径也可以写入项目根目录的 `inscape.config.json`，减少重复命令参数：

```json
{
  "bird": {
    "talkingIdStart": 100000,
    "roleMap": "config/bird-roles.csv",
    "bindingMap": "config/bird-bindings.csv",
    "existingRoleNameCsv": "D:/UnityProjects/Bird/Assets/Resources_Runtime/Localization/L10N_RoleName.csv",
    "existingTimelineRoot": "D:/UnityProjects/Bird/Assets/Resources_Runtime/Timeline",
    "existingTalkingRoot": "D:/UnityProjects/Bird/Assets/Resources_Runtime/Talking"
  }
}
```

命令行参数优先级高于配置文件。详见 [项目配置草案](project-config.md)。

角色映射 CSV 第一版格式：

```text
speaker,roleId
Narrator,0
证人,8
```

未出现在映射表中的 speaker 会保留在 manifest 的 `roles` 列表中，但 `roleId` 为 `null`，等待后续绑定。

`export-bird-role-template` 会扫描项目内所有对白 speaker，去重后输出同一格式的 CSV，便于先由编剧写作、后由 Unity/Bird 侧补 `roleId`。配合 `--bird-existing-role-name-csv` 时，会读取 Bird `L10N_RoleName.csv` 的各语言列并做精确匹配；只有唯一匹配时才自动填入 `roleId`，例如重复出现的 `旁白` 会保持空白，避免误绑定。

如果传入 `--report path`，会额外输出角色绑定审查报告：

```text
speaker,status,roleId,candidateRoleIds,candidateDescriptions,candidateLanguages
```

状态含义：

- `unique`：在 Bird `L10N_RoleName.csv` 中唯一匹配，已自动填入 `roleId`。
- `ambiguous`：匹配到多个候选，模板保持空白，由人决定。
- `missing`：未匹配到候选，模板保持空白。
- `unscanned`：未提供 `--bird-existing-role-name-csv`，未扫描 Bird 角色表。

2026-04-30 用当前样例和 Bird 真实角色表试跑：

- `旁白`：`ambiguous`，候选 `1050|10001`。
- `成步堂`：`missing`。
- `证人`：`missing`。

宿主绑定 CSV 第一版格式：

```text
kind,alias,birdId,unityGuid,addressableKey,assetPath
timeline,court.opening,101,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,Assets/Resources_Runtime/Timeline/SO_Timeline_Ch1_01.asset
background,bg.court,,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,BG/Court,Assets/Art/Court.png
portrait,naruhodo.normal,,cccccccccccccccccccccccccccccccc,Portrait/Naruhodo/Normal,Assets/Art/Portraits/Naruhodo_Normal.png
```

字段说明：

- `kind`：绑定类型。当前不做枚举锁死，建议使用 `timeline`、`background`、`portrait`、`item`、`audio` 等小写类型。
- `alias`：Inscape 侧稳定别名，后续 Timeline hook 或资源 hook 会引用它。
- `birdId`：Bird 侧整数 ID。对 `timeline` 来说对应 `TimelineTM.timelineId`；对其他资源类型可按 Bird 现有模板含义填写。
- `unityGuid`：Unity `.meta` guid，用于未来 Importer 定位 ScriptableObject 或资源。
- `addressableKey`：Addressables key，适合运行时按 key 加载的资源。
- `assetPath`：Unity 工程内路径，主要用于导入器、人类审查和迁移。

绑定表至少需要 `kind`、`alias`，并且 `birdId`、`unityGuid`、`addressableKey`、`assetPath` 至少填写一项。该表只进入 manifest，不让 Core 依赖 Unity 类型。

## 输出文件

命令会写入四个文件：

```text
bird-manifest.json
L10N_Talking.csv
inscape-bird-l10n-map.csv
bird-export-report.txt
```

`bird-manifest.json` 是 Unity Editor Importer 的候选输入，包含：

- `format` / `formatVersion`
- `rootPath`
- `entryNodeName`
- `talkingIdStart`
- `languages`
- `roles`
- `hostBindings`
- `hostHooks`
- `nodes`
- `talkings`
- `localization`
- `warnings`

`L10N_Talking.csv` 使用 Bird 当前运行时格式：

```text
ID,ZH_CN,EN_US,ES_ES
```

第一语言列写入源文本，其余语言列暂留空。文本会按 Bird 当前约定做轻量转义：逗号转反引号、双引号转 `%`、换行转 `/br`。

`inscape-bird-l10n-map.csv` 保留 Inscape 锚点到 Bird 输出坐标的审校映射：

```text
anchor,node,kind,speaker,text,talkingId,talkingIndex,birdField,sourcePath,line,column
```

`bird-export-report.txt` 是面向人类和 CI 的轻量报告，包含节点、talking、host binding、host hook、本地化行数和 warning 汇总。当前 warning 不会阻断导出，主要用于在 Unity 导入前发现宿主绑定问题。

## Bird L10N 合并预览

`export-bird-project` 生成的 `L10N_Talking.csv` 不应直接覆盖 Bird 项目的正式本地化表。当前提供独立命令做合并预览：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- merge-bird-l10n artifacts\bird-export\L10N_Talking.csv --from D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_Talking.csv --report artifacts\bird-export\L10N_Talking.merge-report.csv -o artifacts\bird-export\L10N_Talking.merged.csv
```

合并规则：

- 以 `ID` 为键。
- Bird 现有但当前 Inscape 导出未涉及的行会原样保留。
- 当前 Inscape 新增行会追加到表尾。
- 同 ID 且源文本未变时，保留现有翻译。
- 同 ID 但源文本变化时，写入新源文本并清空目标语言列，避免旧翻译误套到新文本。
- 旧源文本和旧译文会写入 `--report` 指定的审查 CSV，用于追溯和人工参考。

2026-04-29 已用 Bird 当前 `L10N_Talking.csv` 和 `artifacts\bird-trial\export\L10N_Talking.csv` 试跑：

- Bird 原表 270 行。
- 合并预览表 275 行。
- 审查报告只包含 5 个 `added` 行。
- 未改动 Bird 项目正式 `L10N_Talking.csv`。

## 当前映射规则

第一版采用保守的一行一 `TalkingTM` 思路，便于验证：

- 每条对白、旁白和选择提示生成一个 `talkingId`。
- `@...` 和 `[...]` metadata 暂不生成 Bird 数据。
- 同一节点内的可见文本按顺序用 `nextTalkingId` 串联。
- 节点的默认跳转映射为末尾 talking 的 `nextTalkingId`。
- 选项映射为末尾 talking 的 `options`，每个选项包含原文、锚点、目标节点和目标 `talkingId`。
- 节点入口使用该节点第一条 talking 的 `talkingId`。
- 如果节点没有文本但有选项，会生成一个 `ChoiceHost` talking 用来承载选项。
- `--bird-role-map` 会把对白 speaker 映射为 Bird `roleId`，并写入 `roles` 和对应 `talkings`。
- `--bird-binding-map` 会把资源别名、Timeline 名称和 Unity 资源坐标写入 manifest 的 `hostBindings`，供后续 Unity Editor Importer 和 Timeline hook 使用。
- `export-bird-binding-template` 会从项目 metadata 中收集 Timeline Hook，并生成待补全的 `--bird-binding-map` 模板；配合 `--bird-existing-timeline-root` 时会尽量从现有 `TimelineSO` 资源自动填表。
- `@timeline alias` 和 `[timeline: alias]` 会写入 manifest 的 `hostHooks`，默认导出为 `kind=timeline`、`phase=talking.exit`，并尽量通过 `hostBindings` 解析 `birdId` / Unity 坐标。
- Timeline Hook 可显式写 phase：`@timeline.talking.enter alias`、`@timeline.talking.exit alias`、`@timeline.node.enter alias`、`@timeline.node.exit alias`，或对应的 `[timeline.node.exit: alias]`。导出时 `talking.exit` 挂最近前一条 talking，`talking.enter` 挂后续下一条 talking，`node.enter` / `node.exit` 分别挂节点首尾 talking。
- `--bird-existing-talking-root` 会递归扫描 `.asset` 文件中的 `talkingId:`，顺序分配新 ID 时自动跳过已占用值。
- 重复 `kind + alias` 的 host binding 会产生 `BIRD001` warning。
- 找不到绑定表行的 Timeline Hook 会产生 `BIRD002` warning。
- 找不到可挂载 talking 的 Timeline Hook 会产生 `BIRD003` warning。

## 当前限制

- 尚未生成 Unity `.asset` 或 ScriptableObject；这一步留给 Unity Editor Importer。
- Timeline Hook 目前先进入 manifest；Unity Editor Importer 只把 `talking.exit` 生成 `TalkingEffectTM.PlayTimeline`。其他 phase 会在 Dry Run 中提示 unsupported phase，等 Bird/DirectorSystem 语义进一步确认后再落地。
- `roleId` 仅支持通过 CSV 手工绑定，尚不能从 Bird 资源自动扫描。
- `export-bird-role-template` 可以从 `L10N_RoleName.csv` 辅助填充 `roleId`，但只做精确唯一匹配，不做模糊匹配。
- `textAnchorIndex` 暂固定为 `0`，`textDisplayType` 暂固定为 `Instant`。
- 选择项文本目前进入 manifest 和锚点映射表，但不进入 `L10N_Talking.csv`，因为 Bird 当前 `TalkingOptionTM.optionText` 是结构字段，不是 `L10N.Talking_Get` 坐标。
- 尚未合并多段文本到同一个 `talkingId + <pr>` 单元格。
- 角色、资源、Timeline 目前仅有 CSV 绑定表，还没有项目配置文件或正式宿主 Schema。
- `talkingId` 只支持给定起点后顺序分配；可以扫描现有 Talking 资源避让冲突，但还没有全项目 ID 范围配置。

## 下一步

- 用带真实绑定的 `@timeline.talking.exit` 样例在 Bird 项目中试跑 Import，验证 `TalkingSO.effects` 与 `TimelineSO` 解析。
- 评估 `talking.enter`、`node.enter`、`node.exit` 是否需要 Bird 运行时或 importer 扩展，暂不把它们自动落为 `TalkingEffectTM`。
- 决定选择项文本长期如何本地化：保留在 `TalkingOptionTM.optionText`，还是扩展 Bird L10N。
- 评估是否把连续同配置文本合并为 `<pr>`，减少 `TalkingSO` 数量。

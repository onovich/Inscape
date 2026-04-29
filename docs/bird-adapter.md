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

可选扫描现有 Bird `TalkingSO` 资源，避开已使用的 `talkingId`：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-existing-talking-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Talking -o artifacts\bird-export
```

可选提供宿主绑定表，把 Inscape 使用的资源别名 / Timeline 名称映射到 Bird 整数 ID 与 Unity 资源引用：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-binding-map config\bird-bindings.csv -o artifacts\bird-export
```

项目级入口仍可用 `--entry node.name` 临时覆盖。

角色映射 CSV 第一版格式：

```text
speaker,roleId
Narrator,0
证人,8
```

未出现在映射表中的 speaker 会保留在 manifest 的 `roles` 列表中，但 `roleId` 为 `null`，等待后续绑定。

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
- `@timeline alias` 和 `[timeline: alias]` 会写入 manifest 的 `hostHooks`，当前导出为 `kind=timeline`、`phase=talking.exit`，并尽量通过 `hostBindings` 解析 `birdId` / Unity 坐标。
- `--bird-existing-talking-root` 会递归扫描 `.asset` 文件中的 `talkingId:`，顺序分配新 ID 时自动跳过已占用值。
- 重复 `kind + alias` 的 host binding 会产生 `BIRD001` warning。
- 找不到绑定表行的 Timeline Hook 会产生 `BIRD002` warning。
- 找不到可挂载 talking 的 Timeline Hook 会产生 `BIRD003` warning。

## 当前限制

- 尚未生成 Unity `.asset` 或 ScriptableObject；这一步留给 Unity Editor Importer。
- Timeline Hook 目前只进入 manifest，不直接生成 `TalkingEffectTM.PlayTimeline`；这一步留给 Unity Editor Importer。
- `roleId` 仅支持通过 CSV 手工绑定，尚不能从 Bird 资源自动扫描。
- `textAnchorIndex` 暂固定为 `0`，`textDisplayType` 暂固定为 `Instant`。
- 选择项文本目前进入 manifest 和锚点映射表，但不进入 `L10N_Talking.csv`，因为 Bird 当前 `TalkingOptionTM.optionText` 是结构字段，不是 `L10N.Talking_Get` 坐标。
- 尚未合并多段文本到同一个 `talkingId + <pr>` 单元格。
- 角色、资源、Timeline 目前仅有 CSV 绑定表，还没有项目配置文件或正式宿主 Schema。
- `talkingId` 只支持给定起点后顺序分配；可以扫描现有 Talking 资源避让冲突，但还没有全项目 ID 范围配置。

## 下一步

- 将 Unity Editor Importer 原型复制到 Bird 项目中试跑，验证 `TalkingSO` 和 Timeline Hook 落地效果。
- 明确 Timeline Hook 的 phase 是否继续沿用 `talking.exit`，或扩展为 node enter/exit。
- 决定选择项文本长期如何本地化：保留在 `TalkingOptionTM.optionText`，还是扩展 Bird L10N。
- 评估是否把连续同配置文本合并为 `<pr>`，减少 `TalkingSO` 数量。

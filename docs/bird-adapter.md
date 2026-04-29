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

项目级入口仍可用 `--entry node.name` 临时覆盖。

## 输出文件

命令会写入三个文件：

```text
bird-manifest.json
L10N_Talking.csv
inscape-bird-l10n-map.csv
```

`bird-manifest.json` 是 Unity Editor Importer 的候选输入，包含：

- `format` / `formatVersion`
- `rootPath`
- `entryNodeName`
- `talkingIdStart`
- `languages`
- `roles`
- `nodes`
- `talkings`
- `localization`

`L10N_Talking.csv` 使用 Bird 当前运行时格式：

```text
ID,ZH_CN,EN_US,ES_ES
```

第一语言列写入源文本，其余语言列暂留空。文本会按 Bird 当前约定做轻量转义：逗号转反引号、双引号转 `%`、换行转 `/br`。

`inscape-bird-l10n-map.csv` 保留 Inscape 锚点到 Bird 输出坐标的审校映射：

```text
anchor,node,kind,speaker,text,talkingId,talkingIndex,birdField,sourcePath,line,column
```

## 当前映射规则

第一版采用保守的一行一 `TalkingTM` 思路，便于验证：

- 每条对白、旁白和选择提示生成一个 `talkingId`。
- `@...` 和 `[...]` metadata 暂不生成 Bird 数据。
- 同一节点内的可见文本按顺序用 `nextTalkingId` 串联。
- 节点的默认跳转映射为末尾 talking 的 `nextTalkingId`。
- 选项映射为末尾 talking 的 `options`，每个选项包含原文、锚点、目标节点和目标 `talkingId`。
- 节点入口使用该节点第一条 talking 的 `talkingId`。
- 如果节点没有文本但有选项，会生成一个 `ChoiceHost` talking 用来承载选项。

## 当前限制

- 尚未生成 Unity `.asset` 或 ScriptableObject；这一步留给 Unity Editor Importer。
- `roleId` 暂为 `null`，只收集 speaker alias 到 `roles` 列表。
- `textAnchorIndex` 暂固定为 `0`，`textDisplayType` 暂固定为 `Instant`。
- 选择项文本目前进入 manifest 和锚点映射表，但不进入 `L10N_Talking.csv`，因为 Bird 当前 `TalkingOptionTM.optionText` 是结构字段，不是 `L10N.Talking_Get` 坐标。
- 尚未合并多段文本到同一个 `talkingId + <pr>` 单元格。
- 尚未设计角色、资源、Timeline 的项目配置或宿主 Schema。
- `talkingId` 只支持给定起点后顺序分配；还没有扫描 Bird 现有资源自动避让冲突。

## 下一步

- 设计角色名到 Bird `roleId` 的绑定表。
- 设计 Timeline Hook 的语法和 manifest 字段。
- 设计 Unity Editor Importer：读取 manifest，创建或更新 `TalkingSO`。
- 决定选择项文本长期如何本地化：保留在 `TalkingOptionTM.optionText`，还是扩展 Bird L10N。
- 评估是否把连续同配置文本合并为 `<pr>`，减少 `TalkingSO` 数量。

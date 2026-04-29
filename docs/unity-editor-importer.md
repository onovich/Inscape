# Unity Editor Importer 草案

状态：原型草案

最后更新：2026-04-29

本文记录 Inscape 到 Bird Unity 项目的第一版 Editor Importer 方案。当前仓库提供可复制脚本：

```text
tools/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs
```

该脚本不属于 `Inscape.Core`，也不会让 Core 依赖 Unity。它是 `export-bird-project` 之后的 Unity 侧导入工具草案。

## 输入

Importer 读取 `export-bird-project` 生成的：

```text
bird-manifest.json
```

导入前建议同时查看：

```text
bird-export-report.txt
```

该报告会列出宿主绑定 warning，例如缺失 Timeline alias 或重复 binding。Unity Dry Run 会再结合当前项目实际资源状态生成导入计划。

当前使用字段：

- `talkings[].talkingId`
- `talkings[].nextTalkingId`
- `talkings[].roleId`
- `talkings[].textAnchorIndex`
- `talkings[].textDisplayType`
- `talkings[].options[].text`
- `talkings[].options[].nextTalkingId`
- `hostHooks[]`

`L10N_Talking.csv` 暂时不由 Importer 自动覆盖，避免误伤 Bird 项目现有翻译表。后续应设计“合并、审查、覆盖”三种模式。

## 输出

Importer 在 Unity 项目内创建或更新：

```text
TalkingSO / TalkingTM
```

映射规则：

```text
manifest talking.talkingId       -> TalkingTM.talkingId
manifest talking.nextTalkingId   -> TalkingTM.nextTalking
manifest talking.roleId          -> TalkingTM.roleId
manifest talking.textAnchorIndex -> TalkingTM.textAnchorIndex
manifest talking.textDisplayType -> TalkingTM.textDisplayType
manifest talking.options         -> TalkingTM.options
manifest hostHooks timeline      -> TalkingTM.effects PlayTimeline
```

Timeline 解析优先级：

1. `hostHook.unityGuid`
2. `hostHook.assetPath`
3. `hostHook.birdId` 对应现有 `TimelineSO.tm.timelineId`

## 安装与使用

将脚本复制到 Bird 项目的 `Assets/Editor/` 下，然后在 Unity 菜单执行：

```text
Inscape > Bird > Dry Run Import Manifest...
Inscape > Bird > Import Manifest...
```

建议先执行 Dry Run。选择 `bird-manifest.json` 后，再选择生成 `TalkingSO` 的目录，例如：

```text
Assets/Resources_Runtime/Talking/InscapeGenerated
```

Dry Run 会在 Unity Console 输出：

- 将创建的 `TalkingSO`。
- 将更新的 `TalkingSO`。
- 既有 `TalkingSO` 即将变化的字段，例如 `roleId`、`nextTalking`、`textAnchorIndex`、`textDisplayType` 和选项。
- 缺失的 `nextTalkingId` 或选项目标。
- Timeline Hook 的解析结果。
- 总 warning 数。

同时会在 `bird-manifest.json` 同目录写入：

```text
bird-import-dry-run-report.txt
```

该文件用于留存导入计划，方便在真正 Import 前做审查或提交给其他人确认。

报告中的 TalkingSO 计划会尽量附带 Inscape 上下文：

- `node`：来源节点名。
- `kind`：来源类型，例如 `Dialogue`、`Narration`、`ChoicePrompt`。
- `anchor`：Inscape 行级锚点。
- `source`：源文件、行、列。

Timeline Hook 计划会附带 `node`、`phase` 和源位置，便于确认 hook 是否挂到了预期 talking 上。

## 当前边界

- 原型会覆盖生成资源的 `TalkingTM` 字段，不做字段级人工合并。
- Dry Run 文本报告已经能列出既有 `TalkingTM` 的字段级变化，但仍然只是审查辅助，不提供交互式选择性合并。
- 原型不自动修改 Addressables 分组。
- 原型不自动合并 `L10N_Talking.csv`。
- 原型只支持 Timeline Hook，不处理背景、立绘、音频等其他 host binding。
- Dry Run 已有 Console 文本报告和独立报告文件，但还没有字段级 diff UI 和回滚机制。

## 后续建议

1. 增加字段级 diff UI：展示每个 `TalkingTM` 即将改动的字段，并允许人工确认。
2. 设计 `L10N_Talking.csv` 合并策略，避免覆盖人工译文。
3. 接入 Addressables：生成后自动加入 Bird 的 `TM_TALKING` 分组。
4. 明确 Timeline Hook phase，决定是否需要 talking enter、node enter、node exit。

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
Inscape > Bird > Import Manifest...
```

选择 `bird-manifest.json` 后，再选择生成 `TalkingSO` 的目录，例如：

```text
Assets/Resources_Runtime/Talking/InscapeGenerated
```

## 当前边界

- 原型会覆盖生成资源的 `TalkingTM` 字段，不做字段级人工合并。
- 原型不自动修改 Addressables 分组。
- 原型不自动合并 `L10N_Talking.csv`。
- 原型只支持 Timeline Hook，不处理背景、立绘、音频等其他 host binding。
- 原型没有 dry-run、冲突报告 UI 和回滚机制。

## 后续建议

1. 增加 dry-run：列出将创建、更新、跳过和冲突的资源。
2. 增加导入报告：输出 `talkingId`、asset path、source node、source anchor。
3. 设计 `L10N_Talking.csv` 合并策略，避免覆盖人工译文。
4. 接入 Addressables：生成后自动加入 Bird 的 `TM_TALKING` 分组。
5. 明确 Timeline Hook phase，决定是否需要 talking enter、node enter、node exit。

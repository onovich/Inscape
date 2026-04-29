# Bird / Unity 调研记录

状态：调研基线

最后更新：2026-04-29

本文记录 Inscape 与现有 Bird Unity 项目的对接认知。它不是 Unity Adapter 的最终规格，而是后续设计 Adapter、L10N 导出、Timeline Hook 时的事实基线。

## 调研范围

Bird 项目路径：

```text
D:\UnityProjects\Bird\Assets
```

重点阅读：

- `Scripts_Runtime\System_Story\StorySystem.cs`
- `Scripts_Runtime\System_Story\Domains\StoryTalkingDomain.cs`
- `Scripts_Runtime\System_Story\StorySystemEvents.cs`
- `Scripts_Runtime\System_Director\DirectorSystem.cs`
- `Scripts_Runtime\System_Director\Domains\DirectorTimelineDomain.cs`
- `Scripts_Runtime\System_Director\DirectorSystemEvents.cs`
- `Scripts_Runtime\Infrastructure_Assets\AssetsInfra.cs`
- `Scripts_Runtime\Infrastructure_L10N\L10N.cs`
- `Scripts_Runtime\Infrastructure_L10N\L10nLangEntity.cs`
- `Scripts_Runtime\Teamplates\Talking\*.cs`
- `Scripts_Runtime\Teamplates\Timeline\*.cs`
- `Scripts_Runtime\Entities\Talking\*.cs`
- `Scripts_Runtime\Entities\Director\*.cs`
- `Resources_Runtime\Localization\L10N_Talking.csv`
- `Resources_Runtime\Talking\SO_Talking_*.asset`
- `Resources_Runtime\Timeline\SO_Timeline_*.asset`

## 核心结论

Inscape 第一版 Unity/Bird Adapter 应优先对接 Story/Talking/L10N，不应直接把 DSL 设计成 Timeline 时间轴语言。

更具体地说：

- Inscape Core 继续输出引擎无关 Narrative Graph IR。
- Bird Adapter 将 IR 映射为 Bird 可消费的 Talking 数据、L10N 数据和可选的 Timeline 引用。
- Timeline 暂时作为外部演出资源，由节点进入、节点退出或对话结束 Hook 引用。
- 直接生成 Unity ScriptableObject 不是第一版最稳妥的入口；更适合先生成中间 manifest 和 Bird 兼容 CSV，再由 Unity Editor Importer 转成 ScriptableObject / Addressables。

## Bird 当前数据流

Bird 运行时通过 `AssetsInfra` 加载 Addressables 中的模板资源，并按整数 ID 建立字典：

- `TalkingSO.tm.talkingId -> TalkingTM`
- `TimelineSO.tm.timelineId -> TimelineTM`
- `ActSO.tm.actId -> ActTM`
- `TriggerSO.tm.triggerId -> TriggerTM`
- 其他资源也大多按各自模板 ID 建索引。

`StorySystem` 本身不直接持有脚本文本。它通过 `StoryTalkingDomain` 创建 `TalkingEntity`，再通过 UI 层查询本地化文本。

```text
StoryTalkingDomain.PlayNewTalking(talkingId)
  -> TalkingFactory.Talking_Create(AssetsInfra, talkingId)
  -> AssetsInfra.TalkingTM_Get(talkingId)
  -> StoryUIDomain.Talking_PreSetContent(...)
  -> UITalkingDomain.PreSetContent(...)
  -> L10N.Talking_Get(talkingId, talkingIndex)
```

这说明 Bird 当前的“剧情内容源”实际由两部分组成：

- 结构数据：`TalkingSO` / `TalkingTM`
- 文本数据：`L10N_Talking.csv`

## Talking 模型

`TalkingTM` 的关键字段：

```text
talkingId
guid
nextTalking
isOption
options
roleId
textAnchorIndex
textDisplayType
typewritingSpeed
textVerticalAlignment
textHorizontalAlignment
isAutoTalking
autoTalkingInterval
effects
```

`TalkingEntity` 会从 `TalkingTM` 派生运行时字段：

- `talkingId`：当前对话 ID。
- `talkingIndex`：当前文本段索引，初始为 `0`。
- `nextTalkingId`：来自 `TalkingTM.nextTalking`。
- `roleId`：说话人本地化 ID。
- `textAnchorIndex`：UI 对话锚点。
- `options`：选项列表。
- `effects`：对话效果列表。

推进逻辑在 `StoryTalkingDomain.OnPageForward` 中：

1. 如果 `L10N.Talking_Has(talkingId, talkingIndex + 1)`，进入同一 `talkingId` 的下一段。
2. 否则如果有可用选项，打开选项 UI。
3. 否则如果 `nextTalking` 存在，停止当前对话并播放下一 `talkingId`。
4. 否则停止并隐藏对话 UI。

这对 Inscape 的映射有一个重要影响：Bird 的一个 `TalkingTM` 可以承载同一说话人、同一 UI 锚点、同一显示配置下的多段文本；但如果说话人、锚点、显示方式、效果或跳转结构变化，通常应切成多个 `TalkingTM` 并用 `nextTalking` 串起来。

## 选项与条件

代码层已经支持选项：

- `TalkingTM.isOption`
- `TalkingTM.options`
- `TalkingOptionTM.optionText`
- `TalkingOptionTM.nextTalking`
- `TalkingOptionTM.conditions`

当前条件类型非常窄：

```text
None
HasItem
NotHasItem
```

`StoryTalkingDomain.Option_IsAvailable` 会逐个判断 `OptionConditionModel`，目前只查询 `ctx.itemRepo.Contains(itemId)`。

这与 Inscape 的方向一致：DSL 内只表达条件，宿主层负责解释条件如何查询业务状态。第一版 Inscape 仍然可以不做变量和条件；第二版若加入条件，应设计为宿主 Schema 驱动，而不是在 Core 中绑定 Bird 的 `ItemRepo`。

## Talking 效果

`TalkingEffectTM` 支持在对话退出时触发：

- `PlayTimeline`
- `GoToAct`
- `PlaySFX`
- `PlayBGM`
- `PlayCameraShake`
- `PlayActAnim`
- `PlayPP`
- `PlayToy`
- `PlaySceneTransition`
- `AutoSave`
- `AddItem`
- `RemoveItem`

`StorySystemEvents` 会把部分 Talking 效果转发到其他系统。例如 `PlayTimeline` 会通过事件进入 `DirectorSystem.Story_OnTalkingPlayTimeline`。

因此，Inscape 第一版不需要把这些效果全部做成核心语法。更合适的方向是：

- Core 保留通用 metadata / tag / hook 表达。
- Bird Adapter 根据宿主 Schema 将 hook 映射到 `TalkingEffectTM`。
- 没有 Schema 的项目仍可只使用 Narrative Graph IR 和 HTML 预览。

## Bird L10N 模型

`L10N_Talking.csv` 当前格式：

```text
ID,ZH_CN,EN_US,ES_ES
```

`L10N.LoadCSV_WithoutDesc_WithParagraphBreak` 的读取规则：

- 第 0 列是 `talkingId`。
- 后续列按表头匹配 `L10NLangType`。
- 单元格文本会做转义还原：反引号转逗号、`%` 转双引号、`/br` 转换行。
- 单元格内支持用 `<pr>` 切成多段，段号从 `0` 开始。
- 最终写入 `L10NLangEntity.talkingTextDict[(talkingId, index)]`。

当前扫描到的 `L10N_Talking.csv` 样例主要是一行一个 `talkingId`，没有发现实际使用 `<pr>` 的行；但运行时代码明确支持 `<pr>`。

这与 Inscape 当前本地化表不同：

```text
anchor,node,kind,speaker,text,translation,sourcePath,line,column
```

建议保留两层模型：

- Inscape 源表继续使用 `anchor` 作为翻译稳定锚点。
- Bird 导出表生成 `talkingId + paragraphIndex`，并附带一个映射 manifest 记录 `anchor -> talkingId/index`。

这样可以兼顾 Inscape 的文本修订稳定性和 Bird 当前运行时的读取方式。

## Director / Timeline 模型

`DirectorSystem` 是一个跨系统演出队列执行器。它通过 `DirectorTimelineDomain.CreateAll(timelineIds)` 创建 `TimelineEntity`，再在 Tick 中逐个处理 `TimelineEffectModel`。

`TimelineEffectTM` 支持：

- 播放幕动画、转场、音效、BGM、相机震动、PP、FP。
- 播放对话 `PlayTalking`。
- 跳转 Act。
- 添加、移除、获得道具。
- 进入或退出小游戏。
- 退出 Timeline、退出 Talking。
- 切换剧情背景。
- 播放角色立绘。
- 切换探索地图。
- 播放其他 Timeline。

`Main.cs` 中的事件接线显示，Timeline 会反向驱动 Story、Feeling、Play、Explore 等系统。例如：

- `Timeline_OnApplyEffect_PlayTalking` -> `StorySystem.Director_OnTimelinePlayTalking`
- `Timeline_OnApplyEffect_ChangeStoryBackground` -> `StorySystem.Director_OnTimelineChangeBackground`
- `Timeline_OnApplyEffect_PlayRolePortrait` -> `StorySystem.Director_OnTimelinePlayRolePortrait`
- `Timeline_OnApplyEffect_PlaySFX/BGM/PP/FP` -> Feeling 系统

因此 Timeline 不只是对话节点的附属字段，而是一个项目级演出编排层。Inscape 第一版应避免把 DSL 核心扩张成完整 Timeline 编辑语言。

## Inscape 到 Bird 的候选映射

建议第一版 Adapter 使用以下思路：

```text
Inscape Project
  -> Narrative Graph IR
  -> Bird Export Manifest
  -> Bird L10N_Talking.csv
  -> Unity Editor Importer
  -> TalkingSO / Addressables
```

候选字段映射：

```text
Inscape node.name          -> Bird node manifest entry
node entry generated id    -> first TalkingTM.talkingId
dialogue/narration line    -> L10N_Talking row or paragraph
line anchor                -> manifest anchor -> talkingId/index
speaker alias              -> roleId, via project role map
linear edge                -> TalkingTM.nextTalking
choice option              -> TalkingOptionTM.optionText + nextTalking
node metadata              -> textAnchorIndex / textDisplayType / alignment / speed
timeline hook              -> TalkingEffectTM.PlayTimeline, by timelineId
```

`TalkingTM` 的粒度需要由 Adapter 决定：

- 连续文本若共享 speaker、anchor、display 和效果，可合并为同一 `talkingId` 的多段。
- 只要 speaker、anchor、display、效果、选项或跳转发生变化，就应拆成不同 `TalkingTM`。
- Inscape 的显式节点名更适合映射为“对外跳转入口”，而不是强制等于一个 Bird `TalkingTM`。

## 第一版 Adapter 建议

优先做可验证、低侵入的导出，而不是立即改 Bird 运行时代码：

1. 设计 `bird-manifest.json`，记录节点名、生成 ID、anchor 映射、角色映射和资源引用。
2. 设计 ID 分配策略，避免与 Bird 现有 `talkingId` / `timelineId` 冲突。
3. 生成 Bird 兼容的 `L10N_Talking.csv`，但保留 Inscape 原始 `anchor` 表。
4. 暂不直接写 Unity `.asset` YAML；后续通过 Unity Editor Importer 创建或更新 `TalkingSO`。
5. Timeline 只做引用，不做生成；语法上先使用 metadata 或明确的 hook 草案承载。

## 待确认问题

- `talkingId` 是由 Adapter 自动分配并写入 manifest，还是允许作者在项目配置中声明 ID 范围。
- 角色名到 `roleId` 的映射来源：项目配置、CSV、Unity 导出的资源表，还是宿主 Schema。
- 资源别名到 Timeline / 音频 / 立绘 ID 的映射来源。
- Inscape 节点是否需要一个稳定的 node id，专门用于节点重命名迁移。
- Bird 兼容 CSV 是否要完全沿用 `L10N_Talking.csv` 的列，还是生成额外审校表。
- Timeline Hook 第一版应该使用 metadata、inline tag，还是独立的块级语法。
- 长期是否让 StorySystem 直接消费 Inscape IR，还是保持 Unity Importer 生成 Bird 原生数据。


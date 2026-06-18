# 运行时与 Unity 宿主

状态：草案，P3 Runtime 前置边界

最后更新：2026-06-18

## 目标

Unity 宿主的第一目标是解释执行 Compiler Core 输出的 IR，并将叙事 Command 转换为 Unity 中的 UI、角色立绘、背景、音频和分支交互。

它不应该成为 DSL 编译器的第二份实现。运行时只消费编译产物和资源引用。

## 与 Bird 当前项目的关系

Bird 是 Unity 支持层设计的重要参考需求方，不是 Inscape 的唯一目标，也不应反向绑架 Core、IR 或通用 Unity 插件设计。其他项目可能不使用 Addressables、不使用 ScriptableObject，甚至不使用 Unity。Inscape 的底层数据应保持容易被 Unity、Godot、UE 或自研引擎读取，具体项目再通过桥接层转成自己的数据结构。

当前 Bird 项目中，`StorySystem` 与 `DirectorSystem` 已经形成两层剧情能力：

调研入口：`D:\UnityProjects\Bird\Assets`。详细记录见 [Bird / Unity 调研记录](bird-unity-research.md)。

- StorySystem：负责幕、触发器、对话节点、选项、物品条件和 UI 推进。
- Talking 数据：`TalkingTM` 包含 `talkingId`、`nextTalking`、`options`、`roleId`、`textAnchorIndex` 和 `effects`，接近 Inscape 的节点与边。
- L10N：当前对话文本以 `talkingId + index` 查询，`L10N_Talking.csv` 格式为 `ID,ZH_CN,EN_US,ES_ES`，文本可通过 `<pr>` 拆段。
- DirectorSystem：负责 Timeline 队列，以 `TimelineEffectTM` 表达带时间的演出、音频、背景、立绘、道具和对话播放。

因此第一阶段建议：

- Inscape 先编译到引擎无关的 Narrative Graph IR。
- Unity Adapter 或项目 Adapter 再把 IR 映射到目标项目可消费的数据；Bird 的 Talking/L10N、ScriptableObject 和 Addressables 只是一个参考适配路径。
- Timeline 先作为宿主事件或外部演出资源引用示例，例如“触发 timeline X”。
- 暂不让 DSL 直接生成 Timeline；Timeline 是跨 Story、Feeling、Play、Explore 的演出编排层，后续应作为宿主事件、Presentation IR 或项目适配配置单独讨论。

## 项目桥接层

项目桥接层负责消化 Inscape 抽象 ID 与项目内部 ID 的差异。例如 Inscape 中的 `item` 可以使用可读字符串 `badge`，而项目内部可能使用整数、枚举、资源 GUID 或服务器主键。桥接层应通过静态表、配置、代码生成或扫描项目代码来建立映射。

这层也负责把宿主事件映射到项目已有代码结构。Inscape 可以表达“触发事件并传参”，但不直接调用 Unity API、业务服务或 Timeline 播放器。上层项目拿到事件数据后如何处理，取决于项目自己的运行时和工具链。

下层状态是被查询对象：宿主可以通过 Schema 提供查询能力读取叙事状态或项目状态，Inscape 不反向查询具体上层业务系统，也不要求业务系统暴露内部实现细节。

## Inscape 状态与宿主状态

接入真实游戏项目时，宿主存档应是正式游戏存档的权威；Inscape 的运行状态应作为宿主存档里的一个子状态 blob 保存和恢复。宿主负责恢复 Unity 场景、实体、背包、任务、战斗和资源系统；Inscape 负责恢复叙事执行位置、内部叙事运行事实和必要的 query / action receipt。

建议 Runtime 提供：

```text
ExportState()
ImportState(state)
ValidateStateAgainstCurrentScript(state)
```

而不是另起一套正式存档槽与宿主抢权威。

例外：

- 纯 Inscape 游戏或独立 Runtime 可以由 Inscape 自己管理完整存档。
- 编辑器 Preview / 测试可以使用临时测试存档，服务调试，不代表正式项目存档策略。

业务玩法状态默认归宿主，例如背包、任务阶段、好感度、战斗结果、NPC 生死、玩家位置和经济数值。Inscape 只默认保存叙事运行事实，例如当前 node、执行位置、visited / seen / choice 历史、Log、Runtime checkpoint 和本轮 rollback 栈。

## Unity 代码生成式桥接草案

Unity 支持层的一个候选方向是让项目在自己的 C# 类型、字段、属性或方法上加轻量标记，例如 `[Inscape]` 或更细分的 `[InscapeQuery]`、`[InscapeEvent]`、`[InscapeResource]`。Unity 内的编辑器脚本扫描这些标记后，生成一份待配置的桥接表或配置资产。

这份生成物不应直接替代人工判断，而是作为“待补全配置”：开发者再把 C# 侧类名、字段名、事件处理器、资源引用与 Inscape 侧可读 ID、角色名、资源别名或查询名对应起来。这样可以减少手写表的初始成本，又避免把项目内部命名强行暴露为 DSL 语义。

候选流程：

```text
Unity C# [Inscape] 标记
  -> Unity Editor 扫描 / 代码生成
  -> 待配置 Host Bridge 表
  -> 人工确认 Inscape 名称与项目内部成员映射
  -> 生成 adapter 代码、配置资产或运行时查找表
```

仍未确认的是运行时消费模型：拿到 Inscape 事件或数据后，上层可以选择直接绑定事件回调、通过轮询读取叙事状态触发逻辑，或采用混合模型。当前不把事件绑定或轮询写死为通用方案，应先作为 Host Bridge / Runtime Host 的待确认问题保留。

## Bird Adapter 第一版候选边界

第一版 Adapter 不应要求 Bird 运行时立刻改造为直接消费 Inscape IR。更稳妥的路径是：

```text
Inscape Project
  -> Narrative Graph IR
  -> Bird Export Manifest
  -> Bird L10N_Talking.csv
  -> Unity Editor Importer
  -> TalkingSO / Addressables
```

候选输出：

- `bird-manifest.json`：记录节点名、生成的 `talkingId`、源文本锚点到 `talkingId/index` 的映射、角色映射和资源引用。
- `L10N_Talking.csv`：生成 Bird 当前 `L10N` 可读取的对话文本表。
- 可选审校表：保留 Inscape `anchor,node,kind,speaker,text` 等字段，服务翻译和迁移。

早期 CLI 原型曾写作 `export-bird-project <root> -o <output-dir>`；当前可执行入口已迁到 ExternalSupport 的 `export-unity-sample-project`，并通过 Bird-compatible ignored manifest 完成 P2.5 dry run。细节见 [Bird Adapter 原型](bird-adapter.md)、[SelfHostedEditor P2.5 Timeline Export Audit](self-hosted-editor-p2-5-timeline-export-audit.md) 和 [SelfHostedEditor P2.5 Bird Dry Run Audit](self-hosted-editor-p2-5-bird-dry-run-audit.md)。

Unity Editor Importer 的可复制原型位于 `src/ExternalSupport/UnityPlugin/unity-bird-importer/`，设计说明见 [Unity Editor Importer 草案](unity-editor-importer.md)。它读取 `bird-manifest.json` 并生成 / 更新 Bird `TalkingSO`，但不让 `Inscape.Compiler` 依赖 Unity。

关键原则：

- Inscape 的行级 hash 仍是源文本和翻译流转的稳定锚点。
- Bird 的 `talkingId/index` 是 Adapter 输出层的运行时坐标。
- 角色、资源、Timeline 等宿主对象通过项目配置或宿主 Schema 绑定，不写死进 DSL Core。
- Inscape 节点名用于作者可读的图结构入口；一个节点可以映射为多个 `TalkingTM`，由 Adapter 按 speaker、anchor、display、effect 和跳转结构切分。

## 初始能力

- 加载编译后的 IR。
- 顺序执行对白、旁白和演出标签。
- 处理基础条件和选择。
- 通过状态 Store 保存执行位置和 Inscape 内部叙事运行事实。
- 调用 Unity UI 显示文本和选项。
- 调用资源系统切换背景、立绘和音频。
- 支持基础存档和读档。

第一版不应默认把 Inscape 做成完整业务变量系统。用户自定义内部变量、复杂内部函数和玩法状态托管可以作为后续扩展评估；当前优先保证宿主 delegate query 与 Inscape 内部叙事事实的边界清楚。

P3 Round 10 已在 `Inscape.Runtime` 中落地最小 Runtime query provider / internal facts contract：正式玩法状态仍走 delegate query，mock / recorded 服务测试与复现，内部 facts 只覆盖 visited / seen / choice history 等叙事运行事实。

P3 Round 11 已在 `Inscape.Runtime` 中落地最小 Runtime State shape：`ExportState` 输出 `format`、`formatVersion`、`runtimeVersion`、`scriptVersion`、`position`、`flow`、`facts`、`random` 与 `host.checkpointId`；`ValidateStateAgainstCurrentScript` 输出 compatible / migratable / incompatible 三档报告。该实现仍不是完整正式 Save / Load 产品系统。

## Command Pipeline 候选

```text
IR Command
  -> Runtime Executor
  -> Action or Render Request
  -> Reducer updates Store
  -> Unity Adapter updates UI and assets
```

这种方式符合单向数据流，便于记录、回放和调试。

## IR 内容候选

- 指令类型。
- 源文件与源位置。
- 锚点 ID。
- 可翻译文本引用。
- 角色引用。
- 资源引用。
- 变量读写信息。
- 分支与跳转目标。
- 运行时参数。

## Unity 集成方式候选

Unity 支持层后续应作为独立插件 / 适配包研究，而不是混在 VSCode 扩展中。插件应围绕通用 IR、Host Schema 和 Host Bridge 配置工作，再按项目选择输出 ScriptableObject、JSON、代码生成文件或调用项目已有 importer。

- ScriptableObject 存储编译后的指令流。
- Addressables 管理背景、立绘、音频、视频等资源。
- MonoBehaviour 作为宿主入口，负责加载 IR 和连接 UI。
- 自定义 Inspector 用于调试当前执行位置、Store 和指令队列。
- Attribute 扫描或代码生成，把项目已有查询函数、事件处理器和资源表导出为 Host Schema / Bridge 配置。

## 扩展边界

插件化扩展应允许项目接入自定义指令，例如战斗、小游戏、复杂 UI、特殊镜头或成就系统。

第一版暂不设计自定义指令。后续需要先回答：自定义指令是叙事图的边、节点元信息、Timeline 效果，还是宿主层查询和命令 Schema。

待确认：

- 自定义指令是否需要编译期 Schema。
- Unity 端扩展是否通过 C# Attribute、ScriptableObject 注册表，还是配置文件。
- 编辑器如何识别扩展指令并提供补全和诊断。
- 自定义指令是否允许改变叙事 Store，还是只能发出受控 Action。

## Timeline 调研方向

- Bird 现有 Timeline 当前适合作为“外部演出资源”，由 DSL 节点引用；Inscape 不直接生成 Timeline 内部轨道。
- DSL 已能表达 `talking.enter`、`talking.exit`、`node.enter`、`node.exit` 四种 Timeline Hook phase，并在 manifest 中保留。
- Bird 当前 `TalkingEffectTM.PlayTimeline` 只安全对应 `talking.exit`；其他 phase 暂由 Unity Importer Dry Run 报告 unsupported phase，后续需要运行时或 adapter 层扩展。
- 选项选择时的 Timeline Hook 尚未设计，需要先确认它属于边事件、选项 metadata，还是未来 Presentation IR。
- Timeline 的时间队列是否应与叙事图分离，避免 DSL 变成完整演出脚本。
- 如果未来自研引擎对标 Ren'Py，Timeline 是否会演化为独立的 Presentation IR。
- Unity ScriptableObject 是否只是 Adapter 输出格式，还是作为第一版唯一运行格式。

## Timeline / 宿主异步控制权

P3 结论：同一段情节里必须只有一个“导演”。Inscape、Timeline、小游戏 / 战斗系统都可以成为主控，但同一时刻不应互相抢控制权。

推荐按场景分工：

```text
对话 / 分支 / 选项为主：
Inscape 当导演，Timeline 作为 @action 被触发，可选择 wait。

电影化演出为主：
Timeline 当导演，通过 Signal / Marker 让宿主 Bridge 调用 Inscape 播一小段剧情；如需要等待对白结束，由宿主暂停并恢复 Timeline。

玩法段为主：
宿主或玩法系统当导演。Inscape 可 handoff 给战斗、小游戏、探索或地图 UI，宿主结束后再恢复剧情。
```

统一控制权协议可以设计为：

```text
Host -> Inscape:
RunNode(nodeId)
RunNodeAndWait(nodeId)
Resume(token, result)

Inscape -> Host:
@action(..., mode: fire)
@action(..., mode: wait)
@action(..., mode: handoff)
```

三种 action mode：

- `fire`：发出后继续。适合音效、打点、轻量震屏、非关键动画。
- `wait`：暂停剧情，等待宿主返回完成 / 失败 / 取消。适合 Timeline、角色动画、淡入淡出、资源加载、宿主 UI 选择。
- `handoff`：把控制权交给宿主，宿主稍后决定何时恢复剧情。适合战斗、小游戏、探索段落、场景切换和长演出。

异步适用场景：

- 播放 Timeline，等播完再继续对白。
- 等待角色动画、镜头动画或淡入淡出完成。
- 等待宿主 UI 选择，例如地图点选或项目自己的选择面板。
- 等待大资源加载完成。
- 等待服务器结果；优先级低于单机，但协议应留出 timeout / error。
- 等待战斗或小游戏结束；这类通常更适合 `handoff`，避免 Inscape 管理玩法过程。

Timeline 可以驱动剧情，剧情也可以驱动 Timeline；关键不是固定谁驱动谁，而是每段内容的主控权必须明确，并通过 Host Bridge / Runtime Host 做控制权交接。

P3 第一版不把异步失败设计成剧情可分支处理的普通结果。资源加载和网络请求的失败 / 超时在业务上较可理解，但也应由宿主负责重试、fallback、断线提示或中断流程。对 Inscape 来说，`wait` / `handoff` action 失败、取消或超时都统一视为宿主异常：Runtime 抛出 / 上报 action error，错误包含 node、lineId、action name、args、requestId 和 host error，上层决定如何处理。

因此第一版不需要为每个 action 配复杂 `failurePolicy` / `timeoutPolicy`；全局默认可以是 `throw`。

## 存档策略草案

存档至少需要包含：

- 当前脚本锚点或节点锚点。
- 当前指令偏移。
- Inscape 内部叙事运行事实快照。
- 编译器和 IR 版本。
- 必要的 query / action receipt。
- 宿主 checkpoint id 或宿主存档引用。

正式项目里，普通存档不应默认等于完整 Action 日志。普通存档目标是“恢复到可继续游玩的状态”，因此应尽量小；完整 Action / query trace 更适合作为调试复现能力，并应有上限、压缩或仅开发模式启用。

P3 建议拆开以下概念：

```text
Log / Backlog
查看聊天记录，只看已经实际呈现过的内容，不重新执行脚本。

Save / Load
正式存档。宿主存档是权威，Inscape state 是其中的子状态 blob。

Rollback
倒退到过去关键点并继续玩。有限数量，只存在内存，读档后清空。

Trace Replay
调试复现。记录玩家选择、query 结果、随机结果和 action 结果，用来解释为什么走到某个分支。

Flashback Playback
剧情表现用的回忆画面。像播放过去发生过的一段内容，不让玩家重新选择。
```

优先级：

- 高优先级：Log / Backlog、普通 Save / Load。
- 中优先级：有限内存 Rollback 的设计边界。
- 低优先级：Trace Replay 的完整实现。
- 更低优先级：Flashback Playback。
- 项目自定义：时空穿越式特殊倒放机制，例如大部分状态重置但少数状态保留。

2026-06-18 P3 后续阶段口径已确认：P4 是下一个明确阶段，先做 Runtime 可玩化；P5 是中期候选，倾向做 SelfHostedEditor Runtime authoring / 产品化接入；Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR / 跨引擎 / 独立 Inscape Runtime 只进入后置方向池，不作为当前正式排期 phase。

P4 的 Save / Load 只要求正式项目中的 Inscape state 子状态 blob 与 editor preview 测试存档；纯 Inscape 独立游戏的完整存档产品后置。P4 应包含 Log / Backlog，默认记录 `speaker`、`text`、`lineId`，选项记录作为可选扩展或开发模式信息。

Log 第一版建议保存 `speaker`、`text`、`lineId`。选项信息可作为可选扩展：默认 UI 可以只显示对白；开发模式或项目配置可以记录并显示 presented choices / chosen choice，便于复盘选择和调试。

Rollback checkpoint 默认应在每次显示文本前创建；显示选项前也必须可作为 checkpoint。跨会改变宿主状态的 `@action` 时，Runtime 应要求宿主 checkpoint / receipt，或阻止跨越该动作回退。Rollback 栈只保存在内存中，数量有限，读档后清空。

P3 第一版不为低优先级 Rollback / Replay 把 Action Schema 做胖。默认规则：

- Trace Replay 不真实重放 `@action`，只展示当时记录。
- Rollback 遇到改变宿主状态的 `@action` 默认作为 barrier。
- 纯表现 action 是否允许跨越、业务 action 是否可 undo / idempotent / checkpoint，由后续更细 action policy 设计决定。

Trace Replay 不应重新向宿主查询已经影响分支的值，而应使用当时记录的 query receipt。例如当时 `[has_item("silver_key")] => true`，回放解释路径时使用这个历史结果；完整游戏世界回放则必须由宿主 checkpoint / 输入重放系统当权威，Inscape 只能作为参与者。

随机数策略由宿主决定。Inscape 不判断“公平性”或是否防 S/L，只提供策略接口：宿主随机、固定种子、实时随机源或 recorded random。影响分支的随机结果如果需要调试复现，应记录 receipt。

## 版本兼容与迁移

Runtime state、Log、Trace、Host Schema 和 Host Bridge 都应带版本：

```text
saveFormatVersion
runtimeVersion
scriptVersion
schemaVersion
hostProtocolVersion
```

加载时按三档处理：

- `compatible`：直接加载。
- `migratable`：执行显式迁移。
- `incompatible`：提示用户重载、回到最近可定位节点，或由宿主拒绝加载。

编辑器热更新主要服务测试，不承诺完美恢复。若 `lineId` 仍存在，可以尽量停在附近；若 `lineId` 消失，应提示状态失效并提供 reload all。Log 记录 `lineId`，显示时按当前文本解析；如果项目需要保留旧文本，应作为更高成本的历史快照能力另行设计。

## Runtime State 第一版边界

P3 第一刀不做完整正式存档系统。目标是先设计并验证最小 shape：

```text
必须输出 Runtime State 设计文档。
可以实现最小 model / smoke。
不实现完整 Save / Load 产品体验。
不实现完整 Rollback / Trace Replay / Flashback。
```

`ExportState()` 第一版最小模型倾向包含：

```text
format / formatVersion
runtimeVersion
scriptVersion
position: nodeId / lineId / commandIndex
flow: entryNodeId / stack
facts: visitedNodes / seenLines / choices
random: policy 或 seed/state
host: checkpointId
```

普通 Runtime State 不默认包含完整 Log，也不默认包含完整 query/action trace。Log / Backlog、Rollback Stack、Trace 都应是独立状态或可选调试产物。普通存档只存继续剧情所需的最小叙事状态。

`ValidateStateAgainstCurrentScript()` 倾向输出：

```text
compatible
migratable
incompatible
```

它只报告能否加载、能否迁移、失败原因和可能的附近位置，不应静默修状态。

P3 Round 11 当前实现遵守该边界：普通 Runtime State 不默认包含完整 Log、完整 query/action trace 或完整 Rollback stack；宿主 checkpoint 只作为 opaque id 保存。

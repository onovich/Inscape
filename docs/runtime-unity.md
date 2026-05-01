# 运行时与 Unity 宿主

状态：草案

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

当前已经有 CLI 原型：`export-bird-project <root> -o <output-dir>`。细节见 [Bird Adapter 原型](bird-adapter.md)。

Unity Editor Importer 的可复制原型位于 `tools/unity-bird-importer/`，设计说明见 [Unity Editor Importer 草案](unity-editor-importer.md)。它读取 `bird-manifest.json` 并生成 / 更新 Bird `TalkingSO`，但不让 `Inscape.Core` 依赖 Unity。

关键原则：

- Inscape 的行级 hash 仍是源文本和翻译流转的稳定锚点。
- Bird 的 `talkingId/index` 是 Adapter 输出层的运行时坐标。
- 角色、资源、Timeline 等宿主对象通过项目配置或宿主 Schema 绑定，不写死进 DSL Core。
- Inscape 节点名用于作者可读的图结构入口；一个节点可以映射为多个 `TalkingTM`，由 Adapter 按 speaker、anchor、display、effect 和跳转结构切分。

## 初始能力

- 加载编译后的 IR。
- 顺序执行对白、旁白和演出标签。
- 处理基础变量、条件和选择。
- 通过状态 Store 保存叙事变量和执行位置。
- 调用 Unity UI 显示文本和选项。
- 调用资源系统切换背景、立绘和音频。
- 支持基础存档和读档。

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

## 存档策略草案

存档至少需要包含：

- 当前脚本锚点或节点锚点。
- 当前指令偏移。
- 叙事 Store 快照。
- 编译器和 IR 版本。
- 必要的执行历史或 Action 日志。

是否需要完整 Action 回放，取决于性能、存档体积和确定性需求。

# 运行时与 Unity 宿主

状态：草案

## 目标

Unity 宿主的第一目标是解释执行 Compiler Core 输出的 IR，并将叙事 Command 转换为 Unity 中的 UI、角色立绘、背景、音频和分支交互。

它不应该成为 DSL 编译器的第二份实现。运行时只消费编译产物和资源引用。

## 与 Bird 当前项目的关系

当前 Bird 项目中，`StorySystem` 与 `DirectorSystem` 已经形成两层剧情能力：

调研入口：`D:\UnityProjects\Bird\Assets`。详细记录见 [Bird / Unity 调研记录](bird-unity-research.md)。

- StorySystem：负责幕、触发器、对话节点、选项、物品条件和 UI 推进。
- Talking 数据：`TalkingTM` 包含 `talkingId`、`nextTalking`、`options`、`roleId`、`textAnchorIndex` 和 `effects`，接近 Inscape 的节点与边。
- L10N：当前对话文本以 `talkingId + index` 查询，`L10N_Talking.csv` 格式为 `ID,ZH_CN,EN_US,ES_ES`，文本可通过 `<pr>` 拆段。
- DirectorSystem：负责 Timeline 队列，以 `TimelineEffectTM` 表达带时间的演出、音频、背景、立绘、道具和对话播放。

因此第一阶段建议：

- Inscape 先编译到引擎无关的 Narrative Graph IR。
- Unity Adapter 再把 IR 映射到 Bird 可消费的 Talking/L10N 数据；短期优先生成 manifest 和 CSV，再由 Unity Editor Importer 生成或更新 ScriptableObject。
- Timeline 先作为可引用的外部演出资源，例如“进入节点时播放 timeline X”。
- 暂不让 DSL 直接生成 Timeline；Timeline 是跨 Story、Feeling、Play、Explore 的演出编排层，后续应作为 Presentation IR 或宿主 Schema 单独讨论。

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

- ScriptableObject 存储编译后的指令流。
- Addressables 管理背景、立绘、音频、视频等资源。
- MonoBehaviour 作为宿主入口，负责加载 IR 和连接 UI。
- 自定义 Inspector 用于调试当前执行位置、Store 和指令队列。

## 扩展边界

插件化扩展应允许项目接入自定义指令，例如战斗、小游戏、复杂 UI、特殊镜头或成就系统。

第一版暂不设计自定义指令。后续需要先回答：自定义指令是叙事图的边、节点元信息、Timeline 效果，还是宿主层查询和命令 Schema。

待确认：

- 自定义指令是否需要编译期 Schema。
- Unity 端扩展是否通过 C# Attribute、ScriptableObject 注册表，还是配置文件。
- 编辑器如何识别扩展指令并提供补全和诊断。
- 自定义指令是否允许改变叙事 Store，还是只能发出受控 Action。

## Timeline 调研方向

- Bird 现有 Timeline 是否适合作为“演出资源”，由 DSL 节点引用。
- DSL 是否需要表达节点进入、退出、选项选择时的 Timeline Hook。
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

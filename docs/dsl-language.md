# DSL 语言设计草案

状态：基线 + 草案，语法未定稿

如果你想看一份面向作者、偏“怎么写”的说明，请先读 [Inscape 语法说明](dsl-syntax-guide.md)。本文更偏设计边界、候选方案和未定项。

## 设计原则

- 优先保持阅读连续性，避免让普通对白充满控制符。
- 普通文本应该容易写，复杂逻辑应该清楚地显式表达。
- 解析结果必须确定，同一份脚本在同一编译器版本下产生稳定 IR。
- 语法错误要能定位到行和列，并尽量给出修复建议。
- 文本、标签、变量和分支都要能映射到源位置和锚点。
- DSL 只表达叙事数据，不直接绑定 Unity、业务实体、服务端或具体运行时 API。
- 尽量不让缩进承担核心语义，降低注意力负担。
- 语法应兼容中文书写习惯，至少要考虑全角标点与中文标题场景。
- 行级身份应尽量对作者隐身；即使未来需要显式可见，也应优先通过编辑器折叠或弱化呈现。

## 当前已确认的语言边界

> 2026-05-16 语法收敛补充：`@` / `[]` 的新设计方向见 [Authoring Marker Contract](authoring-marker-contract.md)。后续优先把 `@` 用作事件、动作、时机和状态变化，把 `[]` 用作查询、读取和文本插值。历史 `[timeline: ...]` / `[kind: alias]` 仍可作为兼容遗留审计，但不再作为推荐方向扩展。
>
> 2026-05-17 块语法补充：Compiler 第一刀已支持 `# 标题` 节点声明、中文标题跳转、项目内重复标题诊断，以及标题前缺空行的 info 级 style hint。旧 `:: node.name` 仍兼容；VSCode 高亮、补全、跳转和自动 `_01` 编号将在后续 Goal 4 跟进。

- 叙事结构采用图模型。节点可以形成链、树、回环和一般有向图，不强制单向流。
- 块级叙事单元必须使用显式节点标题 / 名称，便于跳转、复用、调试、图视图和协作讨论。
- 第一版多文件项目内的节点标题 / 名称全局唯一，跨文件跳转不需要 `include`。
- 第一版项目入口使用节点内 metadata `@entry` 声明；未声明时兼容回退到按文件路径排序后的第一个节点，并产生提示诊断。
- 项目级 CLI 支持 `--entry node.name` 临时覆盖入口，方便调试任意节点；这不会修改源文件，也不会替代 `@entry` 作为项目默认入口声明。
- 行级文本使用隐式哈希锚点，服务本地化、存档、热重载和源映射。
- 第一版不设计变量、条件查询和自定义指令。
- 变量与状态查询从第二版开始设计，DSL 只保存面向数据的表达式，由宿主层解析并执行具体查询。
- 第一阶段需要提供 VSCode 语言支持和 HTML 调试预览，作为 DSL 设计反馈环的一部分。
- Timeline 在第一版只作为宿主演出资源引用，不进入完整时间轴语义。

## 第一版节点标题 / 名称规则

长期推荐写法是作者可见标题：

```inscape
# 法庭开场

旁白：法庭里很安静。
-> 询问证人

# 询问证人

证人：我什么都不知道。
```

规则：

- `# 标题` 声明一个节点。
- 标题在项目内必须唯一。
- 标题前建议留空行；漏空行是 info 级 style hint，不是编译错误。
- 标题不直接作为长期机器 ID；stable node id 由 sidecar 维护，详见 [Stable Node ID Contract](stable-node-id-contract.md)。

### Legacy node name

旧 `:: node.name` 仍兼容。旧节点名采用小写 ASCII 层级名，例如：

```text
court.intro
court.cross_exam.loop
evidence.menu
```

规则：

- 必须以小写字母开头。
- 允许小写字母、数字、下划线、短横线和点。
- 点用于层级分段。
- 不能包含空格、中文、冒号、斜杠或反斜杠。
- 不能连续出现点，不能以点结尾。
- 每个分段必须以小写字母或数字结尾。

这些规则继续服务旧项目、迁移工具、URL/JSON 安全性和过渡期调试。

## 图叙事模型

Inscape 的源文件不是线性脚本，也不是完整游戏引擎语言。它首先描述一个 Narrative Graph：

- Node：显式命名的叙事块，是跳转、复入、存档和图视图的主要结构单位。
- Line：对白、旁白或选项文本，是本地化与行级锚点的主要单位。
- Edge：节点之间的跳转关系，可以来自默认下一节点、选项、显式跳转或宿主触发。
- Metadata：角色、标签、资源引用、显示策略等可选数据。

兼容写法：

```inscape
:: court.cross_exam.intro

@entry
旁白：法庭里很安静。
成步堂：现在开始吧。

? 选择行动
  - 询问证言 -> court.cross_exam.loop
  - 查看证物 -> evidence.menu

:: court.cross_exam.loop

证人：我什么都不知道。
-> court.cross_exam.intro
```

标题式写法：

```inscape
# 法庭开场
成步堂：现在开始吧。
真宵：嗯。

# 证言循环
证人：我什么都不知道。
-> 法庭开场
```

这类写法已进入 Compiler 第一刀。它更接近 Markdown 与文章结构；后续仍需补 VSCode authoring 支持和 stable node id 落盘实现。

## 已有方向

### 自然对话

目标是支持接近自然剧本的写法：

```inscape
明里：你真的要进去吗？
悠：如果现在停下，就永远不会知道里面有什么。
```

待确认：

- 角色名和对白之间使用全角冒号、半角冒号，还是两者都支持。
- 旁白是否允许无角色名直接书写。
- 多行对白如何表达。
- 角色别名、本地化显示名、语音资源如何绑定。

### 查询插值与旧行内标签

`[]` 的新设计方向是文本内查询 / 插值：它只读取当前上下文中的值，不负责触发事件或修改状态。

F1.8 已将第一版边界冻结到 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md)：文本插值优先使用简单路径，例如 `[player.gold]`、`[itemName]`、`[delta.affection]`；函数调用、异步查询和失败策略保留为后续设计；`[]` 不用于事件、资源调度、状态修改或具体宿主 API 调用。

```inscape
旁白：[player.name]推开了门。
系统：获得了[itemName]。
老板娘：你还剩[player.gold]枚金币。
```

待确认：

- 查询失败时显示 fallback、产生诊断，还是运行时中断。
- 查询值是否允许异步，以及异步值如何影响打字机、预览和本地化。
- 查询插值如何与本地化占位符稳定结合。

历史原型曾使用 `[bg: classroom]`、`[show: akari happy at center]`、`[timeline: alias]` 表达资源别名或宿主绑定。它们当前只能视为兼容旧写法，不再作为 `[]` 的推荐主线。

### Timeline Hook 原型

第一版 Bird Adapter 支持最小 Timeline Hook：

```inscape
:: court.opening

旁白：法庭的灯光慢慢亮起。
@timeline court.opening.pan
成步堂：现在开始吧。
```

兼容旧写法：

```inscape
[timeline: court.opening.pan]
```

当前语义：

- `@timeline alias` 是 metadata / host event hook，不参与本地化，不生成行级文本锚点。
- `[timeline: alias]` 是历史兼容写法，当前仍可能被 UnitySample / VSCode 识别，但不再作为新推荐模型。
- 默认 phase 为 `talking.exit`，兼容 Bird 当前 `TalkingEffectTM.PlayTimeline` 的落点。
- 可显式写出 phase：

```inscape
@timeline.talking.exit court.opening.pan
@timeline.talking.enter court.line_enter
@timeline.node.enter court.node_enter
[timeline.node.exit: court.node_exit]
```

- `talking.exit`：绑定到同节点内最近的前一个可见 talking；如果写在节点开头，则绑定到该节点第一条 talking。
- `talking.enter`：绑定到同节点内 hook 后面的下一条可见 talking；如果没有下一条 talking，则产生无法挂载 warning。
- `node.enter`：绑定到该节点第一条可见 talking。
- `node.exit`：绑定到该节点最后一条可见 talking。
- `alias` 应通过宿主桥接配置映射到项目内部 ID、资源坐标或事件处理器；当前 UnitySample 实验样例临时使用 `--unity-sample-binding-map`。
- UnitySample Adapter 会把它导出为 manifest 的 `hostHooks`，保留 `phase` 和 `targetTalkingId`。
- 当前这仍是实验 adapter 行为。长期应把 Timeline 视为宿主事件示例，避免 DSL 提前变成完整演出时间轴。
- 它只表达“这里引用一个宿主演出资源”，不描述 Timeline 内部的轨道、关键帧、时长或资源组合。
- 当前作者反馈已经收敛为：新写法优先用 `@timeline.<phase> alias` 表达宿主事件 / 时机；bracket timeline 只作为兼容残留审计。

待确认：

- 多个 hook 的执行顺序、失败策略和调试显示方式。
- 非 Bird 宿主是否沿用 `timeline` 这个术语，还是改为更通用的 `presentation` / `cue`。

### 项目入口

第一版使用节点内 metadata 声明项目入口：

```inscape
:: main.start

@entry
旁白：故事从这里开始。
```

规则：

- 一个项目最多只能声明一个 `@entry`。
- `@entry` 必须写在节点内部，作为该节点的 metadata 行。
- 未声明 `@entry` 时，编译器会回退到按文件路径排序后的第一个节点，并产生 `INS032` 信息诊断。
- 多个 `@entry` 会产生 `INS031` 错误诊断。
- 项目级 CLI 可通过 `--entry node.name` 临时指定入口。缺失的覆盖入口会产生 `INS034`；非法入口名会产生 `INS033`。

### 条件与变量

第二版开始再考虑简单叙事逻辑。当前倾向是：DSL 只表达查询，不负责具体状态来源和执行行为。

```inscape
- 出示怀表 when has_item("watch") -> present_watch
- 继续询问 when evidence_seen("photo") -> ask_photo
```

待确认：

- 表达式语法是否只允许声明式谓词，例如 `has_item("watch")`。
- 宿主层如何注册可用查询 Schema。当前已有 [宿主 Schema 草案](host-schema.md)，但还没有绑定到条件语法。
- 查询失败时是编译错误、运行时不可用，还是选项隐藏。
- 是否需要区分本地状态、远端状态和异步查询。
- 查询表达式是否允许副作用。当前倾向是不允许。

### 事件与宿主动作

用户当前倾向不是在 DSL 第一版做通用自定义指令，而是把“事件/动作”视为宿主绑定问题。较合理的演进方向是：

- DSL 中只表达“这里引用了某个宿主动作/回调/演出别名”。
- 编译阶段自动汇总被引用的动作清单，未被引用的项目在下次编译时清空。
- 引擎集成阶段可从宿主代码中扫描带特定属性的方法，生成可补全的宿主能力清单。

这一方向与“DSL 只做数据表达，不做控制反转”保持一致，但具体语法和注册协议仍未定稿。

当前第一步是把查询与事件能力沉淀为 `inscape.host-schema` JSON 文件，详见 [宿主 Schema 草案](host-schema.md)。它可以由手工维护，也可以由 Unity/Bird 连接层或后续烘焙器生成。

## 候选语法元素

- `:: node.name`：显式节点名，用于跳转、图视图、调试和复入。
- `?`：选项组。
- `- option -> target`：选项文本与目标节点。
- `-> target`：显式跳转到节点。
- `@entry`：项目入口节点声明。
- `@timeline alias`：Timeline Hook 原型，只引用宿主演出事件，不表达时间轴内部逻辑。
- `@timeline.<phase> alias`：显式 Timeline Hook phase。当前支持 `talking.enter`、`talking.exit`、`node.enter`、`node.exit`。
- `[timeline: alias]` / `[timeline.<phase>: alias]`：兼容旧写法，不作为新推荐语法扩展。
- `# 标题`：更写作化的块级候选语法，尚未采用。
- `call` / `return`：子场景调用，是否需要待确认。
- `include`：物理包含或导入语义是否需要待确认；第一版跨文件跳转不依赖 `include`。
- `//`：注释。是否支持块注释待确认。

## 暂不确定的设计边界

- 分支合流是否需要显式语法。
- 是否支持宏、模板或自定义语法扩展。
- 是否允许在 DSL 中直接写复杂演出时间轴。
- 显式节点名是否也需要生成稳定机器 ID。
- 默认下一节点如何表达：依赖文件顺序，还是必须显式 `->`。
- 项目入口是否还需要配置文件或 CLI 参数覆盖 `@entry`。
- 是否需要让编辑器显示“显式 hash 但默认隐藏”，以便块内每行本地化身份可见但不干扰阅读。

## 下一步建议

1. 继续迁移 `@` / `[]` 的兼容残留：新示例使用 `@` 表达事件 / 时机，用 `[]` 表达查询 / 插值；旧 `[kind: alias]` 只在兼容说明中出现。
2. 明确 `:: node.name` 与 `# 标题` 两类块语法的取舍，尤其是“跳转目标命名”和“标题可读性”是否必须解耦。
3. 基于显式 Timeline Hook phase 做一次带真实绑定的 Bird Import Dry Run，确认 `talking.exit` 落地和其他 phase warning 是否符合预期。
4. 设计节点重命名、重复文本插入和文本轻微改写时的迁移策略。
5. 结合 Bird 的 `L10N` 格式重新评估本地化 CSV 的字段和列顺序。

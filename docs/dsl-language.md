# DSL 语言设计草案

状态：基线 + 草案

如果想看面向作者的“怎么写”，请先读 [Inscape 语法说明](dsl-syntax-guide.md)。本文更偏设计边界、候选方向和未定项。

## 设计原则

- 普通文本要容易写，复杂逻辑显式表达。
- 解析结果必须稳定，同一脚本在同一编译器版本下产生稳定 IR。
- 语法错误要定位到行列，并尽量给出修复建议。
- 文本、标签、查询和跳转都要能映射到源位置和锚点。
- DSL 只表达叙事数据，不直接绑定 Unity、业务实体、服务端或具体运行时 API。
- 语法应兼容中文写作习惯，包括全角标点与中文标题。

## 当前已确认边界

- 块级叙事单元使用 `# 标题`。
- 标题在项目内全局唯一。
- 标题前缺空行只产生 info 级 style hint。
- `:: node.name` 已退出当前 Compiler / VSCode 主路径。
- 第一版项目入口使用节点内 `@entry`。
- 项目级 CLI 支持 `--entry 标题` 临时覆盖入口。
- 行级文本使用隐式 hash 锚点，服务本地化、存档、热重载和源映射。
- `@` 表达事件、动作、时机、状态变化和元信息。
- `[]` 表达只读查询 / 文本插值。
- Timeline 当前只是宿主演出事件示例，不进入完整时间轴语义。

## 节点标题

```inscape
# 法庭开场

旁白：法庭里很安静。
-> 询问证人

# 询问证人

证人：我什么都不知道。
```

标题是作者可见身份，不直接作为长期机器 ID。stable node id 由 sidecar 维护，详见 [Stable Node ID Contract](stable-node-id-contract.md)。

## 图叙事模型

Inscape 源文件首先描述 Narrative Graph：

- Node：显式命名的叙事块。
- Line：对白、旁白或选项文本。
- Edge：节点之间的跳转关系。
- Metadata：入口、场景、宿主事件、标签等轻量数据。

## 查询插值

`[]` 的当前方向是文本内查询 / 插值，只读取当前上下文，不触发事件或修改状态。

```inscape
旁白：[player.name]推开了门。
系统：获得了[itemName]。
老板娘：你还剩[player.gold]枚金币。
```

第一版只把简单路径视为 query interpolation 候选。函数调用、异步查询、失败策略和条件表达式留给后续设计。

## Timeline Hook

```inscape
@timeline court.opening.pan
@timeline.talking.exit court.outro
@timeline.talking.enter court.line_enter
@timeline.node.enter court.node_enter
@timeline.node.exit court.node_exit
```

当前语义：

- `@timeline alias` 是 metadata / host event hook。
- 默认 phase 为 `talking.exit`。
- 支持 `talking.enter`、`talking.exit`、`node.enter`、`node.exit`。
- `alias` 应通过 Host Bridge 映射到项目内部 ID、资源坐标或事件处理器。
- DSL 不描述 Timeline 内部轨道、关键帧、时长或资源组合。

## 项目入口

```inscape
# 开场
@entry

旁白：故事从这里开始。
```

- 一个项目最多只能声明一个 `@entry`。
- `@entry` 必须写在节点内部。
- 未声明时，编译器会回退到按文件路径排序后的第一个节点，并产生 `INS032` 信息诊断。
- 多个 `@entry` 会产生 `INS031` 错误诊断。

## 候选语法元素

- `# 标题`：显式节点标题。
- `?`：选项组。
- `- option -> target`：选项文本与目标节点。
- `-> target`：显式跳转。
- `@entry`：项目入口节点声明。
- `@timeline alias` / `@timeline.<phase> alias`：宿主演出事件 hook。
- `@emit eventName`：宿主事件提示。
- `[query.path]`：文本内只读查询插值。
- `call` / `return`：子场景调用，待确认。
- `include`：物理包含或导入语义是否需要，待确认。
- `//`：行注释。

## 不再属于当前语法

- `:: node.name`
- `[timeline: alias]`
- `[timeline.<phase>: alias]`
- `[kind: alias]`
- `[bg: alias]`

这些只保留为历史审计背景，不再作为当前 Compiler、VSCode 或样例 adapter 的主路径能力。

## 下一步建议

1. 实现 stable node id 与标题重命名迁移。
2. 继续实现本地化 diff / alignment。
3. 推进 VSCode 语义能力从 JS provider 迁到 LanguageServer。
4. 把 Host Schema endpoint 收口到 LanguageServer / Tooling 契约。

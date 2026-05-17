# Inscape 语法说明

状态：当前作者指南

本文面向脚本作者，解释 Inscape 当前“已经能写、已经能用”的语法。候选语法、长期边界和历史讨论见相关 ADR 与设计草案。

## 一眼看懂

Inscape 当前可以先理解成五类东西：

1. `# 标题`
   - 定义一个可跳转的剧情块。
2. `角色：对白` / `旁白文本`
   - 写剧情正文。
3. `? 提示` + `- 选项 -> 目标标题`
   - 写选择与分支。
4. `-> 目标标题`
   - 显式跳到别的剧情块。
5. `@...` 与 `[...]`
   - `@` 写事件、动作、时机和状态变化；`[]` 在正文里查询/读取当前值。

## 最小例子

```inscape
# 法庭开场
@entry
@scene courtroom
@timeline.talking.exit court_intro

旁白：法庭里很安静。
成步堂：[player.name]，先从证言开始吧。

? 你要做什么？
- 询问证言 -> 询问证人
- 查看证物 -> 查看证物

# 询问证人

证人：我什么都不知道。
-> 法庭开场
```

## 节点

```inscape
# 法庭开场
```

- 标题是作者可见的剧情块名称。
- 项目内标题必须全局唯一。
- `# 标题` 结束上一个节点并开始新节点。
- 标题前建议留一个空行；漏空行只产生 style hint，不阻止编译。
- `:: node.name` 已退出当前语法，不再作为可编译块声明。

长期机器身份由 stable node id 维护，详见 [Stable Node ID Contract](stable-node-id-contract.md)。

## 正文

对白：

```inscape
成步堂：异议！
Witness: I know nothing.
```

旁白：

```inscape
法庭里一片安静。
```

规则：

- 支持全角 `：` 和半角 `:`。
- 冒号前面会被识别为 speaker。
- 冒号后面或无 speaker 的普通文本是玩家可见正文。

## 选择

```inscape
? 你要做什么？
- 询问证言 -> 询问证人
- 查看证物 -> 查看证物
```

- `?` 行是选择提示。
- `-` 后面是玩家看到的选项文本。
- `->` 后面是选中后的目标标题。

## 跳转

```inscape
-> 法庭开场
```

- 跳转不显示给玩家。
- VSCode 中可以 Ctrl+Click 跳到目标标题。

## `@...`

`@` 行是事件、动作、时机或元信息标记。

常见例子：

```inscape
@entry
@scene courtroom
@timeline court_intro
@timeline.talking.exit court_outro
@timeline.node.enter camera_push
@emit door_opened
```

- `@entry` 声明项目入口。
- `@scene` 是轻量语义标签。
- `@timeline...` 表达宿主演出事件的可读 ID 和触发时机；实际项目映射来自 Host Bridge。
- `@emit` 表达宿主事件；提示数据来自 Host Schema。

## `[...]`

`[]` 是文本内查询 / 插值标记，只读取当前上下文并拼进玩家可见文本。

```inscape
旁白：[player.name]推开了门。
系统：获得了[itemName]。
老板娘：还剩[player.gold]枚金币。
```

- `[]` 不触发事件。
- `[]` 不修改状态。
- `[]` 不调度宿主资源。
- 静态人名、物品名、地点名不需要强行包进 `[]`。

## `@` 和 `[]` 的区别

- `@` 回答“这里发生什么、何时发生、改变什么”。
- `[]` 回答“这里显示什么当前值”。

推荐用法：

- 入口声明：`@entry`
- 块语义标签：`@scene xxx`
- hook 时机：`@timeline.<phase> alias`
- 动态文本值：`[player.name]`、`[itemName]`、`[player.gold]`

## 不再支持的旧写法

研发期没有真实用户和发布契约，Goal 0 后不继续维护旧语法兼容：

- `:: node.name` 不再声明节点。
- `[timeline: alias]` / `[kind: alias]` / `[bg: alias]` 不再作为 host binding。
- VSCode、Compiler、UnitySample 主路径都不再把这些写法当作当前能力。

历史背景保留在 ADR、审计文档和旧阶段记录中，不再放进作者主路径指南。

## 注释

```inscape
// 这是一行注释
```

注释不会进入剧情正文。

## VSCode 体验

- `# 标题` 支持高亮、Outline、补全、跳转、引用和 CodeLens。
- `@timeline ...` 可 Ctrl+Click 到 Host Bridge 绑定来源或工作区 hook。
- `[query.path]` 可获得 Host Schema query 补全与 Hover。
- 正文文本 Ctrl+Click 可以打开或刷新预览，并定位到对应节点页面。

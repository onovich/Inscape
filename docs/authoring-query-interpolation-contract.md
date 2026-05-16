# Authoring Query Interpolation Contract

状态：草案，F1.8 查询插值边界

最后更新：2026-05-16

本文冻结 `[]` 在第一版查询插值中的职责边界。它承接 [Authoring Marker Contract](authoring-marker-contract.md)：`@` 表达事件、动作、时机和状态变化；`[]` 只表达查询、读取和玩家可见文本内插值。

本文不改变当前 Compiler 行为。当前 Compiler 仍把正文作为文本处理；本文用于约束后续 VSCode、LanguageServer、Runtime、Host Schema 和本地化设计。

## 结论

第一版 `[]` 只做只读查询插值：

```text
[] reads values.
[] does not trigger behavior.
```

也就是说，`[]` 可以把当前上下文、运行时状态或上一个动作产生的显示值拼进玩家可见文本，但不得触发事件、调度资源、修改状态、调用业务 API 或绑定具体宿主实体。

## 第一版推荐形态

第一版优先采用简单路径表达式：

```inscape
旁白：[player.name]推开了门。
系统：获得了[itemName]。
老板娘：收你[player.goldSpent]枚金币，还剩[player.gold]枚。
系统：当前理智值：[player.sanity]/[player.maxSanity]
系统：与艾琳的好感度提升了[delta.affection]。
```

建议边界：

- 允许 `[name]`、`[namespace.name]`、`[namespace.subName.value]` 这类点分路径。
- 允许路径表达“当前上下文的临时值”，例如 `[itemName]`、`[delta.affection]`。
- 暂不把函数调用作为文本插值第一版主线，例如 `[relationship("mayoi")]` 先保留为候选。
- 条件表达式未来可以单独考虑谓词函数，例如 `when has_item("watch")`，但不因此扩展文本插值的第一版复杂度。
- 不在路径里表达宿主语言、服务端 endpoint、Unity 类型名、C# 方法名或数据库 key。

## 不允许的职责

`[]` 不用于：

- 触发事件：不要用 `[emit:door_opened]`。
- 修改状态：不要用 `[set:player.gold -= 10]`。
- 授予物品：不要用 `[item:silver_dagger]` 表达“获得物品”。
- 调度资源：不要把 `[timeline: court_intro]`、`[bg: courtroom]` 作为新推荐写法。
- 绑定静态实体：不要把普通正文里的固定人名写成 `[character:艾琳]`。
- 直接调用宿主：不要写 `[Unity.Inventory.HasItem(10023)]`、`[GET /player/gold]` 或类似业务 API。

这些需求应分别落到：

- `@emit`、`@grant`、`@set`、`@timeline.<phase>` 等事件 / 动作写法。
- Host Schema 的 query / event 能力清单。
- Host Bridge 的项目内部 ID、资源坐标、事件处理器和查询实现映射。
- 正文自然文本。

## 真实使用场景

适合 `[]` 的场景通常有一个共同点：作者需要显示“此刻的值”，而不是声明“这个词属于哪个实体”。

```inscape
系统：获得了[itemName]。
系统：背包容量：[inventory.used]/[inventory.capacity]
旁白：[player.name]把证物放到桌上。
系统：本轮追加证据：[delta.evidenceCount] 件。
老板娘：你还欠我[debt.remaining]枚金币。
```

不建议为了结构化而改写静态正文：

```inscape
系统：与艾琳的好感度提升了[delta.affection]。
```

这里的“艾琳”是固定正文，只有变化量适合查询。除非显示名必须随语言、存档、玩家选择或审校工具动态变化，否则不需要写成 `[character:艾琳]` 或 `[character.eileen.displayName]`。

## 查询失败与异步边界

第一版先冻结作者语义，不急着规定完整运行时策略。

建议默认规则：

- 编译器不直接执行查询，也不因为查询值不存在而绑定具体宿主错误。
- Tooling / VSCode / LanguageServer 可以基于 Host Schema 给出“未知查询”提示，但不应把宿主实现缺失当作 Compiler 语义真相。
- Runtime Host 或 adapter 负责决定查询失败时显示 fallback、保留占位符、跳过文本、报错中断或记录运行时诊断。
- 文本插值第一版尽量按同步可读值设计；异步查询若存在，应由宿主在进入文本前准备好值，避免打字机、预览和本地化流程被远端延迟打断。

## 本地化与预览边界

本地化提取不应执行 `[]` 查询。它应保留占位符文本，让译文和审校流程看到稳定占位：

```text
获得了[itemName]。
```

后续如果引入本地化占位符规范，可以把 `[itemName]` 映射为翻译表中的参数名，但不要在提取阶段替换成某个具体物品名。跨本地化、预览和 Host Schema 提示的最小数据形态见 [Query Interpolation Data Contract](query-interpolation-data-contract.md)。

HTML 预览和 VSCode 预览在没有 Runtime Host 时，可以保留原占位符或使用调试假值；这只是预览策略，不改变 DSL 语义。

## Host Schema / Host Bridge 关系

Host Schema 可以声明哪些查询可用：

```json
{
  "queries": [
    {
      "name": "player.gold",
      "returnType": "number",
      "isAsync": false
    }
  ]
}
```

Host Bridge 再把这个可读查询映射到项目内部实现：

```json
{
  "queries": [
    {
      "name": "player.gold",
      "handler": {
        "kind": "generated-dispatcher",
        "memberName": "GetPlayerGold"
      }
    }
  ]
}
```

关键边界是：脚本侧只写 `[player.gold]`，不写项目内部字段、服务端接口或宿主语言调用。

## 兼容旧写法

历史 `[kind: alias]` inline host binding 仍作为兼容事实存在，例如 `[timeline: court_intro]`、`[bg: courtroom]`。F 阶段不要求立即删除旧行为，但新增文档、样例和工具提示不应继续把它们当作 `[]` 的推荐语义。

旧资源绑定应迁到 `@` 事件 / 时机：

```inscape
@timeline.talking.exit court_intro
@scene courtroom
```

玩家可见文本里的动态值继续使用 `[]`：

```inscape
旁白：[player.name]站在法庭中央。
```

## F1.8 自检结论

- 本文没有引入 Compiler、Unity、VSCode 或服务端绑定。
- `[]` 被限制为只读查询 / 文本插值，不承载事件、资源调度或状态修改。
- 简单路径优先，函数调用和条件谓词保留为后续设计，不混进第一版文本插值。
- 静态正文不强行结构化，避免把普通人名、物品名、地点名都变成查询。
- Host Schema / Host Bridge 只承担能力声明与宿主映射，不把宿主内部 API 暴露给 DSL。

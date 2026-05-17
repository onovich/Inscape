# Authoring Marker Contract

状态：Accepted

最后更新：2026-05-17

本文记录 `@` 与 `[]` 的策划侧分工。Goal 0 后，本文只描述当前推荐语法和工具主路径；历史 `[kind: alias]` inline host binding 不再作为当前能力维护。

## 结论

`@` 主要表达事件、动作、时机和状态变化。

`[]` 主要表达查询、读取和文本插值。

一句话规则：

```text
@ 负责改变世界；[] 负责读取当前上下文并拼进文本。
```

## `@` 的职责

`@` 是行级或节点级系统标记。它不参与玩家可见文本拼接，适合表达会影响运行流程、宿主事件、入口声明或时机挂载的内容。

推荐用法：

```inscape
@entry
@emit door_opened
@grant item silver_dagger
@set player.gold -= 10
@timeline.talking.exit court_intro
```

说明：

- `@entry` 声明项目入口。
- `@emit` 触发宿主事件。
- `@grant`、`@set` 表达状态变化。
- `@timeline.talking.exit` 是带时机的宿主演出事件挂载。

`@` 不负责把值拼进正文。需要玩家看到的动态值，应由后续文本使用 `[]` 查询。

## `[]` 的职责

`[]` 是文本内部的查询或插值标记。它属于玩家可见文本的一部分，适合读取当前上下文、运行时状态或上一动作产生的显示值。

推荐用法：

```inscape
旁白：[player.name]推开了门。
系统：获得了[itemName]。
老板娘：收你[player.goldSpent]枚金币，还剩[player.gold]枚。
系统：当前理智值：[player.sanity]/[player.maxSanity]
```

说明：

- `[player.name]` 查询玩家显示名。
- `[itemName]` 查询刚刚获得物品的显示名。
- `[player.gold]` 查询当前上下文中的数值。

`[]` 不负责触发事件、修改状态或调度宿主资源。

## 静态文本不强行结构化

普通静态人名、地名、物品名和术语不应为了“可结构化”而强行写成 `[]`。

推荐：

```inscape
系统：与艾琳的好感度提升了[delta.affection]。
```

不推荐：

```inscape
系统：与[character:艾琳]的好感度提升了[delta.affection]。
```

除非某个名字必须由运行时决定、由本地化表统一替换，或需要富文本、悬停、审校等明确工具能力，否则应保持正文自然可读。

## 动作与显示值分离

当一个行为既改变世界、又需要向玩家展示结果时，优先拆成 `@` 动作和 `[]` 查询。

推荐：

```inscape
@grant item silver_dagger
系统：获得了[itemName]。
```

不推荐：

```inscape
系统：获得了[item:silver_dagger]。
```

前者让“发放物品”和“显示文本”各自清楚：动作由 `@grant` 表达，显示名由 `[itemName]` 查询。

## Host Schema / Host Bridge 边界

`[]` 查询可以由 Host Schema 声明能力，由 Host Bridge 映射到项目内部实现。例如：

```inscape
系统：你还有[player.gold]枚金币。
```

长期含义是：

- Host Schema 声明 `player.gold` 这类可查询值或查询函数。
- Host Bridge 把 Inscape 侧可读查询映射到项目内部状态、服务或生成代码。
- Compiler 不直接知道 Unity、Bird、服务端或业务实体。

`@` 事件也走同一分层：

```inscape
@emit door_opened
```

长期含义是：

- Host Schema 声明可触发事件。
- Host Bridge 映射事件处理器。
- Adapter / Runtime Host 负责实际调用。

## 不再属于当前主路径的写法

历史原型中出现过 `[timeline: alias]`、`[timeline.node.exit: alias]`、`[bg: alias]` 这类 inline host binding 写法。Goal 0 后，当前工具主路径不再把它们当作 host binding、资源调度或查询插值能力。

当前规则：

- 新文档、新样例和工具提示只展示 `@timeline.<phase> alias`、`@emit eventName` 等事件写法。
- 带冒号的 `[kind: alias]` 不属于第一版 `[]` 查询插值。
- 旧写法只可出现在 ADR、历史审计、迁移说明或 ExternalSupport 原型背景中。

## 判断清单

写脚本时可以用这组问题判断：

- 这行是否会触发、授予、设置、进入、退出、播放、调度或通知宿主？用 `@`。
- 这段玩家可见文本是否需要读取一个当前值？用 `[]`。
- 这个词只是静态人名、物品名、地点名或术语？直接写正文。
- 这个值是否来自上一个动作或当前运行时上下文？用 `[]`。
- 这个能力是否需要宿主实现？放在 Host Schema / Host Bridge，不把具体宿主 API 写进 DSL。

## 自检结论

- 本契约只描述当前推荐语法，不引入 Compiler、Unity、VSCode 或服务端绑定。
- `@` / `[]` 的心智模型已收敛为“事件 / 查询”。
- 历史 `[timeline: ...]` 写法不再作为当前能力扩展。
- 该方向符合命名与分层规范：Compiler 是语义真相，Host Schema / Host Bridge 承担宿主能力边界。

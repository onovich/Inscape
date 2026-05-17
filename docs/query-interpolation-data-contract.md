# Query Interpolation Data Contract

状态：草案，F1.9 跨工具数据契约

本文定义 `[]` 查询插值在本地化、预览和 Host Schema 提示之间的最小数据契约。它承接 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md)，不改变当前 Compiler 行为，也不要求立即实现新的表达式解析。

## 目标

`[]` 只做只读查询 / 文本插值。各工具应按以下边界处理：

- 本地化提取保留占位符，不执行查询。
- HTML / VSCode 预览在没有 Runtime Host 时保留占位符，或使用显式调试假值。
- Host Schema 只为查询名提供提示、补全和审计，不升级为 Compiler 语义真相。
- Host Bridge 可把查询名映射到项目实现，但不把项目内部 API 暴露给 DSL。

## 最小插值对象

后续工具如需识别 `[]`，应先归一化为轻量对象：

```json
{
  "raw": "[player.gold]",
  "query": "player.gold",
  "kind": "query-interpolation",
  "source": {
    "path": "story.inscape",
    "line": 12,
    "column": 8
  }
}
```

字段约定：

- `raw`：源码中的完整占位符文本。
- `query`：去掉方括号后的简单路径，例如 `player.gold`、`itemName`、`delta.affection`。
- `kind`：固定为 `query-interpolation`。
- `source`：Compiler source location 语义，沿用 1-based `line` / `column`；编辑器显示时再按 [Source Location Contracts](source-location-contracts.md) 转成 0-based 坐标。

## 查询名规则

第一版只把简单路径视为查询插值候选：

```text
itemName
player.name
player.gold
inventory.capacity
delta.affection
```

暂不纳入第一版数据契约：

```text
has_item("watch")
player.gold + bonus
timeline: court_intro
Unity.Inventory.HasItem(10023)
GET /player/gold
```

函数、运算和条件谓词属于后续表达式设计。宿主语言、服务端 endpoint 和业务内部 ID 不应进入 DSL 正文。

## 本地化契约

本地化提取必须保留原占位符文本：

```inscape
系统：获得了[itemName]。
```

输出的 `text` 字段仍应包含 `[itemName]`。

本地化工具不得：

- 在提取阶段执行查询。
- 把 `[itemName]` 替换成某个具体物品名。
- 因为 Host Schema 未声明 `itemName` 而拒绝提取文本。
- 把查询结果写进行级 hash 输入。

## 预览契约

HTML 预览和 VSCode 预览是作者体验层，不是 Runtime Host。没有宿主查询实现时，默认策略是保留原占位符。

允许后续显式提供调试假值：

```json
{
  "previewValues": {
    "itemName": "银色短剑",
    "player.gold": "42"
  }
}
```

调试假值必须满足：

- 只影响预览显示，不改变 Compiler IR、localization CSV 或 Runtime Host 输入。
- 来源明确，例如独立 preview config、编辑器调试面板或测试 fixture。
- 不从 Host Bridge 的项目内部 ID 反推显示文本。
- 缺失时优先保留 `[query]`，必要时给出预览级 warning。

## Host Schema 提示契约

Host Schema 可以声明查询能力：

```json
{
  "queries": [
    {
      "name": "player.gold",
      "returnType": "number",
      "isAsync": false,
      "description": "Current visible gold amount."
    }
  ]
}
```

工具层可以使用这些信息提供：

- 查询名补全。
- Hover 说明。
- 未知查询提示。
- 异步查询或返回类型提示。
- query / event 清单浏览。

Host Schema 提示不得变成 Compiler 真相。

## Host Bridge 映射契约

Host Bridge 可以把查询名映射到项目实现：

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

边界：

- DSL 只写 `[player.gold]`。
- Bridge 负责找到宿主实现。
- Adapter / Runtime Host 负责实际调用。
- 本地化和无宿主预览不执行 Bridge。
- Bridge 中的 handler、typeName、endpoint、GUID、资源路径等不得回写进 `.inscape` 正文。

## 与旧 bracket host binding 的区分

Goal 0 后，`[timeline: court_intro]`、`[bg: courtroom]`、`[emotion: tense]` 不再属于当前主路径能力。

区分规则：

- 简单路径，例如 `[player.gold]`：query interpolation。
- 带冒号的 `[kind: alias]`：旧 bracket host binding，当前工具不再作为 host binding 处理。
- 新宿主事件 / 时机：优先写成 `@timeline.talking.exit court_intro`、`@emit door_opened` 等 `@` 行。

## 自检结论

- 本文没有要求修改 Compiler，也没有把 Host Schema 升级为编译依赖。
- 本地化锚点继续由原文占位符稳定参与，不执行或替换查询。
- 预览 fallback 限制在作者体验层，不反向污染 IR、CSV 或 Runtime 输入。
- Host Schema / Host Bridge 的职责仍是提示与映射，不暴露宿主内部 API 给 DSL。

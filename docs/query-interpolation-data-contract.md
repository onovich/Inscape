# Query Interpolation Data Contract

状态：草案，F1.9 跨工具数据契约

最后更新：2026-05-16

本文定义 `[]` 查询插值在本地化、预览和 Host Schema 提示之间的最小数据契约。它承接 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md)，不改变当前 Compiler 行为，也不要求立即实现新的表达式解析。

## 目标

F1.8 已确认 `[]` 只做只读查询 / 文本插值。F1.9 进一步约束各工具如何看待这些插值：

- 本地化提取保留占位符，不执行查询。
- HTML / VSCode 预览在没有 Runtime Host 时保留占位符，或使用显式调试假值。
- Host Schema 只为查询名提供提示、补全和审查，不升级为 Compiler 语义真相。
- Host Bridge 只把查询名映射到项目实现，不把项目内部 API 暴露给 DSL。

## 最小插值对象

后续工具如果需要识别 `[]`，应先归一化为一个轻量对象：

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

- `raw`：源码中的完整占位符文本，包含方括号。
- `query`：去掉方括号后的简单路径，例如 `player.gold`、`itemName`、`delta.affection`。
- `kind`：固定为 `query-interpolation`，用于和 legacy inline host binding 区分。
- `source`：Compiler source location 语义，沿用 1-based `line` / `column`；编辑器显示时再按 [Source Location Contracts](source-location-contracts.md) 转成 0-based 坐标。

第一版不要求 Compiler 输出该对象；它只是未来 Tooling、LanguageServer、VSCode 和 Runtime Host 共享字段的候选形态。

## 查询名规则

第一版只把简单路径视为新查询插值候选：

```text
itemName
player.name
player.gold
inventory.capacity
delta.affection
```

暂不把这些形态纳入第一版数据契约：

```text
has_item("watch")
player.gold + bonus
timeline: court_intro
Unity.Inventory.HasItem(10023)
GET /player/gold
```

原因：

- 函数、运算和条件谓词属于后续表达式设计。
- `kind: alias` 是 legacy inline host binding，不属于新 `[]` 查询插值。
- 宿主语言、服务端 endpoint 和业务内部 ID 不应进入 DSL。

## 本地化契约

本地化提取必须保留原占位符文本：

```inscape
系统：获得了[itemName]。
```

输出的 `text` 字段仍应是：

```text
获得了[itemName]。
```

本地化工具不得：

- 在提取阶段执行查询。
- 把 `[itemName]` 替换成某个具体物品名。
- 因为 Host Schema 未声明 `itemName` 而拒绝提取文本。
- 把查询结果写进行级 hash 输入，导致运行时状态改变本地化锚点。

未来如果需要让翻译工具更清楚地处理参数，可以额外输出插值清单或占位符列，但 `text` 中的占位符必须保持稳定。

候选扩展字段：

```text
interpolations
```

示例值：

```json
[{"raw":"[itemName]","query":"itemName"}]
```

该字段只是后续候选，不进入当前 CSV 基线。

## 预览 fallback 契约

HTML 预览和 VSCode 预览是作者体验层，不是 Runtime Host。没有宿主查询实现时，默认策略应是保留原占位符：

```text
获得了[itemName]。
```

允许后续显式提供调试假值，例如：

```json
{
  "previewValues": {
    "itemName": "银色短剑",
    "player.gold": "42"
  }
}
```

但调试假值必须满足：

- 只影响预览显示，不改变 Compiler IR、localization CSV 或 Runtime Host 输入。
- 来源明确，例如独立 preview config、编辑器调试面板或测试 fixture。
- 不从 Host Bridge 的项目内部 ID 反推显示文本。
- 不把缺失值静默伪装成真实运行时结果；缺失时优先保留 `[query]`，必要时给出预览级 warning。

第一版预览不处理异步查询。异步值应由 Runtime Host 在进入文本前准备，或在后续 Runtime 设计中单独定义加载态。

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

但 Host Schema 提示不得变成 Compiler 真相：

- Compiler 不读取 Host Schema。
- 缺少 Host Schema 不应让 `.inscape` 项目无法编译。
- Host Schema 未声明某个查询时，VSCode / LanguageServer 可以提示，但第一版不应升级为编译错误。
- Host Schema 声明的是 Inscape 可读查询名，不是宿主项目内部 API。

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
- Bridge 中的 handler、typeName、endpoint、GUID、资源路径等都不得回写进 `.inscape` 正文。

## 诊断分级建议

第一版建议分级如下：

```text
Compiler: 不诊断查询存在性，只保留正文文本。
Tooling: 可在专门审查命令中报告未知 query。
VSCode / LanguageServer: 可基于 Host Schema 给 info/warning 级提示。
Runtime Host: 查询失败时产生运行时诊断或按项目策略 fallback。
```

这能避免两个误区：

- 没有宿主配置时，作者无法继续写剧本。
- 有宿主配置时，编辑器提示被误认为 Core 语义。

## 与 legacy `[kind: alias]` 的区分

历史 `[timeline: court_intro]`、`[bg: courtroom]`、`[emotion: tense]` 是 legacy inline host binding。它们可被 VSCode 作为旧项目 fallback 维护，但不进入新 `query-interpolation` 对象。

区分规则：

- 简单路径，例如 `[player.gold]`：query interpolation。
- 带冒号的 `[kind: alias]`：legacy inline host binding fallback。
- 新宿主事件 / 时机：优先写成 `@timeline.talking.exit court_intro`、`@emit door_opened` 等 `@` 行。

## F1.9 自检结论

- 本文没有要求修改 Compiler，也没有把 Host Schema 升级为编译依赖。
- 本地化锚点继续由原文占位符稳定参与，不执行或替换查询。
- 预览 fallback 被限制在作者体验层，不反向污染 IR、CSV 或 Runtime 输入。
- Host Schema / Host Bridge 的职责仍是提示与映射，不暴露宿主内部 API 给 DSL。
- legacy `[kind: alias]` 与新 `[]` 查询插值有了可执行的数据层区分。

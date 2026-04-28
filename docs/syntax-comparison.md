# 语法样例对比

状态：草案

本文件用同一段“循环询问”剧情，对比 Yarn-like、Ink-like、Ren'Py-like 与 Inscape-like 的写法。目的不是复刻竞品，而是拆解不同 DSL 哲学对阅读体验、图结构、数据映射和工具提示的影响。

## 样例目标

剧情需求：

- 存在一个入口节点。
- 玩家可以进入“询问证言”循环。
- 循环节点可以跳回入口，形成复入和回环。
- 玩家可以进入“查看证物”节点，再回到入口。
- 第一版不使用变量和条件。

## Yarn-like

```yarn
title: court.intro
---
旁白: 法庭里很安静。
成步堂: 现在开始吧。

-> 询问证言
    <<jump court.cross_exam.loop>>
-> 查看证物
    <<jump evidence.menu>>
===

title: court.cross_exam.loop
---
证人: 我什么都不知道。
<<jump court.intro>>
===

title: evidence.menu
---
旁白: 证物袋里只有一枚旧怀表。
<<jump court.intro>>
===
```

观察：

- 节点图模型非常明确，适合游戏工具链、图视图和跳转诊断。
- 命令块的工程感强，容易和宿主 API 建立边界。
- 对视觉小说作者来说，`title`、`---`、`===` 和 `<<jump>>` 的结构噪声略高。

## Ink-like

```ink
=== court_intro ===
旁白：法庭里很安静。
成步堂：现在开始吧。

* [询问证言] -> court_cross_exam_loop
* [查看证物] -> evidence_menu

=== court_cross_exam_loop ===
证人：我什么都不知道。
-> court_intro

=== evidence_menu ===
旁白：证物袋里只有一枚旧怀表。
-> court_intro
```

观察：

- 文本流畅，跳转和选择的视觉噪声较低。
- knot/stitch 心智更接近“可寻址片段”，适合写作连续性。
- 如果后续加入复杂宿主查询和业务动作，需要额外 Schema，否则容易变成隐式逻辑网。

## Ren'Py-like

```renpy
label court_intro:
    "旁白" "法庭里很安静。"
    "成步堂" "现在开始吧。"

    menu:
        "询问证言":
            jump court_cross_exam_loop
        "查看证物":
            jump evidence_menu

label court_cross_exam_loop:
    "证人" "我什么都不知道。"
    jump court_intro

label evidence_menu:
    "旁白" "证物袋里只有一枚旧怀表。"
    jump court_intro
```

观察：

- 运行时语言感强，能自然扩展到场景、立绘、音乐、Python 逻辑和 UI。
- 对“完整视觉小说引擎”很有效，但会把 DSL 推向具体引擎语义。
- Inscape 第一阶段不应直接采用这一路径，否则很容易过早绑定 Unity 或未来自研引擎。

## Inscape-like

```inscape
:: court.intro

旁白：法庭里很安静。
成步堂：现在开始吧。

? 选择行动
  - 询问证言 -> court.cross_exam.loop
  - 查看证物 -> evidence.menu

:: court.cross_exam.loop

证人：我什么都不知道。
-> court.intro

:: evidence.menu

旁白：证物袋里只有一枚旧怀表。
-> court.intro
```

观察：

- 保留图叙事的显式节点与跳转。
- 普通文本接近剧本读法，选项和跳转足够清楚。
- `::`、`?`、`-`、`->` 的符号占用较少，适合通过 VSCode 高亮弱化结构信息。
- 编译到 Narrative Graph IR 的映射直接：Node、Line、Choice、Edge 都能一一对应。

## 当前倾向

第一版 Inscape 采用 Inscape-like 写法作为主线：

- 节点定义：`:: node.name`
- 对白：`角色：文本`
- 旁白：裸文本或 `旁白：文本`，二者都解析为可本地化文本。
- 选项组：`? prompt`
- 选项：`- text -> target.node`
- 默认跳转：`-> target.node`
- 注释：`// comment`
- 元信息：`@key value` 或 `[key: value]` 暂作为 metadata，不执行。

## 节点命名规范草案

第一版节点名建议使用小写 ASCII 层级名：

```text
chapter.scene.topic
court.cross_exam.loop
evidence.menu
```

规则草案：

- 只允许小写字母、数字、下划线、短横线和点。
- 必须以小写字母开头。
- 点用于层级分段，不能连续出现，也不能出现在末尾。
- 每个分段必须以小写字母或数字结尾。
- 不允许空格、中文、冒号、斜杠或反斜杠。

理由：

- 稳定、易输入、易补全。
- 跨平台文件、URL、JSON、Unity、未来自研引擎都更安全。
- 便于从节点名投影图层级和大纲树。

## 对后续工具的影响

- VSCode 补全应优先补节点名和跳转目标。
- 诊断必须检查重复节点、缺失目标、非法节点名和不可达节点。
- HTML 预览使用节点名作为主要导航。
- Unity Adapter 可以把节点名映射为稳定表项，同时保留行级 hash 处理本地化文本。

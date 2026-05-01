# 0008：宿主桥接层与项目适配边界

状态：Accepted

日期：2026-05-01

## 背景

Inscape 需要服务不同游戏项目，而不是绑定到某个具体项目、引擎或资源管理方案。Bird 是当前最重要的 Unity 参考项目之一，但它不能成为 Core、DSL 或通用 Unity 支持层的默认假设。

同时，叙事脚本中会出现 `item`、`timeline`、`event`、`query` 等宿主概念。这些概念在 Inscape 层应保持抽象和可读，在游戏项目层可能对应整数 ID、枚举、ScriptableObject、Addressables key、Godot Resource、UE DataAsset、服务器配置或业务代码对象。

## 决定

- Inscape Core 只输出引擎无关、项目无关的叙事数据和宿主引用意图。
- 宿主对象 ID 必须允许通过桥接层映射，不要求 Inscape 内 ID 与游戏项目内 ID 一致。
- Inscape 中的 `item` 等概念是叙事/工具层抽象，不等同于业务层具体 Item、装备、道具或成就系统。
- 查询只能表达 Inscape/宿主可读的状态需求，由上层宿主提供实现；底层状态只用于被上层查询或 Inscape 内部推进，不反向查询上层业务。
- 事件是宿主可处理的意图数据，具体执行、失败处理和副作用由上层项目决定。
- Bird Adapter 与 Unity Editor Importer 都是参考适配器，不是 Inscape 的唯一运行路径。
- Unity 上层支持应作为独立 Unity 插件或独立适配包研究，不混入 VSCode 扩展；它应支持配置、智能识别和代码生成等机制来匹配不同项目已有数据结构。

## 影响

- Host Schema 需要支持抽象参数和项目 ID 桥接，例如 Inscape 使用可读字符串 `"badge"`，宿主项目使用整数 ID `10023`。
- `bindingMap` 不应只服务 Timeline 或 Bird，也应被视为通用宿主对象映射表的早期形态。
- Timeline Hook 应逐步泛化为宿主事件示例，例如 `trigger_timeline(alias)`，而不是 DSL 内建的唯一演出机制。
- Bird 文档必须明确自身是参考需求方和验证样例；不能把 Addressables、ScriptableObject 或 Bird `TalkingSO` 写成通用 Unity 支持的必需条件。
- 后续 Unity 插件应从“读取 Inscape 通用 IR/manifest + 项目桥接配置 + 项目已有代码结构”出发设计，而不是假设所有项目都使用 Bird 数据模型。

## 后续验证

- 设计通用 Host Bridge 配置草案，覆盖 Inscape ID 到项目 ID 的映射、资源定位、事件处理器和查询实现。
- 用 Bird 继续作为参考适配器验证 Unity 侧流程，但文档和代码命名应保持 Bird-specific 边界清晰。
- 为 Host Schema query/event 补全先实现只读提示，不改变 Core 语义。
- 在 Unity 插件方案进入实现前，先完成独立设计文档，比较 ScriptableObject、JSON、代码生成、Attribute 扫描和项目配置表等接入方式。

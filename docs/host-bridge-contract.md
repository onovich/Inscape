# Host Bridge Contract

状态：草案

最后更新：2026-05-15

Host Bridge 是 Inscape 与具体宿主项目之间的映射契约。它位于 [Host Schema](host-schema.md) 和具体 adapter / importer 之间：

- Host Schema 回答“剧本可以引用哪些查询、事件和宿主能力”。
- Host Bridge 回答“这些 Inscape 侧可读 ID 在项目内部对应什么 ID、资源、事件处理器或查询实现”。
- Adapter / Generator 负责把 schema + bridge + Compiler IR 转成 Unity、Godot、服务端或项目自定义格式。

本文只定义第一版数据形态和边界，不改变当前 DSL 语法，也不要求立即替换 UnitySample adapter。

## 设计目标

- Inscape 剧本继续使用可读、稳定、可审查的字符串 ID。
- 宿主项目可以使用整数、枚举、GUID、Addressables key、资源路径、方法名或服务端 key。
- Compiler 不知道 Host Bridge，也不依赖任何宿主字段。
- Tooling / VSCode 可以读取 Host Bridge 做补全、Hover 和审查提示，但不能把它当编译期真相。
- ExternalSupport 可以把 Host Bridge 转换成宿主导入格式，UnitySample 只是验证样例。

## 文件命名

建议默认文件名：

```text
inscape.host.bridge.json
*.host.bridge.json
```

项目配置后续可扩展为：

```json
{
  "hostSchema": "config/inscape.host.schema.json",
  "hostBridge": "config/inscape.host.bridge.json"
}
```

当前 `unitySample.roleMap` / `unitySample.bindingMap` 暂时保留为兼容字段。2026-05-16 起，`ToolConfigModel` 已能读取并归一化 `hostBridge` 路径；后续迁移应继续让 VSCode 展示和 ExternalSupport CLI 参数消费通用 Host Bridge，同时保留旧字段 fallback。

## 格式草案

```json
{
  "format": "inscape.host-bridge",
  "formatVersion": 1,
  "host": {
    "kind": "unity",
    "profile": "unity-sample",
    "schema": "config/inscape.host.schema.json"
  },
  "ids": [
    {
      "kind": "speaker",
      "name": "mayoi",
      "displayName": "真宵",
      "host": {
        "roleId": 1002
      }
    },
    {
      "kind": "timeline",
      "name": "court_intro",
      "host": {
        "assetId": 2001,
        "unityGuid": "00000000000000000000000000000000",
        "addressableKey": "timeline/court_intro",
        "assetPath": "Assets/Timelines/CourtIntro.playable"
      }
    }
  ],
  "events": [
    {
      "name": "play_timeline",
      "handler": {
        "kind": "unity-method",
        "typeName": "Game.NarrativeTimelineBridge",
        "memberName": "PlayTimeline"
      },
      "parameters": {
        "timelineId": {
          "from": "id",
          "kind": "timeline"
        }
      }
    }
  ],
  "queries": [
    {
      "name": "has_item",
      "handler": {
        "kind": "unity-method",
        "typeName": "Game.InventoryBridge",
        "memberName": "HasItem"
      },
      "parameters": {
        "itemId": {
          "from": "id",
          "kind": "item"
        }
      }
    }
  ]
}
```

## 字段语义

`format` 与 `formatVersion` 用于版本识别。工具遇到未知 major version 应停止自动写入，只允许只读审查。

`host.kind` 是宿主类别，例如 `unity`、`godot`、`server`、`custom`。它用于选择 adapter / generator，不应进入 Compiler。

`host.profile` 是项目或样例 profile，例如 `unity-sample`、`bird`、`project-a`。profile 可以决定 generator 模板，但不改变 Inscape IR。

`host.schema` 可指向 Host Schema 文件，说明 bridge 正在实现哪份能力清单。

`ids` 是 Inscape 可读 ID 到宿主坐标的映射。`kind` 表达概念类型，例如 `speaker`、`timeline`、`item`、`resource`、`window`。`name` 是剧本侧使用的稳定 ID。`host` 是宿主自由对象，允许按项目保存整数 ID、GUID、资源路径、Addressables key 或其他坐标。

`events` 把 Host Schema 中的 event name 绑定到宿主处理器。`handler.kind` 表达调用方式，例如 `unity-method`、`generated-dispatcher`、`http-endpoint` 或 `custom-codegen`。第一版只要求可审查，不规定运行时调用协议。

`queries` 把 Host Schema 中的 query name 绑定到宿主查询实现。查询默认不得有副作用；副作用必须建模为 event。

`parameters` 描述参数如何从 Inscape 概念映射到宿主实现。`from: "id"` 表示参数来自 `ids` 表；后续可扩展 `literal`、`source`、`state` 或 `runtime-context`。

## UnitySample 对照

当前 UnitySample 输入可以这样映射到 Host Bridge：

```text
unitySample.roleMap speaker,roleId
  -> ids[{ kind: "speaker", name: speaker, host.roleId }]

unitySample.bindingMap kind,alias,birdId,unityGuid,addressableKey,assetPath
  -> ids[{ kind, name: alias, host.assetId, host.unityGuid, host.addressableKey, host.assetPath }]

@timeline alias / legacy [timeline: alias]
  -> ids[kind="timeline", name=alias] + event play_timeline
```

这说明 Host Bridge 可以表达当前样例能力，但不会继承 `talkingId`、`roleId`、Addressables 或 ScriptableObject 作为通用 Core 概念。`[timeline: alias]` 只作为旧项目兼容入口保留；新事件 / 时机写法优先使用 `@timeline...`。

## 分层边界

- Compiler：不读取 Host Bridge，不验证宿主 ID 是否存在。
- Tooling：可读取 Host Bridge，做配置归一化、模板生成、报告和通用审查。
- VSCode / LanguageServer：可消费 Tooling 读取结果，提供补全、Hover、跳转和诊断提示。
- Runtime：可在未来通过 HostBridge 模块消费已烘焙映射，但不反向解析 `.inscape`。
- ExternalSupport：把 Host Bridge 转成宿主导入格式，或由宿主扫描生成待确认 bridge。

## D2.2 自检结论

- Host Bridge 与 Host Schema 分工已明确：Schema 是能力清单，Bridge 是项目映射。
- Host Bridge 能覆盖 UnitySample 当前 role map、binding map 和 timeline hook 需求，但不把 UnitySample 字段升级为通用模型。
- 下一阶段应把 `ToolConfigModel.UnitySample` / VSCode `UnitySample` 文案迁到通用 `hostBridge` 配置读取与展示，再保留旧字段作为兼容 fallback。

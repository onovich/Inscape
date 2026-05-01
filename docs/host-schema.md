# 宿主 Schema 草案

状态：草案

最后更新：2026-05-01

宿主 Schema 是 Inscape 与具体游戏工程之间的能力清单。它不让 DSL 直接调用 Unity、服务端或业务对象，而是把“可被叙事表达引用的查询、事件和宿主能力”声明成数据，供 VSCode 补全、编译期检查、引擎连接层和未来代码生成共同使用。

这份草案只定义文件形态和边界，不代表第二版条件语法已经定稿。

## 设计目标

- DSL 只表达数据意图，不拥有具体执行权。
- 查询是纯表达，默认不允许副作用。
- 事件是宿主动作声明，是否执行、何时执行、失败如何处理都由宿主层决定。
- `item`、`timeline`、`resource` 等参数是 Inscape 侧抽象概念，不要求与项目业务对象一一同名或同类型。
- Inscape 内可使用可读字符串 ID；宿主项目内可使用整数、枚举、GUID、资源路径或其他编码，两者通过桥接层映射。
- Inscape 下层状态只用于被宿主查询或内部推进，不反向查询上层业务系统。
- Schema 可以由手写文件、Unity 烘焙器、代码扫描或服务端接口生成。
- VSCode 和未来独立编辑器读取同一份 Schema，减少作者记忆压力。

## 项目配置

项目根目录 `inscape.config.json` 可以声明：

```json
{
  "hostSchema": "config/inscape.host.schema.json"
}
```

相对路径按配置文件所在目录解析。当前 CLI 已能解析并规范化该字段，但还不把它用于 DSL 编译。

## 模板命令

可以生成第一版模板：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-host-schema-template -o config\inscape.host.schema.json
```

该命令只输出草案 JSON，不扫描宿主项目，不改变当前 DSL 解析或 Bird 导出行为。

## VSCode 支持

VSCode 扩展会为以下文件名应用内置 JSON Schema：

```text
inscape.host.schema.json
*.host.schema.json
```

这会在编辑宿主能力清单时提供字段补全、类型校验和基础枚举约束，例如 `returnType`、`delivery`、`parameters[].type`。

命令面板提供：

```text
Inscape: Show Host Schema Capabilities
```

该命令读取工作区 `inscape.config.json` 的 `hostSchema` 字段，列出当前可用 query / event，并可跳转到 schema 文件中对应的 `name`。这只是配置检查与浏览能力，不代表 `.inscape` 脚本中已经有正式查询或事件语法。

## 格式草案

```json
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    {
      "name": "has_item",
      "description": "Pure query example. The DSL may reference an abstract Inscape item id; the host bridge maps it to project data.",
      "returnType": "bool",
      "isAsync": false,
      "parameters": [
        {
          "name": "itemId",
          "type": "string",
          "required": true,
          "description": "Stable Inscape-side item identifier, for example badge. A bridge table may map it to a project integer id."
        }
      ]
    }
  ],
  "events": [
    {
      "name": "open_window",
      "description": "Host event example. Inscape only records the intent; the host decides behavior.",
      "delivery": "fire-and-forget",
      "sideEffects": true,
      "parameters": [
        {
          "name": "windowId",
          "type": "string",
          "required": true,
          "description": "Stable UI window identifier owned by the host."
        }
      ]
    }
  ]
}
```

## 字段语义

`queries` 描述可在未来条件表达式中引用的宿主查询。它们应当是可审查、可补全、可测试的纯函数式接口，例如 `has_item("watch")`、`relationship("mayoi") > 10`。

查询名和参数名属于 Inscape 与宿主之间的契约，不等同于宿主项目内部 API。比如 Inscape 可写 `has_item("badge")`，而 Unity、Godot 或服务器项目内部可能使用整数 `10023`、枚举 `ItemId.Badge` 或数据库主键。这个差异应由桥接配置、代码生成或项目适配层消化，而不是要求作者在剧本中使用业务内部 ID。

Inscape 侧的 `item` 也是抽象叙事概念：它可以代表道具、装备、剧情经历、成就标记或任意上层状态。Core 不判断它在业务层属于哪个系统，只要求上层提供稳定查询体验和必要的编辑器提示。

`events` 描述可由叙事表达引用的宿主动作或回调，例如打开 UI、播放特殊系统、触发业务流程或触发 Timeline。事件天然可能有副作用，所以它们必须与查询分开。第一版只记录清单，不定义触发语法。

Timeline 不应作为 Inscape 内建特权机制长期绑定在 DSL 里。更通用的方向是把“触发 Timeline”视为宿主自定义事件的一种示例配置，由策划或项目适配层声明事件名和参数，上层拿到数据后自行决定如何处理。

`parameters` 只描述参数名、类型、是否必填和说明，不绑定具体 C#、Rust、服务端或 Unity 类型。连接层可以在导入或烘焙阶段把这些类型映射到宿主语言。

## 与现有绑定表的关系

当前 Bird Adapter 已有：

```text
kind,alias,birdId,unityGuid,addressableKey,assetPath
```

这张表描述资源 / Timeline 等宿主对象坐标，服务 `@timeline alias`、`@timeline.<phase> alias` 和 `[kind: alias]` 这类引用。宿主 Schema 则描述查询与事件能力。两者都属于宿主连接层，但不要混为同一张表：

- `bindingMap` 回答“这个别名指向哪个资源或宿主对象”。
- `hostSchema` 回答“剧本可以表达哪些查询和事件，以及它们需要哪些参数”。

后续需要在两者之上抽象出更通用的 Host Bridge：既能描述能力清单，也能描述 Inscape 可读 ID 到项目内部 ID / 资源坐标 / 代码处理器的映射。Bird 当前的 CSV 只是该方向的参考实现。

未来如果需要，可以让宿主 Schema 引用绑定表，或由统一烘焙器同时生成两类文件。

## 后续演进

1. 设计条件表达式语法时，只允许引用 `queries`，默认禁止副作用。
2. 设计事件语法时，明确事件是否进入 IR、是否阻塞流程、失败如何降级。
3. VSCode 读取 `hostSchema` 后，为查询名、事件名和参数名提供补全与 Hover。
4. Unity / Bird 连接层可扫描带特定属性的方法，生成或校验 `hostSchema`。
5. 未来如果进入代码生成阶段，可以从 Schema 生成宿主注册代码，避免运行时才发现未注册能力。
6. 设计 Host Bridge 映射表或生成流程，解决 Inscape 可读 ID 与项目内部 ID 不一致的问题。

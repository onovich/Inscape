# 宿主 Schema 草案

状态：草案

最后更新：2026-06-18

宿主 Schema 是 Inscape 与具体游戏工程之间的能力清单。它不让 DSL 直接调用 Unity、服务端或业务对象，而是把“可被叙事表达引用的查询、动作和宿主能力”声明成数据，供 VSCode 补全、显式审计、引擎连接层和未来代码生成共同使用。

这份草案只定义文件形态和边界，不代表第二版条件语法已经定稿。

## 设计目标

- DSL 只表达数据意图，不拥有具体执行权。
- 查询是纯表达，默认不允许副作用。
- 动作是宿主能力声明，是否执行、何时执行、失败如何处理都由宿主层决定。
- `item`、`timeline`、`resource` 等参数是 Inscape 侧抽象概念，不要求与项目业务对象一一同名或同类型。
- Inscape 内可使用可读字符串 ID；宿主项目内可使用整数、枚举、GUID、资源路径或其他编码，两者通过桥接层映射。
- Inscape 下层状态只用于被宿主查询或内部推进，不反向查询上层业务系统。
- Schema 可以由手写文件、Unity 烘焙器、代码扫描或服务端接口生成。
- VSCode 和未来独立编辑器读取同一份 Schema，减少作者记忆压力。

P3 Round 3 补充口径：Host Schema 是统一宿主能力清单，包含 `queries[]` 和 `actions[]` 两部分。`actions[]` 是 Host Schema 的动作部分，不是独立 Action Schema。旧文档和旧项目可能仍使用 `events[]` 描述宿主事件；P3 迁移期间 `events[]` 作为 legacy 字段保留，当前 Tooling / CLI / LanguageServer / VSCode / SelfHostedEditor 都可以继续读取，但新能力、模板和 JSON Schema 优先落到 `actions[]`。手写 Schema 是兜底方案，长期优先支持宿主无关的自动化生成，例如 C# attribute / source generator、TypeScript 声明或运行时注册后导出 Schema。Unity Inspector 可以作为 Unity 插件的编辑界面，但不应成为 Host Schema 的唯一维护方式，也不应把 Schema 格式绑定到 Unity。

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
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-schema-template -o config\inscape.host.schema.json
```

该命令只输出草案 JSON，不扫描宿主项目，不改变当前 DSL 解析或 Bird 导出行为。

## VSCode 支持

VSCode 扩展会为以下文件名应用内置 JSON Schema：

```text
inscape.host.schema.json
*.host.schema.json
```

这会在编辑宿主能力清单时提供字段补全、类型校验和基础枚举约束，例如 `returnType`、`actions[].mode`、`parameters[].type`、`parameters[].idKind`。Legacy `events[]` 仍会被 schema 接受，但已标记为 deprecated。

命令面板提供：

```text
Inscape: Show Host Schema Capabilities
```

该命令读取工作区 `inscape.config.json` 的 `hostSchema` 字段，列出当前可用 query / action / legacy event，并可跳转到 schema 文件中对应的 `name`。Capability endpoint 当前同时输出 `queries[]`、`actions[]` 和 deprecated legacy `events[]`。这只是配置检查与浏览能力，不代表 `.inscape` 脚本中已经有正式查询或动作语法。

对于 `[]` 查询插值，Host Schema 第一版只作为作者提示来源：可以驱动补全、Hover、未知查询提示和返回类型说明，但不应让 Compiler 依赖 Host Schema。具体数据边界见 [Query Interpolation Data Contract](query-interpolation-data-contract.md)。

对于当前 `@emit actionName` 原型，VSCode 和 SelfHostedEditor 会读取 Host Schema `actions[]` 提供 action 名补全与 Hover，展示 mode、可选 idKind、parameters、description 和 schema 来源；legacy `events[]` 继续作为迁移期候选，展示 delivery、sideEffects、parameters、description 和 schema 来源。`@` 触发的是 action，action 可以是 fire / wait / handoff。未知 action 只作为作者提示，不进入默认 Problems，也不改变 Compiler 行为。`@timeline...` 仍走 Host Bridge，因为它表达带时机的宿主资源 hook，而不是通用 schema action。

Tooling 侧已经提供 `HostSchemaQueryReaderDomain`、`HostSchemaActionReaderDomain` 与 `HostSchemaEventReaderDomain`，分别把 `queries[]`、`actions[]`、legacy `events[]` 归一化成带 source location 的能力模型。`HostSchemaCapabilityCatalogDomain` 组合这三类能力，供 CLI、LanguageServer、VSCode 和 SelfHostedEditor 复用同一契约。

当前显式 CLI endpoint 是：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-host-schema-project samples -o artifacts\host-schema-capabilities.json
```

它输出 `inscape.host-schema.capabilities` JSON，当前包含 Host Schema 读取状态、归一化 queries、actions 和 legacy events。该命令不编译 `.inscape`，也不扫描脚本文本。

VSCode 的 query / action 作者提示会优先调用 LanguageServer stdio session，再回退该 CLI endpoint，消费 Tooling 归一化后的 capability catalog；SelfHostedEditor 通过 `/api/host-schema-capabilities` 走同一 LanguageServer endpoint。编辑器宿主不再直接解析 Host Schema JSON。

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
  "actions": [
    {
      "name": "open_window",
      "description": "Host action example. Inscape records the intent; the host decides behavior.",
      "mode": "fire",
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

`actions` 描述可由叙事表达引用的宿主动作或回调，例如打开 UI、播放特殊系统、触发业务流程或触发 Timeline。动作天然可能有副作用，所以它们必须与查询分开。第一版动作模式只保留 `fire`、`wait`、`handoff` 三类，不为低优先级 Rollback / Replay 提前加入复杂 policy 字段。

Legacy `events[]` 兼容策略：

- `events[]` 只作为迁移期输入保留，JSON Schema 标记为 deprecated；新模板不再生成 `events[]`。
- 当前 `HostSchemaEventReaderDomain`、`inspect-host-schema-project`、LanguageServer Host Schema capability endpoint、VSCode / SelfHostedEditor Host capability UI 会继续消费 `events[]`，但显示为 legacy event；`actions[]` 是新能力主路径。
- 后续需要从 legacy event 投影到 action 时，保守映射为：`delivery: "fire-and-forget"` 或 `"queued"` -> `mode: "fire"`，`delivery: "blocking"` -> `mode: "wait"`；legacy event 没有 `handoff` 等价模式。
- `sideEffects` 在 legacy event 中只用于作者提示；P3 action 默认就是可能有副作用的宿主动作，不再需要同名字段。

字段命名倾向：

- `parameters`：参数列表，不使用 `params`。
- `returnType`：query 返回值类型，不使用 `returns`。
- `mode`：action 顶层字段，取值为 `fire`、`wait`、`handoff`。
- `idKind`：可选字段，用于说明 string 参数是否是 Inscape 可读 ID，例如 `item`、`timeline`、`speaker`。
- `description`：可选字段，来源可以是代码标注、代码注释或人工 overlay，只服务作者提示和文档，不参与执行。

Timeline 不应作为 Inscape 内建特权机制长期绑定在 DSL 里。更通用的方向是把“触发 Timeline”视为宿主自定义 action 的一种示例配置，由策划或项目适配层声明 action 名和参数，上层拿到数据后自行决定如何处理。

`parameters` 只描述参数名、类型、是否必填、`idKind` 和说明，不绑定具体 C#、Rust、服务端或 Unity 类型。连接层可以在导入或烘焙阶段把这些类型映射到宿主语言。第一版 host-neutral type 包含 `bool`、`int`、`float`、`number`、`string`、`asset`、`void`；query 不应使用 `void`。

## Usage / Requirement Manifest

Host Schema 的权威来自宿主；下层 `.inscape` 脚本可以生成机器可读的 Usage / Requirement Manifest，但它不是宿主能力真相。

```text
Host Schema
宿主说：我能提供什么。

Usage Manifest
剧本说：我实际用了什么。

Audit
工具对账：剧本用的，宿主有没有提供，Bridge 有没有映射。
```

P3 Round 4 已在 [Usage Manifest Contract](usage-manifest-contract.md) 定义 `inscape.usage` 最小契约。Round 5 再实现命令：

```powershell
inspect-usage-project <root> -o usage.json
audit-host-integration-project <root> -o report.json
```

Usage Manifest 记录 `queries[]`、`actions[]` 与 `requiredIds[]`。其中 `@timeline...` 会作为 `usageKind = "host-binding-hook"` 对账 Host Bridge，而不是被当成缺失的普通 Host Schema action。Usage Manifest 可用于 CI、编辑器提示、source jump、Bridge TODO 生成和宿主集成审计，但不得用于 Runtime 直接执行，也不得反向生成权威 Host Schema。

## 与现有绑定表的关系

当前 Bird Adapter 已有：

```text
kind,alias,birdId,unityGuid,addressableKey,assetPath
```

这张表描述资源 / Timeline 等宿主对象坐标，主要服务 `@timeline alias`、`@timeline.<phase> alias` 这类事件 / 时机 hook。历史 `[kind: alias]` 不再属于当前 Host Bridge 或查询语法扩展。宿主 Schema 则描述查询与动作能力。两者都属于宿主连接层，但不要混为同一张表：

- `bindingMap` 回答“这个别名指向哪个资源或宿主对象”。
- `hostSchema` 回答“剧本可以表达哪些查询和动作，以及它们需要哪些参数”。

后续需要在两者之上抽象出更通用的 Host Bridge：既能描述能力清单，也能描述 Inscape 可读 ID 到项目内部 ID / 资源坐标 / 代码处理器的映射。Bird 当前的 CSV 只是该方向的参考实现。第一版草案见 [Host Bridge Contract](host-bridge-contract.md)。

未来如果需要，可以让宿主 Schema 引用绑定表，或由统一烘焙器同时生成两类文件。

## 后续演进

1. 设计条件表达式语法时，只允许引用 `queries`，默认禁止副作用。
2. 设计 action 语法时，明确 action 是否进入 IR、是否 `fire` / `wait` / `handoff`，失败时按宿主异常上报。
3. VSCode 读取 `hostSchema` 后，为查询名、动作名和参数名提供补全与 Hover。
4. Unity / Bird 连接层可扫描带特定属性的方法，生成或校验 `hostSchema`。
5. 未来如果进入代码生成阶段，可以从 Schema 生成宿主注册代码，避免运行时才发现未注册能力。
6. 按 [Host Bridge Contract](host-bridge-contract.md) 继续推进映射表、VSCode 展示和生成流程，解决 Inscape 可读 ID 与项目内部 ID 不一致的问题。
7. P3 Round 3 已把 Tooling / CLI / LanguageServer / VSCode / SelfHostedEditor 的 Host Schema capability consumption 迁到 `actions[]`，并继续保留 legacy `events[]` 兼容路径。
8. P3 Round 4 已定义 Usage Manifest contract；后续还需实现 `inspect-usage-project`、Host Integration Audit 输出格式以及 Runtime 最小 state shape。

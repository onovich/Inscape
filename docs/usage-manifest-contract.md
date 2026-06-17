# Usage Manifest Contract

状态：P3 Round 4 contract

最后更新：2026-06-18

本文定义 P3 第一刀的 Usage / Requirement Manifest 最小契约。Usage Manifest 是 `.inscape` 剧本实际使用宿主能力的机器可读清单，格式名为 `inscape.usage`。

它不是 Host Schema，不是 Host Bridge，也不是 Runtime 执行输入。

```text
Host Schema
宿主说：我能提供什么。

Usage Manifest
剧本说：我实际用了什么。

Host Bridge
项目说：这些 Inscape 可读 ID 如何映射到宿主 ID / 资源 / handler。

Host Integration Audit
工具对账：剧本用了什么，宿主是否声明，Bridge 是否映射。
```

## 目标

- 记录 query / action usage。
- 记录可读取的字面量参数。
- 记录 workspace-relative source location。
- 记录使用上下文，例如 `query-interpolation`、`choice-condition`、`conditional-jump`、`action-line`、`timeline-hook`。
- 在能读取 Host Schema 时，按参数 `idKind` 推导 `requiredIds`，例如 `item:silver_key`、`timeline:mira_reveal`。
- 为后续 `audit-host-integration-project`、CI、Bridge TODO、编辑器提示和 source jump 提供稳定输入。

## 非目标

- 不反向生成权威 Host Schema。
- 不因为脚本写了未知 query / action 就创建宿主能力。
- 不参与 Runtime 执行调度。
- 不验证条件表达式真假。
- 不要求 Compiler 读取 Host Schema 或 Host Bridge。
- 不保存 Unity GUID、asset path、Addressables key、Bird ID 或具体项目内部 ID。

## 命令边界

Round 5 会实现：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-usage-project <root> -o usage.json
```

第一版命令约定：

- 默认输出 JSON；未传 `-o` 时写 stdout。
- `--config path` 后续可沿用现有项目配置读取模式。
- 未知 query / action 不导致非零退出码；它们仍作为 usage 记录，交给 Host Integration Audit 报告。
- 只有项目读取失败、JSON 写出失败、参数错误等工具层错误才导致非零退出码。
- 命令不编译成 Runtime，不执行 query，不调用 Host Bridge，不启动宿主。

## 顶层 JSON

```json
{
  "format": "inscape.usage",
  "formatVersion": 1,
  "workspace": {
    "root": "D:/Projects/GameNarrative",
    "configPath": "inscape.config.json"
  },
  "summary": {
    "sourceCount": 1,
    "queryCount": 3,
    "actionCount": 2,
    "requiredIdCount": 3,
    "nonLiteralArgumentCount": 0
  },
  "queries": [],
  "actions": [],
  "requiredIds": []
}
```

字段：

- `format`：固定为 `inscape.usage`。
- `formatVersion`：第一版为 `1`。
- `workspace.root`：生成 usage 的 workspace root。工具可以输出绝对路径；下游不得把它当脚本身份。
- `workspace.configPath`：使用的项目配置路径，建议 workspace-relative。
- `summary`：计数摘要，方便 CI 和编辑器快速展示。
- `queries`：剧本中出现的查询 usage。
- `actions`：剧本中出现的宿主动作、事件或 hook usage。
- `requiredIds`：从字面量参数或 Host Schema `idKind` 推导出的 Inscape 可读 ID 需求。

## Source Location

Usage source location 使用 Compiler / Tooling 语义的 1-based 行列：

```json
{
  "path": "chapter1.inscape",
  "line": 42,
  "column": 8,
  "length": 22
}
```

- `path`：workspace-relative source path。
- `line` / `column`：1-based。
- `length`：源码 token 长度，至少为 `1`。

编辑器宿主显示时再按 [Source Location Contracts](source-location-contracts.md) 转成 0-based 坐标。

## Query Usage

Query usage 记录 `[]` 查询插值和未来条件表达式里的只读 query。

```json
{
  "name": "has_item",
  "syntax": "call",
  "context": "choice-condition",
  "raw": "has_item(\"silver_key\")",
  "arguments": [
    {
      "index": 0,
      "raw": "\"silver_key\"",
      "literalKind": "string",
      "value": "silver_key"
    }
  ],
  "source": {
    "path": "chapter1.inscape",
    "line": 18,
    "column": 5,
    "length": 24
  }
}
```

字段：

- `name`：query 名称。简单路径如 `[player.gold]` 使用 `player.gold`；函数式条件如 `has_item("silver_key")` 使用 `has_item`。
- `syntax`：`path` 或 `call`。
- `context`：见下方 context 枚举。
- `raw`：源码中的 query 表达式片段，不含外层条件方括号时可只保留表达式本体。
- `arguments`：可解析出的字面量参数。简单路径查询通常为空数组。
- `source`：query 名或表达式的源码位置。

第一版只要求识别字符串、数字、bool 和简单 identifier 字面量。复杂表达式、非字面量参数或后续不支持的语法应记录为：

```json
{
  "index": 0,
  "raw": "currentItem()",
  "literalKind": "expression"
}
```

并增加 `summary.nonLiteralArgumentCount`，但不让 Usage Manifest 自己报 unknown 或参数类型错误。

## Action Usage

Action usage 记录 `@` 行里的宿主动作、事件或 hook。

```json
{
  "name": "play_timeline",
  "usageKind": "schema-action",
  "context": "action-line",
  "raw": "@emit play_timeline \"mira_reveal\"",
  "arguments": [
    {
      "index": 0,
      "raw": "\"mira_reveal\"",
      "literalKind": "string",
      "value": "mira_reveal"
    }
  ],
  "source": {
    "path": "chapter1.inscape",
    "line": 31,
    "column": 1,
    "length": 34
  }
}
```

字段：

- `name`：Host Schema action 名，或兼容 hook 名。
- `usageKind`：
  - `schema-action`：面向 Host Schema `actions[]` 的动作，例如 `@emit play_timeline ...`。
  - `host-binding-hook`：面向 Host Bridge resource / hook 的用法，例如 `@timeline.talking.exit court_intro`。
  - `legacy-event`：迁移期从 legacy `events[]` 读到的事件名，后续应迁到 `schema-action`。
- `context`：见下方 context 枚举。
- `raw`：完整 `@` 行或其中可定位片段。
- `arguments`：字面量参数。
- `source`：源码位置。

当前 `@timeline` hook 不应被误当成 Host Schema action 缺失。它进入 Usage Manifest 的 `actions[]` 列表，是因为它确实是宿主侧动作意图；审计时按 `usageKind = "host-binding-hook"` 优先对账 Host Bridge `ids[kind="timeline"]`，再由项目决定是否映射到通用 action。

示例：

```json
{
  "name": "timeline",
  "usageKind": "host-binding-hook",
  "context": "timeline-hook",
  "phase": "talking.exit",
  "raw": "@timeline.talking.exit court_intro",
  "arguments": [
    {
      "index": 0,
      "name": "alias",
      "raw": "court_intro",
      "literalKind": "identifier",
      "value": "court_intro"
    }
  ],
  "source": {
    "path": "chapter1.inscape",
    "line": 9,
    "column": 1,
    "length": 35
  }
}
```

## Context 枚举

第一版固定这些 context 字符串：

- `query-interpolation`：正文文本中的 `[player.gold]`。
- `choice-condition`：未来选项条件 `- [condition] text -> target`。
- `conditional-jump`：未来条件跳转 `? [condition] -> target`。
- `action-line`：`@emit actionName ...` 或未来通用 action 行。
- `timeline-hook`：`@timeline... alias`。
- `metadata-line`：其他 `@...` 行中能识别为宿主 intent 的用法。

Round 5 可以先实现当前语法能看到的 `query-interpolation`、`action-line` 和 `timeline-hook`。`choice-condition` 与 `conditional-jump` 在条件语法落地后接入同一 contract。

## Literal Argument

```json
{
  "index": 0,
  "name": "itemId",
  "raw": "\"silver_key\"",
  "literalKind": "string",
  "value": "silver_key"
}
```

字段：

- `index`：0-based 参数位置。
- `name`：可选。只有命名参数或 schema-derived 参数名可用时填写。
- `raw`：源码原文。
- `literalKind`：`string`、`number`、`bool`、`identifier`、`expression`、`unknown`。
- `value`：能安全还原时填写 JSON string / number / bool；`expression` 和 `unknown` 不要求填写。

Usage Manifest 只记录能看懂的字面量，不执行表达式，也不调用 query。

## Required Id

`requiredIds` 是 Usage Manifest 给 Host Bridge 和 audit 的待映射 ID 清单。

```json
{
  "kind": "item",
  "name": "silver_key",
  "usedBy": {
    "capabilityKind": "query",
    "name": "has_item",
    "argumentIndex": 0
  },
  "reason": "host-schema-parameter-idKind",
  "source": {
    "path": "chapter1.inscape",
    "line": 18,
    "column": 15,
    "length": 12
  }
}
```

字段：

- `kind`：Inscape 可读 ID 类别，例如 `item`、`timeline`、`speaker`、`ui-window`。
- `name`：脚本中使用的可读 ID。
- `usedBy.capabilityKind`：`query` 或 `action`。
- `usedBy.name`：query / action / hook 名。
- `usedBy.argumentIndex`：来源参数。
- `reason`：
  - `host-schema-parameter-idKind`：由 Host Schema 参数 `idKind` 推导。
  - `timeline-hook-alias`：由 `@timeline... alias` 推导。
  - `speaker-reference`：后续如把 speaker 引用纳入 usage，可使用该 reason。
- `source`：ID token 的源码位置。

注意：`requiredIds` 仍是剧本需求，不是项目映射。真正的 Unity GUID、asset path、Bird ID 或 handler 只能出现在 Host Bridge / adapter artifact。

## Sample

输入脚本片段：

```inscape
# 开场
@entry
@timeline.talking.exit court_intro
@emit play_timeline "mira_reveal"

旁白：[player.name]推开门。

? 你要做什么？
- [has_item("silver_key")] 用银钥匙开门 -> 开门
- 离开 -> 离开

? [trust("mira") >= 3] -> 请求帮助
-> 独自行动
```

对应 usage sample：

```json
{
  "format": "inscape.usage",
  "formatVersion": 1,
  "workspace": {
    "root": "D:/Projects/GameNarrative",
    "configPath": "inscape.config.json"
  },
  "summary": {
    "sourceCount": 1,
    "queryCount": 3,
    "actionCount": 2,
    "requiredIdCount": 3,
    "nonLiteralArgumentCount": 0
  },
  "queries": [
    {
      "name": "player.name",
      "syntax": "path",
      "context": "query-interpolation",
      "raw": "[player.name]",
      "arguments": [],
      "source": {
        "path": "chapter1.inscape",
        "line": 6,
        "column": 4,
        "length": 13
      }
    },
    {
      "name": "has_item",
      "syntax": "call",
      "context": "choice-condition",
      "raw": "has_item(\"silver_key\")",
      "arguments": [
        {
          "index": 0,
          "raw": "\"silver_key\"",
          "literalKind": "string",
          "value": "silver_key"
        }
      ],
      "source": {
        "path": "chapter1.inscape",
        "line": 9,
        "column": 4,
        "length": 22
      }
    },
    {
      "name": "trust",
      "syntax": "call",
      "context": "conditional-jump",
      "raw": "trust(\"mira\") >= 3",
      "arguments": [
        {
          "index": 0,
          "raw": "\"mira\"",
          "literalKind": "string",
          "value": "mira"
        }
      ],
      "source": {
        "path": "chapter1.inscape",
        "line": 12,
        "column": 4,
        "length": 18
      }
    }
  ],
  "actions": [
    {
      "name": "timeline",
      "usageKind": "host-binding-hook",
      "context": "timeline-hook",
      "phase": "talking.exit",
      "raw": "@timeline.talking.exit court_intro",
      "arguments": [
        {
          "index": 0,
          "name": "alias",
          "raw": "court_intro",
          "literalKind": "identifier",
          "value": "court_intro"
        }
      ],
      "source": {
        "path": "chapter1.inscape",
        "line": 3,
        "column": 1,
        "length": 35
      }
    },
    {
      "name": "play_timeline",
      "usageKind": "schema-action",
      "context": "action-line",
      "raw": "@emit play_timeline \"mira_reveal\"",
      "arguments": [
        {
          "index": 0,
          "raw": "\"mira_reveal\"",
          "literalKind": "string",
          "value": "mira_reveal"
        }
      ],
      "source": {
        "path": "chapter1.inscape",
        "line": 4,
        "column": 1,
        "length": 34
      }
    }
  ],
  "requiredIds": [
    {
      "kind": "timeline",
      "name": "court_intro",
      "usedBy": {
        "capabilityKind": "action",
        "name": "timeline",
        "argumentIndex": 0
      },
      "reason": "timeline-hook-alias",
      "source": {
        "path": "chapter1.inscape",
        "line": 3,
        "column": 23,
        "length": 11
      }
    },
    {
      "kind": "timeline",
      "name": "mira_reveal",
      "usedBy": {
        "capabilityKind": "action",
        "name": "play_timeline",
        "argumentIndex": 0
      },
      "reason": "host-schema-parameter-idKind",
      "source": {
        "path": "chapter1.inscape",
        "line": 4,
        "column": 22,
        "length": 13
      }
    },
    {
      "kind": "item",
      "name": "silver_key",
      "usedBy": {
        "capabilityKind": "query",
        "name": "has_item",
        "argumentIndex": 0
      },
      "reason": "host-schema-parameter-idKind",
      "source": {
        "path": "chapter1.inscape",
        "line": 9,
        "column": 14,
        "length": 12
      }
    }
  ]
}
```

该 sample 包含未来条件语法，用来说明 contract。它不表示当前 Compiler 已经支持条件表达式。

## Audit 对接

Round 6 的 `audit-host-integration-project` 应使用 Usage Manifest 做以下对账：

- `queries[].name` 是否存在于 Host Schema `queries[]`。
- `actions[usageKind = "schema-action"].name` 是否存在于 Host Schema `actions[]`，legacy `events[]` 只作为迁移兼容。
- `actions[usageKind = "host-binding-hook"]` 是否能在 Host Bridge `ids[]` 找到对应 `kind` / `name`。
- `arguments` 数量和字面量类型是否满足 Host Schema parameters。
- `requiredIds` 是否能在 Host Bridge `ids[]` 找到对应 `kind` / `name`。

Audit 可以报告 unknown query / action、参数类型不匹配和 missing bridge binding；Usage Manifest 本身不报告这些问题。

## 架构边界

- Compiler 仍只负责 `.inscape` 语法、IR 和诊断，不读取 Host Schema / Host Bridge / Usage。
- Tooling 是 Usage Manifest 读取和生成的共享位置。
- CLI 只负责 `inspect-usage-project` 参数、stdout / `-o` 输出和 exit code。
- LanguageServer / VSCode / SelfHostedEditor 后续可以消费 Usage 或 Audit payload 做提示，但不得重新扫描或重写 parser。
- Runtime 不直接消费 Usage Manifest 执行动作；Runtime 使用 Compiler IR、Host Bridge 烘焙结果和 Runtime Host delegate / dispatcher。

## 自检结论

- Usage Manifest 与 Host Schema / Host Bridge / Audit 分工明确。
- Unknown query / action 进入 Audit，不反向生成 Host Schema。
- Source location 使用现有 1-based Tooling / Compiler 坐标。
- `requiredIds` 只保存 Inscape 可读 ID，不保存宿主内部坐标。
- 本契约不实现完整 Runtime、Save / Load、Rollback、Trace Replay 或 Flashback。

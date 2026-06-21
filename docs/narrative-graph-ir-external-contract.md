# Narrative Graph IR External Contract

日期：2026-06-21

状态：Round 2 external contract baseline；面向 Integration Package 的 `graph/project-ir.json` 消费方。

## 目标

Narrative Graph IR External Contract 定义外部 importer 可以从 `compile-project` 输出中依赖的稳定字段。它不是 Compiler 内部模型的完整冻结，也不是 Runtime 执行协议。

本契约的第一目标是让 partner 项目能读取 Inscape 项目级 narrative graph、做静态 dry-run、生成对账报告和建立 source jump，而不需要解析 `.inscape` 源文本。

## 非目标

- 不定义 Runtime 执行、query 求值、action dispatch 或 pending resume。
- 不定义 Runtime Preview Bridge、live preview 或 host state sync。
- 不定义完整 host save/load。
- 不定义 Sinan-specific graph field。
- 不要求 `Inscape.Compiler` 读取 Host Schema、Host Bridge、Usage Manifest 或 partner catalog。
- 不让 external importer 复制 Compiler parser。

## Producer

当前 producer 是现有 CLI 命令：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- compile-project <root> -o graph\project-ir.json
```

当前样例输出的顶层字段为：

```text
format, formatVersion, rootPath, documents, graph, entryNodeName, diagnostics, hasErrors
```

`graph` 当前包含：

```text
sourcePath, nodes, edges
```

## Top-Level Stable Fields

External importer may rely on:

| Field | Type | Stability | Meaning |
| --- | --- | --- | --- |
| `format` | string | stable | Must be `inscape.project-ir`. |
| `formatVersion` | number | stable | Current external version is `1`. |
| `hasErrors` | bool | stable | Whether compiler diagnostics contain blocking errors. |
| `diagnostics[]` | array | stable concept | Compiler diagnostics. Exact message text is not stable. |
| `documents[]` | array | stable concept | Per-source document graph slices. |
| `entryNodeName` | string/null | stable | Project entry node selected by source/config/CLI. |
| `graph` | object | stable concept | Merged project graph. |
| `rootPath` | string | informational | Producer workspace root. Consumers must not treat it as package identity. |

Import rules:

- Reject files whose `format` is not `inscape.project-ir`.
- Reject `formatVersion` greater than the highest supported version.
- Accept additive optional fields.
- Ignore unknown fields by default.
- Do not depend on exact diagnostic wording or absolute local path spelling.

## Graph Stable Fields

External importer may rely on `graph.nodes[]` and `graph.edges[]` as the graph entry point.

Current node fields:

```text
name, source, lines, choices, conditionalJumps, defaultNext
```

Current edge fields:

```text
from, to, kind, label, source, condition
```

Stable graph concepts:

- Node identity is `nodes[].name`.
- Node source location is `nodes[].source` when present.
- Narrative text lines are in `nodes[].lines[]`.
- Choice groups are in `nodes[].choices[]`.
- Default node-level jump, when present, is `nodes[].defaultNext`.
- Conditional jump groups, when present, are in `nodes[].conditionalJumps[]`.
- Edges connect `from` node to `to` node and carry `kind`, optional `label`, optional `condition` and optional `source`.
- Consumers should use `graph.edges[]` for graph topology and `nodes[]` for node-local readable content.

## Line And Choice Fields

Current line fields:

```text
kind, speaker, text, raw, anchor, source
```

External importer may rely on:

- `kind`: line kind such as dialogue / narration / metadata as produced by Compiler.
- `speaker`: speaker text when the line has a speaker.
- `text`: author-facing narrative text.
- `raw`: original line fragment for review only; do not re-parse it as source truth.
- `anchor`: stable localization / source anchor when present.
- `source`: Compiler source location.

Current choice group fields:

```text
prompt, anchor, source, options
```

Current choice option fields:

```text
text, target, anchor, source, condition
```

External importer may rely on:

- `choices[].prompt` as the visible choice prompt when present.
- `choices[].options[].text` as visible option text.
- `choices[].options[].target` as the named target node.
- `choices[].options[].condition` as Compiler-produced condition IR when present.
- `anchor` fields as stable text/location anchors when present.
- `source` fields for source jump and diagnostics.

## Source Location

Embedded `source` objects currently contain:

```text
sourcePath, line, column
```

Rules:

- `line` and `column` use Compiler coordinates: 1-based line and 1-based column.
- `sourcePath` is the producer's source path text. Package consumers should prefer package/workspace-relative paths when available.
- Compiler source location currently does not guarantee range length.
- Editor hosts must convert to 0-based editor coordinates using [Source Location Contracts](source-location-contracts.md).
- Round 3 will define package-level source location export and range policy.

## Diagnostics

Diagnostics are Compiler output. External importers may pass them through, display them, or connect them to source jumps.

Rules:

- Compiler diagnostics report `.inscape` syntax / graph / condition parser problems.
- Unknown host query / action is not a Compiler error; it belongs to Usage Manifest and Host Integration Audit.
- Host Schema parameter mismatch, missing Host Bridge mapping and unsupported partner feature are not graph compiler diagnostics.
- Exact diagnostic `message` text is not a compatibility guarantee; diagnostic code / location / severity are more stable if present.

## Condition IR

`condition` fields, when present, are Compiler-produced read-only expression IR. External importers may consume the structure for display or static dry-run planning, but must not re-parse the original condition text.

Rules:

- Queries inside conditions are read-only.
- Actions are not allowed inside conditions.
- Unknown query names are audited by Usage Manifest / Host Integration Audit, not by Compiler.
- Runtime truth for condition evaluation remains `Inscape.Runtime`.

## What Not To Depend On

External consumers must not depend on:

- C# type names or internal Compiler model names.
- Object ordering except for documented arrays where order is narrative meaning, such as `nodes[].lines[]`, `choices[].options[]` and `graph.edges[]`.
- Exact diagnostic text.
- Absolute `rootPath` as identity.
- Raw source text parsing from `raw`.
- Fields that are not documented in this external contract.
- Preview-only fields from VSCode or SelfHostedEditor payloads.
- Host Schema, Host Bridge, Usage Manifest or Runtime State fields appearing inside Project IR.
- Sinan, Bird, Unity, Addressables, ScriptableObject or host-specific data.

## Compatibility Rules

- `format = "inscape.project-ir"` and `formatVersion = 1` identify the current external contract.
- Producers may add optional fields without changing `formatVersion`.
- Producers must bump `formatVersion` before removing or changing the meaning of documented stable fields.
- Consumers should ignore unknown optional fields.
- Consumers should treat a higher unsupported `formatVersion` as `incompatible`.
- Consumers should report `hasErrors = true` as graph invalid for import, while still preserving diagnostics for review.

## Package Relationship

Within [Host Integration Package Contract](host-integration-package-contract.md), this file is referenced as:

```json
{
  "kind": "narrative-graph-ir",
  "path": "graph/project-ir.json",
  "required": true,
  "format": "inscape.project-ir",
  "formatVersion": 1
}
```

The package manifest identifies the artifact. This contract defines how external importers may consume it.

## Round 2 Self-Check

- External Graph IR exposes a stable subset rather than freezing all internal implementation details.
- Source graph to source location connection is explicit and uses existing 1-based Compiler coordinates.
- Host Schema / Host Bridge / Usage Manifest / Audit remain separate artifacts.
- Sinan remains a partner profile / fixture only.
- No Runtime Preview Bridge, host save/load, Rollback / Trace Replay / Flashback, Presentation IR or Host Schema action policy expansion is introduced.

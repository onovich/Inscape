# Source Location External Contract

日期：2026-06-21

状态：Round 3 external contract baseline；面向 Host Integration Package 的 diagnostics、dry-run report、Usage / Audit 和 localization source jump。

## 目标

Source Location External Contract 定义外部宿主、dry-run importer 和审查工具如何把 package 中的 report / diagnostic / localization row 回到 `.inscape` 源文件与具体位置。

本契约补充 [Source Location Contracts](source-location-contracts.md)。既有文档固定了 Compiler 1-based 坐标和编辑器 0-based 坐标；本文固定对外 package 的可消费形状、引用规则和 failure 状态。

## 非目标

- 不改变 Compiler source model。
- 不新增 parser 语义。
- 不要求 partner importer 解析 `.inscape` 源文本。
- 不定义 Runtime save / load、Trace Replay、Rollback 或 Runtime Preview Bridge。
- 不定义 Host Bridge candidate 字段；它会在 Round 4 单独定义。
- 不为 Sinan 新增专用 source location 字段。

## Coordinate Systems

### Compiler Source Location

Compiler / Tooling / CLI JSON 中的 source location 使用：

```json
{
  "sourcePath": "samples/court-loop.inscape",
  "line": 6,
  "column": 1
}
```

规则：

- `line` 是 1-based。
- `column` 是 1-based。
- `sourcePath` 是 producer 给出的源码路径文本。
- 当前 Compiler source location 不保证 range length。
- 这是 graph、diagnostic、Usage Manifest 和 direct CLI artifact 的语义源头。

### External Source Ref

Package 内面向外部 importer 的标准 source ref 使用：

```json
{
  "path": "source/court-loop.inscape",
  "line": 6,
  "column": 1,
  "length": 1,
  "coordinateSystem": "compiler-1-based"
}
```

规则：

- `path` 必须是 package-relative path 或 workspace-relative path。Package manifest 应说明 root policy。
- `line` / `column` 仍是 1-based Compiler 坐标。
- `length` 可选；存在时表示源码 token 的字符长度，至少为 `1`。
- `coordinateSystem` 固定为 `compiler-1-based`，用于避免被编辑器 0-based payload 混淆。

### Editor Reveal

编辑器宿主显示时再转换为 0-based editor reveal：

```text
editor.line = max(0, source.line - 1)
editor.character = max(0, source.column - 1)
```

外部 importer 不得把 0-based editor `character` 写回 Compiler source ref，也不得把 `column` 当成 VSCode `character`。

## Path Rules

Package source refs should prefer:

```text
source/<workspace-relative-path>
```

Direct CLI artifacts may currently emit absolute paths. Package builders and partner importers must treat direct absolute paths as producer implementation detail and should normalize or map them through package manifest metadata before exchange.

Recommended manifest metadata:

```json
{
  "workspace": {
    "name": "samples",
    "rootPolicy": "workspace-relative"
  },
  "sourceRoot": {
    "kind": "package-directory",
    "path": "source"
  }
}
```

Rules:

- Package source path identity is package/workspace-relative, not local absolute path.
- Absolute local paths may appear in direct CLI output but are not stable external identity.
- `..`, drive-root escape, URI schemes and host-specific virtual paths must not appear in package source refs.
- If source was redacted or not copied into package, report `sourceAvailability = "not-packaged"` rather than inventing a fake path.

## Embedded Source Locations

Current artifacts already carry source information:

| Artifact | Source Shape | Notes |
| --- | --- | --- |
| `graph/project-ir.json` | `sourcePath,line,column` | Nodes, lines, choices, options and edges may contain source objects. |
| `usage/usage.json` | `path,line,column,length` | Query/action/requiredId usages use 1-based coordinates. |
| `host/host-integration-audit.json` | diagnostic / usage source refs | Audit diagnostics should point back to Usage or Host artifacts. |
| `localization/l10n.csv` | `sourcePath,line,column` | CSV rows identify translatable source lines. |
| `source-map/source-locations.json` | external source ref index | Package-level index defined by this contract; generation may be manual until tooling exists. |

Round 3 does not require duplicating every embedded source object into `source-map/source-locations.json`. The package-level source map exists to normalize paths, index source refs, and give partner reports one consistent reference vocabulary.

## Source Map Artifact

Recommended `source-map/source-locations.json` shape:

```json
{
  "format": "inscape.source-locations",
  "formatVersion": 1,
  "coordinateSystem": "compiler-1-based",
  "sources": [
    {
      "id": "src_001",
      "path": "source/court-loop.inscape",
      "workspacePath": "court-loop.inscape",
      "availability": "packaged"
    }
  ],
  "locations": [
    {
      "id": "loc_001",
      "sourceId": "src_001",
      "line": 6,
      "column": 1,
      "length": 1,
      "role": "localization-row",
      "artifact": {
        "kind": "localization-csv",
        "path": "localization/l10n.csv",
        "rowKey": "l1_b3e1cc006eba688c"
      }
    }
  ]
}
```

Stable fields:

- `format`: fixed to `inscape.source-locations`.
- `formatVersion`: current version is `1`.
- `coordinateSystem`: fixed to `compiler-1-based`.
- `sources[].id`: package-local source identity.
- `sources[].path`: package-relative path when source is packaged.
- `sources[].workspacePath`: workspace-relative path when known.
- `sources[].availability`: `packaged`, `external`, `not-packaged`, or `redacted`.
- `locations[].id`: package-local location identity.
- `locations[].sourceId`: links to `sources[].id`.
- `locations[].line` / `column` / optional `length`: 1-based Compiler coordinates.
- `locations[].role`: why this location is indexed.
- `locations[].artifact`: artifact row or object that originated the reference.

## Location Roles

First version roles:

- `graph-node`: node declaration source.
- `graph-line`: narrative line source.
- `graph-choice`: choice prompt or option source.
- `graph-edge`: jump / edge source.
- `compiler-diagnostic`: Compiler diagnostic source.
- `usage-query`: Usage Manifest query source.
- `usage-action`: Usage Manifest action / hook source.
- `usage-required-id`: Usage Manifest required id token source.
- `host-audit-diagnostic`: Host Integration Audit diagnostic source.
- `localization-row`: localization CSV row source.
- `partner-dry-run-diagnostic`: partner-owned dry-run report source reference back into Inscape.

Unknown roles must be ignored or displayed generically by consumers.

## Report Source Ref

Every report / diagnostic that refers to `.inscape` source should carry either an inline source ref or a `locationId` into `source-map/source-locations.json`.

Inline form:

```json
{
  "severity": "warning",
  "code": "host-action.unknown",
  "message": "Unknown action play_cutscene.",
  "source": {
    "path": "source/court-loop.inscape",
    "line": 31,
    "column": 1,
    "length": 28,
    "coordinateSystem": "compiler-1-based"
  }
}
```

Indexed form:

```json
{
  "severity": "warning",
  "code": "host-action.unknown",
  "locationId": "loc_104"
}
```

Rules:

- Compiler syntax diagnostics should point to Compiler source spans.
- Usage / Audit diagnostics should point to the smallest token they can identify, such as query name, action name, required id or timeline alias.
- Partner dry-run diagnostics should reuse source refs from package artifacts instead of reparsing `.inscape`.
- If no exact source is available, use a broader source ref and set `precision = "line"` or `precision = "document"`.

## Precision And Availability

Recommended optional fields:

```json
{
  "precision": "token",
  "sourceAvailability": "packaged"
}
```

`precision` values:

- `token`: location identifies a token or short range.
- `line`: location identifies a source line.
- `node`: location identifies a node declaration or block.
- `document`: location identifies a source document only.
- `unknown`: no reliable source.

`sourceAvailability` values:

- `packaged`: source file is included in `source/`.
- `external`: source path is known but file is not included.
- `not-packaged`: source intentionally omitted.
- `redacted`: source location is intentionally hidden.

Reports must not pretend `token` precision when only line or document evidence is available.

## Failure States

Source location consumers should report:

- `ready`: source ref resolves to a packaged or known workspace source.
- `missing-source`: source file is not present.
- `invalid-path`: source path escapes package/workspace boundary.
- `invalid-location`: line / column is not positive or outside known document range.
- `incompatible-coordinate-system`: coordinate system is unknown or editor 0-based.
- `unresolved-location-id`: report references a missing source-map location id.
- `not-packaged`: source was not included; report remains reviewable but no local jump is available.

## Partner Importer Rules

Partner importers:

- May use source refs for dry-run report source jumps.
- May store source refs in generated candidate reports.
- Must not parse `.inscape` to infer missing graph, usage, localization or source map semantics.
- Must not rewrite source paths into host runtime data as stable game IDs.
- Must treat source locations as authoring/debug evidence, not runtime truth.
- Must preserve Inscape source refs in report-first POC output when possible.

## Compatibility Rules

- Consumers must reject unknown `format`.
- Consumers must reject unsupported higher `formatVersion`.
- Consumers should ignore unknown optional fields.
- Producers may add optional fields without version bump.
- Producers must bump `formatVersion` before changing coordinate semantics.
- The package contract must not depend on local absolute paths, editor 0-based coordinates or exact diagnostic message text.

## Round 3 Self-Check

- Every report / diagnostic class has a source ref route: embedded source, inline source, or `locationId`.
- `compiler-1-based` remains explicit.
- Partner importer does not parse `.inscape`.
- Source refs do not introduce Sinan-specific fields.
- This contract does not implement host save, Runtime Preview Bridge, Rollback, Trace Replay, Flashback or Presentation IR.

# Host Bridge Candidate Contract

日期：2026-06-21

状态：Round 4 external contract baseline；面向 Host Integration Package 的 `host/host-bridge-candidate.json`、partner dry-run report 和 manual review。

## 目标

Host Bridge Candidate 是外部宿主集成中的待确认映射证据。它把 Usage Manifest、Host Schema、Host Integration Audit、partner catalog 或 dry-run report 中发现的缺口整理成可审查的候选项。

它回答：

- 剧本实际需要什么 query、action、resource、speaker 或 id binding？
- 现有 Host Schema / Host Bridge 是否已经覆盖？
- 如果没有覆盖，候选映射是什么，置信度如何，是否冲突？
- 人工确认后应该写入哪一类正式 artifact？

## 非目标

- 不替代 [Host Bridge Contract](host-bridge-contract.md)。
- 不写 `inscape.host.bridge.json`。
- 不写宿主正式 data。
- 不生成可执行 dispatcher、adapter 或 Host SDK。
- 不接入 Sinan Runtime、Unity Runtime、Runtime Preview Bridge 或 live preview。
- 不新增 Host Schema action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不把 Sinan catalog、Unity GUID、Addressables、ScriptableObject 或项目内部 API 写入 Compiler / Host Schema truth。

## 心智模型

```text
Usage Manifest + Host Schema + Host Bridge + partner catalog
  -> Host Integration Audit / partner dry-run
  -> Host Bridge Candidate
  -> manual review
  -> confirmed Host Bridge or rejected evidence
```

Candidate artifact 只是中间证据。即使一个 candidate 被人工接受，也必须由明确的 owner 把它复制或转写到正式 Host Bridge / adapter artifact 中；candidate 本身不成为 Runtime truth。

## Artifact

Integration Package 中的候选文件：

```text
host/host-bridge-candidate.json
```

推荐 shape：

```json
{
  "format": "inscape.host-bridge-candidate",
  "formatVersion": 1,
  "createdAtUtc": "2026-06-21T00:00:00Z",
  "profile": {
    "kind": "partner-profile",
    "partner": "generic",
    "purpose": "static-artifact-poc"
  },
  "sourceArtifacts": {
    "usage": "usage/usage.json",
    "hostSchema": "host/host-schema-capabilities.json",
    "hostIntegrationAudit": "host/host-integration-audit.json",
    "hostBridge": "host/inscape.host.bridge.json"
  },
  "summary": {
    "candidateCount": 1,
    "conflictCount": 0,
    "blockedCount": 0,
    "writesHostData": false
  },
  "candidates": [
    {
      "id": "cand_timeline_court_intro",
      "candidateKind": "id-binding",
      "status": "candidate",
      "subject": {
        "kind": "timeline",
        "name": "court_intro"
      },
      "demand": {
        "artifact": "usage/usage.json",
        "kind": "required-id",
        "reason": "timeline-hook-alias",
        "source": {
          "path": "source/court-loop.inscape",
          "line": 4,
          "column": 23,
          "length": 11,
          "coordinateSystem": "compiler-1-based"
        }
      },
      "proposedMapping": {
        "bridgeTarget": "ids[]",
        "host": {
          "assetPath": "Assets/Timeline/CourtIntro.playable"
        }
      },
      "confidence": {
        "level": "medium",
        "score": 0.67,
        "reasons": [
          "name-normalized-match"
        ]
      },
      "review": {
        "required": true,
        "decision": "unreviewed",
        "owner": "partner"
      },
      "ownership": {
        "producer": "partner-dry-run",
        "generatedOwnership": "candidate-only",
        "writesHostData": false
      }
    }
  ]
}
```

Stable top-level fields:

- `format`: fixed to `inscape.host-bridge-candidate`.
- `formatVersion`: current version is `1`.
- `profile`: partner profile metadata; partner can be `sinan`, but only as fixture/profile evidence.
- `sourceArtifacts`: package-relative paths to inputs that produced the candidate.
- `summary`: counts and global safety flags.
- `candidates[]`: reviewable candidate records.

## Candidate Kinds

First version candidate kinds:

- `id-binding`: proposes a Host Bridge `ids[]` mapping such as speaker, timeline, item, role, ui-window or resource alias.
- `action-handler`: proposes a Host Bridge `actions[]` handler mapping for an existing Host Schema action.
- `query-handler`: proposes a Host Bridge `queries[]` handler mapping for an existing Host Schema query.
- `schema-capability`: records that a script used an unknown query/action and a Host Schema decision is needed before bridge mapping can exist.
- `resource-binding`: proposes project resource coordinates for an existing Inscape readable id.
- `partner-diagnostic`: carries partner dry-run evidence that cannot be converted into a mapping without manual context.

Unknown candidate kinds must be displayed generically and must not be auto-applied.

## Status Values

Candidate status values:

- `candidate`: one plausible mapping exists, still unreviewed.
- `conflict`: multiple plausible mappings exist or names collide.
- `blocked`: missing schema, missing catalog, unsupported partner feature or insufficient evidence.
- `unsupported`: the partner profile says this feature is outside POC-1 support.
- `rejected`: reviewer rejected the candidate; keep as audit trail.
- `accepted-to-bridge`: reviewer accepted the evidence and a separate confirmed Host Bridge change is expected or already made.

`accepted-to-bridge` does not mean the candidate artifact itself is authoritative. Confirmed mapping lives in `inscape.host.bridge.json` or a partner adapter artifact.

## Subject And Demand

`subject` identifies what is being mapped:

```json
{
  "kind": "timeline",
  "name": "court_intro"
}
```

Common subject kinds:

- `speaker`
- `timeline`
- `item`
- `role`
- `ui-window`
- `resource`
- `query`
- `action`
- `legacy-event`

`demand` points to why the subject is needed:

- Usage Manifest query/action/requiredId.
- Host Integration Audit diagnostic.
- Partner dry-run diagnostic.
- Partner catalog projection.

Demand should carry source refs using [Source Location External Contract](source-location-external-contract.md) whenever the need comes from `.inscape` source.

## Proposed Mapping

`proposedMapping` is intentionally shaped like a patch target, not a direct write instruction.

Examples:

```json
{
  "bridgeTarget": "ids[]",
  "host": {
    "roleId": 1002
  }
}
```

```json
{
  "bridgeTarget": "actions[]",
  "handler": {
    "kind": "unity-method",
    "typeName": "Game.NarrativeTimelineBridge",
    "memberName": "PlayTimeline"
  }
}
```

Rules:

- `bridgeTarget` names where a confirmed mapping would live.
- `host` and `handler` are evidence objects and may use partner-specific fields.
- Host-specific fields must remain in Host Bridge / candidate / adapter artifacts, not Host Schema or Compiler.
- Candidate producers must not modify confirmed bridge files.

## Confidence

Confidence is review aid, not automation permission.

Recommended shape:

```json
{
  "level": "medium",
  "score": 0.67,
  "reasons": [
    "name-normalized-match",
    "catalog-kind-match"
  ]
}
```

Levels:

- `exact`: deterministic exact id match.
- `high`: strong match, still needs review.
- `medium`: plausible match.
- `low`: weak match.
- `none`: no mapping candidate.

Even `exact` candidates require explicit review before becoming confirmed Host Bridge rows.

## Conflicts

Conflict example:

```json
{
  "status": "conflict",
  "conflicts": [
    {
      "reason": "multiple-host-catalog-matches",
      "candidates": [
        {
          "host": {
            "assetPath": "Assets/Timeline/CourtIntro.playable"
          },
          "confidence": {
            "level": "medium",
            "score": 0.62
          }
        },
        {
          "host": {
            "assetPath": "Assets/Cinematics/CourtIntro.playable"
          },
          "confidence": {
            "level": "medium",
            "score": 0.60
          }
        }
      ]
    }
  ]
}
```

Rules:

- Conflicts must not be auto-resolved.
- Conflicts should preserve source refs and catalog evidence.
- If two candidates are tied, keep both and mark manual review required.

## Manual Review

Recommended review shape:

```json
{
  "required": true,
  "decision": "unreviewed",
  "owner": "partner",
  "note": ""
}
```

Decision values:

- `unreviewed`
- `accepted`
- `rejected`
- `needs-schema`
- `needs-host-catalog`
- `needs-partner-decision`

Accepted review should name the resulting confirmed artifact when available:

```json
{
  "decision": "accepted",
  "result": {
    "artifact": "host/inscape.host.bridge.json",
    "target": "ids[]"
  }
}
```

## Generated Ownership

Candidate ownership fields must make write boundaries obvious:

```json
{
  "producer": "partner-dry-run",
  "generatedOwnership": "candidate-only",
  "writesHostData": false
}
```

Producer values:

- `inscape-tooling`
- `partner-dry-run`
- `manual`
- `future-generator`

`generatedOwnership` values:

- `candidate-only`: generated output is review evidence only.
- `confirmed-bridge-source`: generated output can become a Host Bridge source after explicit review.
- `partner-owned-report`: partner owns the report; Inscape only references it.

POC-1 packages must keep `writesHostData = false`.

## Sinan Catalog Projection Boundary

Sinan may provide catalog data in future POC planning. Candidate rules:

- Sinan catalog can be projected into `schema-capability`, `id-binding`, `action-handler` or `query-handler` candidates.
- Sinan catalog does not become Host Schema truth until a host-neutral Host Schema artifact is produced.
- Sinan runtime IDs, data paths, Director / World / Timeline / Camera details and UI runtime semantics remain partner evidence.
- Candidate fields may include `profile = "sinan"` only to mark partner fixture context.
- `src/Internal` must not read Sinan catalog.

## Validation Rules

Package validation should check:

- `format = "inscape.host-bridge-candidate"`.
- `formatVersion` is supported.
- `summary.writesHostData` is false for POC-1.
- Every candidate has `id`, `candidateKind`, `status`, `subject`, `review`, and `ownership`.
- `ownership.writesHostData` is false for every candidate.
- `candidateKind = "action-handler"` only targets actions that exist in Host Schema.
- `candidateKind = "query-handler"` only targets queries that exist in Host Schema.
- Unknown schema action/query usage produces `schema-capability` or `blocked`, not fake handler mapping.
- Source refs use `compiler-1-based`.
- Conflict candidates are not marked accepted without a review decision.

Validation statuses:

- `ready`: candidate artifact is shape-valid and reviewable.
- `empty`: no bridge candidates were needed.
- `invalid`: JSON or required fields are invalid.
- `blocked`: mapping cannot proceed without Host Schema, Host Bridge, catalog or partner input.
- `incompatible`: unsupported format version.

## Compatibility Rules

- Consumers must reject unknown `format`.
- Consumers must reject unsupported higher `formatVersion`.
- Consumers should ignore unknown optional fields.
- Producers may add optional fields without version bump.
- Producers must bump `formatVersion` before changing status semantics, write boundary semantics or coordinate semantics.

## Round 4 Self-Check

- Candidate is clearly separate from confirmed Host Bridge.
- Candidate cannot write host data.
- Unknown action/query stays blocked until Host Schema decision.
- Conflict and manual review states are explicit.
- Sinan remains partner profile / fixture evidence only.
- This contract does not implement Host SDK, runtime integration, generated apply, Runtime Preview Bridge, host save, Rollback, Trace Replay, Flashback or Presentation IR.

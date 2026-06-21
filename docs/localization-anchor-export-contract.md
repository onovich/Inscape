# Localization Anchor Export Contract

日期：2026-06-21

状态：Round 3 external contract baseline；面向 Host Integration Package 的 `localization/l10n.csv`、anchor map、line identity 和 partner localization handoff。

## 目标

Localization Anchor Export Contract 定义外部宿主如何消费 Inscape 的本地化源文本锚点、CSV、anchor map、source map 与 line identity。

本契约的重点是保持 Inscape 源文本本地化 truth 清楚：`anchor` 是 Inscape 源文本翻译流转的稳定键；宿主运行时本地化坐标由 adapter / Host Bridge / partner dry-run report 另行映射。

## 非目标

- 不把 Inscape CSV 改成 Sinan、Bird、Unity 或任一宿主的运行时 L10N 表。
- 不定义 Host Bridge candidate；Round 4 单独定义。
- 不生成或写入宿主正式 data。
- 不要求 partner importer 解析 `.inscape`。
- 不在本轮改变 `extract-l10n-project`、`update-l10n-project`、`refresh-l10n-line-map-project` 或 `audit-l10n-alignment-project` 行为。
- 不新增 Sinan-specific localization 字段到 core contract。

## Current Producer Commands

Current source localization CSV:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <root> -o localization\l10n.csv
```

Current line identity sidecar:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- refresh-l10n-line-map-project <root> -o source-map\inscape.line-map.json
```

Current alignment audit:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- audit-l10n-alignment-project <root> --from old.csv -o reports\l10n-alignment.json
```

Round 3 only defines how these artifacts relate inside an integration package. It does not introduce a new packaging command.

## CSV Contract

`localization/l10n.csv` uses the existing Inscape source localization fields:

```text
anchor,node,kind,speaker,text,translation,sourcePath,line,column
```

`update-l10n-project` may add `status` after `translation`:

```text
anchor,node,kind,speaker,text,translation,status,sourcePath,line,column
```

Field meanings:

- `anchor`: Inscape source text anchor, currently `l1_<fnv1a64-hex>`.
- `node`: author-facing node title.
- `kind`: `Narration`, `Dialogue`, `ChoicePrompt`, or `ChoiceOption`.
- `speaker`: speaker text for dialogue; empty for narration / choices.
- `text`: normalized source text for translation.
- `translation`: target translation, empty for extraction output.
- `status`: update status such as `current`, `new`, or `removed` when present.
- `sourcePath` / `line` / `column`: source location for review and source jump.

Rules:

- `anchor` is the primary source localization identity.
- `text` must remain source text; query interpolation placeholders such as `[player.name]` are preserved and not executed.
- `translation` is not required for source package exchange.
- CSV column names are part of the contract; importers must reject localization CSV missing at least `anchor`, `text`, `sourcePath`, `line`, and `column`.
- Direct CLI output may contain absolute `sourcePath`; packaged exchange should map it to package/workspace-relative path according to [Source Location External Contract](source-location-external-contract.md).

## Anchor Semantics

Current anchor algorithm is `line-v1`, documented in [Hash Localization](hash-localization.md):

```text
l1_<fnv1a64-hex>
```

The hash input includes:

- line kind
- node title
- speaker
- occurrence index for duplicate same-content lines within a node
- normalized source text

It does not include:

- file path
- absolute line number
- host runtime ID
- Unity / Bird / Sinan runtime coordinate

Rules:

- File moves should not change anchors.
- Node rename currently changes anchors unless stable node / alignment tooling bridges the migration.
- Duplicate identical text inside the same node is separated by occurrence.
- Anchor changes do not authorize silent translation reuse; alignment reports can provide review candidates.

## Anchor Map Artifact

`localization/anchor-map.json` is the package-level JSON index that links CSV rows, graph lines, source refs, optional line identity and optional partner runtime coordinates.

Recommended shape:

```json
{
  "format": "inscape.localization-anchor-map",
  "formatVersion": 1,
  "sourceLocale": "source",
  "csv": "localization/l10n.csv",
  "entries": [
    {
      "anchor": "l1_b3e1cc006eba688c",
      "nodeTitle": "法庭开场",
      "kind": "Dialogue",
      "speaker": "旁白",
      "text": "法庭里很安静，像在等一句台词落地。",
      "source": {
        "path": "source/court-loop.inscape",
        "line": 6,
        "column": 1,
        "coordinateSystem": "compiler-1-based"
      },
      "graphRef": {
        "artifact": "graph/project-ir.json",
        "nodeName": "法庭开场",
        "lineAnchor": "l1_b3e1cc006eba688c"
      },
      "lineIdentity": {
        "status": "available",
        "lineId": "line_019EE9DEDA4C73A8992B462BFDB633E8",
        "fingerprint": "法庭里很安静，像在等一句台词落地。"
      },
      "partnerRefs": []
    }
  ]
}
```

Stable fields:

- `format`: fixed to `inscape.localization-anchor-map`.
- `formatVersion`: current version is `1`.
- `csv`: package-relative CSV path.
- `entries[].anchor`: links to `localization/l10n.csv`.
- `entries[].nodeTitle`: author-facing node title.
- `entries[].kind` / `speaker` / `text`: mirror CSV review context.
- `entries[].source`: external source ref using `compiler-1-based`.
- `entries[].graphRef`: optional link to Narrative Graph IR.
- `entries[].lineIdentity`: optional line-map signal.
- `entries[].partnerRefs`: optional partner-owned mapping evidence, not Inscape source truth.

## Relationship To Source Map

Localization source refs follow [Source Location External Contract](source-location-external-contract.md).

Rules:

- `anchor-map.entries[].source` may be inline.
- `anchor-map.entries[]` may also use `locationId` if `source-map/source-locations.json` indexes the row.
- The CSV `sourcePath,line,column` remains a review fallback.
- Package consumers should prefer normalized source refs over direct absolute CSV paths.

## Relationship To Narrative Graph IR

Narrative Graph IR lines, choice prompts and choice options may carry the same `anchor` values as localization CSV rows.

Rules:

- `anchor` connects localization rows back to visible graph text.
- `graphRef.nodeName` is author-facing graph identity, not stable node id.
- `graphRef.lineAnchor` should match `entries[].anchor` when present.
- If graph text and CSV text disagree for the same anchor, package validation should report `anchor-text-mismatch`.
- External importers should not re-parse `.inscape` to reconstruct translatable text when CSV / graph already provides it.

## Relationship To Stable Node And Line Identity

Stable node id and line identity are migration aids, not replacements for source localization anchors.

Stable node id:

- Comes from `inscape.node-map.json` / [Stable Node ID Contract](stable-node-id-contract.md).
- Helps detect node renames and align old translations.
- Is optional in the first package anchor map.
- Must not replace author-facing `node` / `nodeTitle` in CSV.

Line identity:

- Comes from `refresh-l10n-line-map-project`.
- Current line map format is `inscape.localization-line-map`.
- It contains documents, blocks, lines, `lineId`, `lineNumber`, `kind`, `speaker`, `text`, and `fingerprint`.
- It is useful for alignment and review, especially when anchors change.
- It must not be treated as host runtime localization ID.

Line identity status values:

- `available`: line-map sidecar is present and current.
- `missing`: no line-map signal is available.
- `legacy`: line-map exists but lacks current drift metadata.
- `drift`: line-map may not match current source and must not drive automatic inheritance.
- `not-applicable`: text kind is not tracked by line-map.

## Relationship To Partner Runtime Localization

Partner runtime localization tables may use their own coordinates:

- `talkingId + talkingIndex`
- integer string table id
- asset guid
- database key
- route / scene / UI id
- Sinan-owned data id

Those are partner runtime coordinates. They must be represented as mapping evidence, not as Inscape anchor replacement.

Example partner reference:

```json
{
  "partnerRefs": [
    {
      "profile": "sinan",
      "status": "candidate",
      "runtimeKey": null,
      "note": "POC-1 dry-run has not assigned host runtime data."
    }
  ]
}
```

Rules:

- POC-1 partner refs are optional and may remain empty.
- Candidate partner refs do not write host data.
- Confirmed partner runtime localization mapping belongs to Host Bridge / adapter artifacts, not Compiler or source localization CSV.
- Sinan-specific runtime keys must not enter `anchor` or core CSV semantics.

## Translation Update And Alignment

Existing update and audit behavior:

- `update-l10n-project` inherits translation only by exact `anchor`.
- `audit-l10n-alignment-project` can use stable node id and line identity to produce review candidates.
- Similar text candidates remain manual review evidence and must not silently become confirmed translation.

Package status should distinguish:

- `current`: anchor exact match retained.
- `new`: source text has no confirmed translation.
- `removed`: old translated anchor no longer appears in current source.
- `changed`: old translation is a review candidate for changed source.
- `conflict`: multiple candidates require manual choice.
- `stale`: translation candidate exists but is not confirmed.

These statuses support partner handoff and translation review. They do not run Runtime and do not execute query interpolation.

## Validation Rules

Package validation should check:

- Every CSV row has non-empty `anchor`, `kind`, `text`, `sourcePath`, `line`, and `column`.
- `line` and `column` are positive integers.
- Every `anchor-map.entries[].anchor` exists in `localization/l10n.csv`.
- Every CSV `anchor` appears at most once per package unless explicitly marked as duplicate conflict.
- `anchor-map.entries[].source` resolves according to Source Location External Contract.
- `graphRef.lineAnchor`, when present, exists in `graph/project-ir.json`.
- `lineIdentity.status = "available"` only when line-map sidecar is present and not drifted.
- Partner refs with `status = "candidate"` do not claim host data was written.

Validation statuses:

- `ready`: CSV and anchor map are shape-valid.
- `missing`: required localization artifact absent for package with translatable text.
- `invalid`: CSV / JSON cannot be parsed or required columns are missing.
- `anchor-mismatch`: anchor exists in one artifact but not another.
- `source-unresolved`: source ref cannot be resolved.
- `line-identity-drift`: line map is present but not current.
- `partner-mapping-candidate`: partner runtime mapping exists only as review evidence.

## Partner Importer Rules

Partner importers:

- May use `localization/l10n.csv` as source text handoff.
- May use `anchor-map.json` to connect source text, graph text and report source refs.
- May produce partner-specific candidate mapping reports that reference Inscape `anchor`.
- Must not overwrite host runtime localization data during POC-1.
- Must not treat Inscape `anchor` as a host runtime key unless the host adapter explicitly maps it.
- Must not add Sinan-specific fields to Inscape CSV truth.

## Round 3 Self-Check

- Anchor / CSV / anchor map / source map / line identity relationship is explicit.
- Partner importer does not parse `.inscape`.
- Inscape source CSV remains host-neutral and not Sinan-specific.
- Similarity / line identity remain review signals, not silent translation inheritance.
- This contract does not implement Runtime Preview Bridge, host save, generated candidate apply, Rollback, Trace Replay, Flashback or Presentation IR.

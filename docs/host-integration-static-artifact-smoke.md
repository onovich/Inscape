# Host Integration Static Artifact Smoke

日期：2026-06-21

状态：Round 5 static artifact smoke baseline；面向 POC-1 fixture / report / planning 收口。

## 目标

本 smoke 验证 Round 4 static fixture pack 是否满足 POC-1 handoff 的最小静态条件：

- JSON 可解析。
- 七类必需场景齐全。
- fixture id 唯一。
- source path 使用 package-relative `source/` 路径。
- diagnostic source ref 使用 `compiler-1-based`。
- Host Bridge candidate 只作为 review evidence，`writesHostData = false`。
- unknown action 仍是 `schema-capability` / `blocked`，不伪造 `action-handler`。
- localization fixture 不声明 host runtime localization id。
- fixture pack 可 canonicalize，具备 deterministic / diffable smoke evidence。

## Command

```powershell
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
```

配套语法检查：

```powershell
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
```

## Output

脚本只输出 stdout JSON summary，不写入 package、不生成宿主数据、不生成确认后的 Host Bridge。

输出字段：

- `status`: `pass` or process failure.
- `fixturePath`: fixture pack path.
- `fixtureCount`: parsed fixture count.
- `requiredScenarioCount`: expected scenario count.
- `canonicalSha256`: sorted-key canonical JSON hash for deterministic comparison.
- `writesHostData`: always `false` for this smoke.
- `sourceCoordinateSystem`: expected source coordinate system.

## Boundaries

This smoke does not:

- compile `.inscape` source;
- run Inscape Runtime;
- start SelfHostedEditor;
- connect Sinan Runtime, Unity Editor or Host SDK;
- generate confirmed Host Bridge mappings;
- write host data;
- validate Rollback, Trace Replay, Flashback, Presentation IR or runtime preview behavior.

## Round 5 Result

Latest local result is PASS when the command exits `0` and prints a JSON object with `status = "pass"`. The canonical hash is intentionally produced by the command rather than copied into this document as a normative value, so future fixture changes can update the hash without editing this contract first.

Buffer use: none. Round 5 used the planned smoke / report / POC planning scope and did not consume the buffer for feature fixes.

## Readiness Report Generator Smoke

`HostIntegrationReadinessReportSmoke.js` covers the standalone package report
generator added after the package CLI baseline:

```powershell
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
```

The smoke creates a temporary workspace, exports a Host Integration Package, and
then calls:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package <package-dir> -o <report.json>
```

Coverage:

- real package report generation;
- compiler and Host Integration Audit diagnostic aggregation;
- missing required artifact result;
- invalid JSON artifact result;
- existing `host/host-bridge-candidate.json` summary without generating or
  rewriting candidate evidence;
- missing `-o` and output-directory guard;
- repeated generation byte determinism;
- `writesHostData = false`, no Runtime integration, no preview bridge, no Host
  Bridge candidate generation.

The smoke does not run Runtime, connect Unity / Host SDK / Sinan Runtime, write
host data, generate host apply output, generate candidate evidence through the
readiness report path, or confirm Host Bridge mappings.

## Host Bridge Candidate Generator Smoke

`HostBridgeCandidateGeneratorSmoke.js` covers the standalone Host Bridge
Candidate generator added after the package and readiness report CLI baselines:

```powershell
node --check docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
```

The smoke creates a temporary workspace, exports a Host Integration Package, and
then calls:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-bridge-candidate-package <package-dir> -o <candidate.json>
```

Coverage:

- package export still does not generate `host/host-bridge-candidate.json` by
  default;
- candidate output shape, UTF-8 without BOM and repeated generation
  determinism;
- id-binding, action-handler and query-handler candidates for declared schema
  gaps;
- blocked schema-capability evidence for unknown action/query usage;
- no fake handler candidate for unknown action usage;
- `writesHostData = false` and `generatedOwnership = "candidate-only"`;
- missing `-o` and output-directory guard.

The smoke does not run Runtime, connect Unity / Host SDK / Sinan Runtime, write
host data, generate host apply output, confirm Host Bridge mappings or project a
partner catalog.

## Partner Handoff Kit Smoke

`PartnerHandoffKitSmoke.js` covers the generic partner feedback fixture added
for the Static Artifact POC Partner Handoff Kit:

```powershell
node --check docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
```

Coverage:

- parses `partner-feedback.generic.json`;
- verifies `format = inscape.host-integration.partner-feedback`;
- checks `partnerEvidence`, `candidateEvidence` and `confirmedTruth`
  separation;
- requires every write / apply / runtime / host save boundary flag to be false;
- rejects Host Schema action policy expansion keys;
- checks candidate evidence references existing partner evidence;
- checks source refs use `compiler-1-based`.

The smoke does not generate package artifacts, call partner tooling, run
Runtime, connect Unity / Host SDK / Sinan Runtime, write host data, generate
host apply output or confirm Host Bridge mappings.

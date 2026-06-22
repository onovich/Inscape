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
- missing `-o` and output-directory guard;
- repeated generation byte determinism;
- `writesHostData = false`, no Runtime integration, no preview bridge, no Host
  Bridge candidate generation.

The smoke does not run Runtime, connect Unity / Host SDK / Sinan Runtime, write
host data, generate host apply output, or confirm Host Bridge mappings.

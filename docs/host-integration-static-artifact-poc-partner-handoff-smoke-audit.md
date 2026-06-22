# Static Artifact POC Partner Handoff Kit Round 3 Audit

日期：2026-06-22

状态：Round 3 handoff smoke / docs hardening audit。

## 本轮范围

Round 3 把 partner handoff kit 的 feedback fixture boundary 变成可执行 smoke：

- 新增 [PartnerHandoffKitSmoke.js](host-integration-static-fixtures/PartnerHandoffKitSmoke.js)。
- 同步 [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md)、fixture README、handoff kit、agent handoff、TODO 与 docs README。
- 继续保持本阶段为 static artifact / docs / fixture smoke，不生成 package artifact 入库。

## Architecture Self-Check

- `src/Internal` 未修改；没有新增 Compiler / Tooling / Runtime 语义。
- `src/ExternalSupport` 未修改；没有新增 VSCode / SelfHostedEditor / Unity / Host SDK behavior。
- `PartnerHandoffKitSmoke.js` 只读 `partner-feedback.generic.json`，不调用 Inscape CLI，不写 package，不写 report，不写 host data。
- Smoke 检查 `partnerEvidence`、`candidateEvidence` 与 `confirmedTruth` 分层，确认 `confirmedTruth` 为空。
- Smoke 拒绝 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`，并要求 write / apply / runtime / host save flags 全为 false。

## Debug Self-Check

- Generic feedback fixture 可解析。
- Fixture source refs 使用 `compiler-1-based`。
- Candidate evidence 引用已存在的 partner evidence。
- `schema-capability` evidence 不伪造 mapping。
- Round 4 仍需要 final validation / PASS-FAIL closure 与完整验证矩阵。

## Round 3 Validation

已运行：

```powershell
node --check docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
git diff --check
rg -n "host-integration-static-artifact-poc-partner-handoff|Static Artifact POC Partner Handoff|PartnerHandoffKitSmoke|partner-feedback.generic" docs
```

Round 3 还需运行 guide 要求的边界扫描；`rg` 无输出 / exit code 1 按“无命中即边界通过”记录。

结果：

- `node --check docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js`：PASS。
- `node docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js`：PASS，输出 `status = "pass"`，`writesHostData = false`，`generatedApply = false`，`runtimeIntegration = false`，`hostSave = false`。
- `node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js`：PASS。
- `node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js`：PASS，输出 `status = "pass"`。
- `node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js`：PASS。
- `node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js`：PASS on isolated rerun，输出 `status = "pass"`，`hostBridgeCandidateGenerated = false`。备注：首次与 readiness smoke 并行运行时出现一次 package export transient failure；随后顺序重跑通过，Round 4 final validation 应按命令列表顺序运行。
- `node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js`：PASS。
- `node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js`：PASS，输出 `status = "pass"`，`hostBridgeCandidateGenerated = false`。
- `git diff --check`：PASS，无输出。
- docs keyword scan：PASS，命中 `PartnerHandoffKitSmoke`、`partner-feedback.generic`、handoff kit、audit 与 docs 接力入口。
- BOM check：PASS，本轮新增 / 修改文件均无 UTF-8 BOM。

边界扫描：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

结果：四条扫描均无输出；`rg` exit code 1 按 guide 解释为无命中，即边界通过。

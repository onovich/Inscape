# SelfHostedEditor P0 自检文档

状态：测试自检清单

日期：2026-06-15

适用范围：`src/ExternalSupport/SelfHostedEditor`

相关文档：

- [SelfHostedEditor P0 12 轮内执行方案](self-hosted-editor-p0-12-round-execution-plan.md)
- [SelfHostedEditor 当前阶段 100% 收口推进计划](self-hosted-editor-current-stage-100-plan.md)
- [SelfHostedEditor desktop backend v0 实施计划](self-hosted-editor-desktop-backend-v0-plan.md)
- [TODO](todo.md)
- [Agent 接手指南](agent-handoff.md)

## 用途

本文用于测试和验收 P0 current-stage readiness 是否完成。它不是实现计划，而是给实现 session 或复核 session 使用的自检清单。

P0 自检只验证当前 dev-host / backend-client / fallback / session vocabulary 阶段是否收口，不验证 Electron、embedded EditorBackend、DocumentBufferStore、autosave/recovery 或 desktop package。

## 自检前提

开始前确认：

1. 已读 `docs/self-hosted-editor-p0-12-round-execution-plan.md`。
2. 工作树中没有不明来源的大改；如已有未提交文档变更，先确认它们属于当前 P0 / backend 计划线。
3. 当前轮没有开始实现 P1 内容，例如 Electron、preload、正式 `DocumentBufferStore` 或 autosave/recovery。

先执行：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

记录当前分支、未提交文件和是否存在与 P0 无关的变更。

## 快速通过标准

P0 自检通过时，应同时满足：

1. `check:structure` 不再输出当前可消除 warning。
2. `check:style-structure` 不再输出 hard-coded color / style owner / 行数阈值等当前可消除 warning。
3. Workspace Summary 在 hosted inputs 完整时使用 hosted/shared normal path。
4. Workspace Summary 只有 hosted inputs 不完整时才允许 draft fallback。
5. Preview / StoryGraph 遇到 malformed compiler/shared payload 时显示显式 contract error，不回落到 draft/offline model。
6. Localization 空 hosted presenter 保持 hosted 空状态，不混入 draft rows。
7. Outline malformed LanguageServer symbols 显示 LanguageServer error，只有请求失败才允许 draft outline。
8. fallback reason catalog 没有仍可在当前阶段解决的 `migration-target`。
9. `project-session` status 真实显示 dev-host mode、session id、workspace request snapshot、language mode 和 bounded-cache 摘要。
10. status 类 payload 不泄露文档正文、CSV、line-map 或 Runtime snapshot 本体。
11. `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 的 supported endpoints 已明确并被 smoke 覆盖。
12. README、architecture、backend migration map、handoff、TODO 没有互相矛盾的 P0 状态描述。

## 必跑命令

### SelfHostedEditor 基础

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

全部必须通过。若 `check:structure` 或 `check:style-structure` 仍输出 warning，先判断是否属于已白名单且有文档解释的例外；否则 P0 不通过。

### SelfHostedEditor HTTP smoke

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
```

全部必须通过。若失败，优先确认是否是随机端口、dev host 启动、临时 workspace 或 path normalization 问题；不要用固定端口手工 smoke 替代自动化结果。

### LanguageSession spike

默认模式：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
```

stdio spike 模式：

```powershell
$env:SELF_HOSTED_EDITOR_LANGUAGE_SESSION='stdio'
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
Remove-Item Env:\SELF_HOSTED_EDITOR_LANGUAGE_SESSION
```

通过标准：

1. 默认路径仍明确是 `process-per-request`。
2. stdio spike 只声明当前真实支持的 endpoint。
3. 如果只支持 diagnostics / documentSymbols，其他 endpoint 不得被文档或 status 暗示为 stdio-backed。
4. 如果扩展到六个 endpoint，semantic parity 与 references smoke 必须覆盖。

### VSCode parity

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

通过标准：

1. SelfHostedEditor P0 收口不能破坏 VSCode authoring semantic parity。
2. VSCode 不应吸收 SelfHostedEditor fallback / session 语义。
3. shared payload shape 不应被 SelfHostedEditor 私有重命名。

### .NET 基线

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

通过标准：

1. `Internal` 仍是 Compiler / Tooling / LanguageServer / Runtime 语义真相。
2. SelfHostedEditor P0 不引入 `Internal` 对 Unity、VSCode、HTML rendering 或第三方 UI 包的依赖。

## 结构自检

用代码和检查脚本确认：

1. 业务 controller 不直接调用 dev host `/api/*`。
2. `EditorBackendClient` 仍是前端唯一业务 backend 入口。
3. fallback 判断集中在有 owner 的 model / policy / provider 边界中。
4. `ScriptDocumentModelBuilder` 只作为有明确 reason 的 fallback 使用。
5. `ProjectWorkspaceSummaryModelBuilder` 如果仍存在，只是兼容门面，不是新的 normal path。
6. 新增测试或 contract 不依赖固定端口 `5178`。
7. 新增 P0 测试不要求 Electron / desktop shell。

建议搜索：

```powershell
rg --line-number "migration-target|draft-fallback|offline-draft|contract-error|workspace-summary-status|project-session|language-session" src\ExternalSupport\SelfHostedEditor docs
rg --line-number "/api/" src\ExternalSupport\SelfHostedEditor\Scripts
```

判断标准：

- `migration-target` 不应出现在 current-stage 已能收口的 fallback catalog 中。
- `/api/*` 调用若仍存在，应限定在 dev host transport / backend client adapter / test harness，而不是 feature controller。

## Provider 行为自检

### Workspace Summary

必须覆盖：

1. Compiler project graph、localization hosted presenter、diagnostics snapshot、Runtime provider status 都可用时，Summary 是 hosted/shared normal path。
2. hosted inputs 不完整时，才进入 draft fallback。
3. draft fallback 文案不得暗示 shared backend model 尚未完成是当前阶段阻塞。

### Preview

必须覆盖：

1. compiler project graph 正常时，Preview provider 是 compiler / Runtime-backed provider。
2. malformed compiler graph 显示 `contract-error` 或等价显式错误。
3. no graph / unavailable 才允许 offline draft。
4. Preview choice click 仍推进 reading Preview 到目标 block，并 reveal 目标 block title。

### StoryGraph

必须覆盖：

1. compiler project graph 正常时，Graph provider 是 compiler-project。
2. malformed graph 显示显式 graph data error。
3. unavailable 才允许 offline draft graph。
4. provider status 文本与 dataset/provider model 一致。

### Localization

必须覆盖：

1. hosted presenter rows 正常时，只消费 Tooling presenter。
2. 空 hosted presenter 保持 hosted 空状态。
3. `review-unavailable` 才进入 draft table fallback。
4. draft fallback 下 updated CSV export / linked-file replace 禁用，并显示原因。

### Outline

必须覆盖：

1. LanguageServer document symbols 正常时，Outline 使用 LanguageServer payload。
2. malformed symbols 显示 `language-server-error` 或等价显式错误。
3. 只有 LanguageServer 请求失败才允许 draft outline。

## Session status 自检

`project-session` status 必须表达：

1. `format` / `formatVersion`。
2. `mode: "dev-host"` 或等价明确 dev-host mode。
3. shared project session id。
4. workspace request snapshot 摘要：active path、document count、revision 或 snapshot count。
5. language mode：默认 `process-per-request`；stdio spike 时明确 `stdio-spike` 或等价名称。
6. language supported endpoints。
7. Runtime / line-map / localization bounded-cache 状态摘要。
8. cache idle / age / count / eviction 这类摘要可见。

`project-session` status 禁止暴露：

1. workspace 文档正文。
2. localization CSV 内容。
3. line-map sidecar 内容本体。
4. Runtime snapshot 内容本体。
5. secret / absolute temp file content。

## 文档一致性自检

检查以下文档是否口径一致：

```text
docs/todo.md
docs/agent-handoff.md
docs/self-hosted-editor-current-stage-100-plan.md
docs/self-hosted-editor-desktop-backend-v0-plan.md
docs/self-hosted-editor-backend-migration-map.md
src/ExternalSupport/SelfHostedEditor/README.md
```

必须一致表达：

1. P0 已完成的是 current-stage readiness，不是正式 desktop backend。
2. desktop backend v0 仍是 P1。
3. long-lived LanguageServer 是 P1.5 关键下一步，不是 P0 已完成项。
4. dev host session cache 不是产品 session state。
5. offline/draft fallback 没有被全部删除，但每个 fallback 都显式、有 owner、有触发条件。
6. Summary hosted aggregation 是当前阶段 normal path；除非后续出现跨宿主 summary presenter 需求，否则不强制下沉 Internal shared summary model。

## 禁止通过项

出现以下任一情况，P0 自检不得通过：

1. 为了通过测试而新增 Electron / preload / desktop backend 代码。
2. 为了通过测试而删除 offline fallback，但没有替代错误状态。
3. malformed shared payload 被 draft/offline model 掩盖。
4. `project-session` status 泄露正文、CSV、line-map 或 Runtime snapshot。
5. README 或 TODO 暗示正式 desktop backend 已完成。
6. stdio spike status 暗示未实现 endpoint 已被 long-lived session 支持。
7. VSCode semantic parity 失败但仍宣布 P0 完成。
8. `.NET build` 或 Internal tests 失败但未记录原因。

## 自检记录模板

完成 P0 自检后，在提交说明或交接信息中记录：

```text
P0 self-check date:
Branch:
Commit / diff summary:

Commands passed:
- SelfHostedEditor check:syntax:
- SelfHostedEditor check:structure:
- SelfHostedEditor check:style-structure:
- SelfHostedEditor check:model:
- SelfHostedEditor HTTP smokes:
- check:language-session:
- stdio semantic parity:
- VSCode check:structure:
- VSCode check:semantic-parity:
- dotnet build:
- Internal tests:

Provider checks:
- Workspace Summary:
- Preview:
- StoryGraph:
- Localization:
- Outline:

Session status checks:
- dev-host mode:
- language mode:
- bounded cache summary:
- no content leakage:

Docs updated:
- docs/todo.md:
- docs/agent-handoff.md:
- backend migration map:
- README:

Known residual risk:
-
```

## 最终结论格式

最终交接时建议用以下三行结论：

```text
P0 current-stage readiness: PASS / FAIL
P1 entry allowed: YES / NO
Blocking reason if NO:
```

## 本轮自检记录（2026-06-15）

```text
P0 self-check date: 2026-06-15
Branch: main...origin/main
Commit / diff summary: 未提交；本轮变更集中在 SelfHostedEditor P0 readiness 代码、contract/smoke 与 P0/交接文档。

Commands passed:
- SelfHostedEditor check:syntax: PASS
- SelfHostedEditor check:structure: PASS
- SelfHostedEditor check:style-structure: PASS，当前可消除的 style warning 已清零。
- SelfHostedEditor check:model: PASS
- SelfHostedEditor HTTP smokes: PASS，覆盖 semantic parity、runtime、line-map、localization review/update、node-map、session-cache、references、host schema/binding、static assets。
- check:language-session: PASS
- stdio semantic parity: PASS，SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio 下通过。
- VSCode node --check: PASS
- VSCode check:structure: PASS
- VSCode check:semantic-parity: PASS
- dotnet build: PASS；首轮因残留 Inscape.LanguageServer --stdio 进程锁定 DLL 失败，已修复 dispose 清理并确认最终通过。
- Internal tests: PASS

Provider checks:
- Workspace Summary: PASS，hosted inputs 完整时走 hosted/shared normal path；draft 只保留为 hosted inputs 不可用时的 fallback。
- Preview: PASS，Workbench integration contract 覆盖 current sample、runtime provider 与 contract-error 行为边界。
- StoryGraph: PASS，provider 为 compiler-project，异常 payload 不被 draft graph 静默掩盖。
- Localization: PASS，hosted presenter 空态保持 hosted 语义，不混入 draft rows。
- Outline: PASS，LanguageServer malformed symbols 暴露 error，只有请求失败才允许 draft outline。

Session status checks:
- dev-host mode: PASS，project-session status 明确 dev-host/session/workspace request 摘要。
- language mode: PASS，默认 process-per-request；stdio spike 只声明 diagnostics/documentSymbols，并列出 fallback endpoints。
- bounded cache summary: PASS，runtime、line-map、localization 只暴露有界 cache 摘要。
- no content leakage: PASS，contract 覆盖无正文、CSV、line-map、Runtime snapshot、secret/cache entry 泄露。

Docs updated:
- docs/todo.md: 已标记 P0 current-stage readiness 收口完成，并把 desktop backend v0 / P1.5 long-lived LanguageServer 留作后续。
- docs/agent-handoff.md: 已补 P0 收口快照和下一步边界。
- backend migration map: 已同步 language-session status 与 P0/v0 边界。
- README: 已同步 fallback catalog、Summary normal path 与 session status 口径。

Known residual risk:
- 当前完成的是 P0 current-stage readiness，不包含 Electron、embedded EditorBackend、DocumentBufferStore、autosave/recovery、默认 full long-lived LanguageServer、跨重启 restore 或多窗口 ownership。
```

```text
P0 current-stage readiness: PASS
P1 entry allowed: YES
Blocking reason if NO:
```

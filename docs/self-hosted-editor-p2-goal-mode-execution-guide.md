# SelfHostedEditor P2 Goal 模式执行指南

日期：2026-06-17
状态：给执行者使用的 P2 开发指令文档
适用范围：SelfHostedEditor P2 稳定身份与本地化 review 主线

## 0. Goal 模式启动指令

请在 goal 模式中创建并持续推进以下目标：

> 在 18 轮会话内完成 SelfHostedEditor P2：稳定身份迁移、localization review/productization、stable node map review/apply 的可审计闭环；完成代码、文档、回归验证，并给出是否允许进入 P2.5 的验收结论。

执行约束：

- 总轮数上限：18 轮。
- 主线开发轮：第 1-14 轮。
- 缓冲收口轮：第 15-18 轮，只用于补缺陷、补测试、补文档、修回归。
- 不允许把 P2.5 / P3 内容塞进 P2。
- 不允许在未完成最终验证前把 goal 标记为 complete。
- 如果同一阻塞条件连续 3 轮仍无法推进，标记 goal 为 blocked，并写明阻塞点、已尝试动作、需要的人类决策。

每轮回复必须包含：

- 本轮目标。
- 本轮已完成。
- Debug 自检结果。
- 架构自检结果。
- 已运行验证命令与结果。
- 下一轮目标。
- 是否消耗缓冲轮。

## 1. 必读上下文

每次接手前先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `src/ExternalSupport/SelfHostedEditor/README.md`
4. `docs/self-hosted-editor-p1-5-12-round-execution-guide.md`
5. `docs/stable-node-id-contract.md`
6. `docs/localization-diff-alignment-contract.md`
7. `docs/hash-localization.md`
8. `docs/l10n-extraction.md`

代码侧优先阅读：

- `src/Internal/Tooling`
- `src/Internal/LanguageServer`
- `src/ExternalSupport/SelfHostedEditor`
- `src/ExternalSupport/VSCode`
- `tests/Internal/Inscape.Tests`

## 2. P2 范围

P2 要完成：

- 继续打磨 localization candidate scoring 与 review display。
- 相似文本只能作为人工 review candidate，不允许静默复用或自动覆盖。
- 强化 line identity 迁移契约：line id、fingerprint、局部上下文、rank penalty、diff detail 必须可审计。
- 产品化 stable node map review/apply：人工确认、冲突报告、dry-run/apply、备份/恢复路径清晰。
- 可以评估 batch review / multi-apply，但只能做小闭环，且必须可审计、可撤回、可 dry-run。
- 保持 localization CSV 与 host config CSV 的 UI model 分离。
- SelfHostedEditor 和 VSCode 共享 Internal/Tooling 语义，不复制 scoring / migration 语义。

P2 不做：

- P2.5 Host Schema / Host Bridge / Unity-Bird 适配。
- P3 第二语法 / runtime / extension 设计。
- RuntimeSession 长驻语义进程重构。
- sidecar bridge。
- 多窗口共享 LanguageServer。
- 通用表格编辑器。
- 静默自动翻译复用。
- 在 CLI / VSCode / SelfHostedEditor 中重新实现 compiler/parser 语义。

## 3. 每轮固定自检

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

如果本轮涉及既有文档或契约，先重新 grep 当前口径，避免基于旧状态开发。

每轮结束必须做 Debug 自检：

- 用最小 fixture 复现本轮触达的行为。
- 如果有 HTTP bridge，先跑 direct/in-process 检查，再跑 HTTP smoke。
- 如果有 UI 行为，确认 UI 消费 presenter/contract，不在浏览器端重新推导语义。
- 如果有 apply/update 行为，确认 dry-run 与 apply 输出差异清楚，备份路径真实存在。
- 如果失败，先定位 payload/log/fixture，不靠改测试绕过问题。

每轮结束必须做架构自检：

- Compiler 仍是语法和语义真源。
- Internal/Tooling 仍是 review/report/presenter 语义真源。
- SelfHostedEditor 只做 host UI、bridge adapter、状态展示和用户确认。
- VSCode 只做 editor integration，不复制 SelfHostedEditor 专属逻辑。
- localization CSV 与 host config CSV 仍是两个独立 UI model。
- 没有把 P2.5 Host Schema / Host Bridge 内容提前实现。
- 没有把 P3 runtime / syntax / extension idea 提前实现。

每轮结束至少运行与本轮相关的最小命令；如果本轮改了共享契约、bridge 或 presenter，必须补跑相关 HTTP smoke。

## 4. 轮次安排

### 第 1 轮：P2 基线审计

目标：

- 建立 P2 当前状态清单。
- 确认已有 stable node、line map、localization review/update、SelfHostedEditor/VSCode parity 的测试入口。
- 不做功能代码改动，最多补审计记录。

建议验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
```

产出：

- P2 差距清单。
- 本阶段不进入 P2.5/P3 的边界确认。

### 第 2 轮：Localization Scoring 契约审计

目标：

- 审计 candidate scoring、rank reason、similarity、manual candidate 的当前实现。
- 确认相似文本不会静默复用。
- 缺失测试时先补 Internal/Tooling 层测试。

架构重点：

- scoring 逻辑必须留在 Internal/Tooling。
- UI 只能显示 score/reason/diff，不能自行计算候选排序。

### 第 3 轮：Line Identity 信号加固

目标：

- 强化 line id、fingerprint、局部上下文、rank penalty、diff detail 的契约。
- 对迁移候选给出可审计 reason。
- 覆盖 ambiguous / low confidence / context mismatch 场景。

建议验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

### 第 4 轮：Review Presenter 形状收敛

目标：

- 让 localization review presenter 能稳定表达候选、diff、rank、identity、risk/warning。
- 精简 bridge payload，但不得丢失 UI 审计所需字段。
- 对 VSCode 与 SelfHostedEditor 共用的 contract 做 parity 检查。

建议验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

### 第 5 轮：SelfHostedEditor Localization Review UI

目标：

- 产品化 review display：候选差异、rank reason、line identity、conflict/risk 状态要能被用户读懂。
- 只做必要 UI，不做营销页或说明页。
- 保持工作台密度和操作效率。

Debug 自检：

- 人工检查至少一个 clear match、一个 similar candidate、一个 ambiguous candidate。
- 确认没有按钮文字溢出、列表错位、状态互相覆盖。

### 第 6 轮：Stable Node Map 当前链路审计

目标：

- 审计 stable node map review/apply 的 dry-run、apply、冲突报告、备份/恢复路径。
- 列出现有缺口。

建议验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
```

### 第 7 轮：Stable Node Map Contract 加固

目标：

- 强化 conflict report、dry-run/apply result、backup metadata、recovery hint。
- apply 前必须能明确展示将要修改什么。
- apply 后必须能追溯备份和结果。

架构重点：

- contract/presenter 语义放 Internal/Tooling 或共享边界。
- host 端不自行推断 conflict 语义。

### 第 8 轮：Stable Node Map UI 闭环

目标：

- 在 SelfHostedEditor 中完成 stable node map review/apply 的人工确认闭环。
- 支持 dry-run 预览、apply 确认、结果报告、恢复提示。
- 错误状态要可读，不吞异常。

Debug 自检：

- dry-run 不产生写入。
- apply 写入后有备份。
- conflict 时不能误显示成功。

### 第 9 轮：VSCode Parity 与共享边界

目标：

- 确认 VSCode 与 SelfHostedEditor 对 P2 语义的消费一致。
- 如果 VSCode 不暴露某个 UI，也必须确认它不会持有过期 contract 或复制旧语义。

建议验证：

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

### 第 10 轮：Batch Review / Multi-Apply 决策

目标：

- 明确是否在 P2 做 batch review / multi-apply。
- 如果不做，写入 docs/todo.md 和 handoff 的 open question，不留半成品入口。
- 如果做，只允许 selected candidates 的小闭环，必须 dry-run、可审计、可撤回。

禁止：

- 一键全量静默 apply。
- 无备份批量写入。
- 用 UI 端自己重排 candidate。

### 第 11 轮：Localization Update Safety

目标：

- 确认 localization CSV update 只通过受控 contract 执行。
- 加强 backup/recovery/error report。
- 确认 localization CSV 与 host config CSV 的 UI model 没有混用。

建议验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

### 第 12 轮：工作台集成 Smoke

目标：

- 串起 SelfHostedEditor 中 localization review、line map、node map、apply/update 的真实工作流。
- 修 UI 状态、loading、error、empty state、success report 的断点。

建议验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
```

### 第 13 轮：文档与 ADR 收口

目标：

- 更新 `docs/agent-handoff.md`、`docs/todo.md`、SelfHostedEditor README。
- 如果 P2 引入长期 contract 或产品决策，补 ADR 或更新既有 contract 文档。
- 明确 P2.5 的入口条件。

必须清理：

- 旧状态描述。
- “待确认但其实已完成”的 TODO。
- 与实际命令不一致的验证入口。

### 第 14 轮：P2 全量验证与首轮修复

目标：

- 跑完整 P2 验证矩阵。
- 修复失败项。
- 给出 PASS/FAIL 初判。

建议完整验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

### 第 15-18 轮：缓冲收口

只能用于：

- 修第 14 轮失败项。
- 补遗漏测试。
- 补文档同步。
- 补 UI smoke。
- 做最终验收报告。

不能用于：

- 新开 P2.5 功能。
- 新开 P3 设计。
- 扩大 batch apply 范围。
- 重构与 P2 无关的模块。

## 5. 最终验收标准

P2 PASS 必须同时满足：

- localization review 能展示 candidate score/reason/diff/identity 风险。
- 相似文本只作为人工候选，不静默复用。
- line identity 迁移 contract 覆盖 line id、fingerprint、局部上下文、rank penalty、diff detail。
- stable node map review/apply 完成人工确认、冲突报告、dry-run/apply、备份/恢复闭环。
- batch review / multi-apply 若存在，必须可审计、可 dry-run、可撤回；若不存在，文档说明留到后续。
- localization CSV 与 host config CSV UI model 保持分离。
- SelfHostedEditor 与 VSCode 不复制 Internal/Tooling 语义。
- P2.5/P3 没有被提前实现。
- 所有相关验证命令通过。
- `docs/agent-handoff.md`、`docs/todo.md`、SelfHostedEditor README 与实际状态一致。

最终报告格式：

```text
P2 stable identity / localization review: PASS | FAIL
P2.5 entry allowed: YES | NO

Completed:
- ...

Validation:
- command: PASS/FAIL

Remaining risks:
- ...

Next phase:
- P2.5 Host Schema / Host Bridge / Unity-Bird adaptation, only if P2 PASS.
```

## 6. 给执行者的边界提醒

- 不要为了让 UI 好看而把 scoring、diff、migration 语义搬进浏览器。
- 不要把 localization review 做成通用 CSV/table editor。
- 不要把 similar candidate 当成 confirmed translation。
- 不要在没有 dry-run、backup、conflict report 的情况下写入文件。
- 不要把 P2.5 的 Host Schema / Host Bridge 当作 P2 的补充任务。
- 每轮都要 debug，也要检验架构。P2 的风险不只在 bug，更在语义边界漂移。

# SelfHostedEditor P1.5 文档收口方案

状态：待执行

日期：2026-06-17

## 背景

P1.5 功能 / 技术验收已通过：

- packaged app 已随包携带 `resources/language-server/Inscape.LanguageServer.exe`。
- `check:electron-language-artifact` 已通过。
- `check:electron-language-fallback` 已通过。
- `smoke:desktop-package-language` 已通过，确认 packaged app 真实 long-lived LanguageServer authoring path 可用。
- VSCode parity、SelfHostedEditor HTTP 回归、`.NET build`、Internal tests、`npm audit` 已通过。

但文档仍有旧口径残留，因此 P1.5 交接还需要一次短收口。

## 目标

把文档状态统一为：

```text
P1.5 long-lived LanguageServer: PASS
P2 stable identity / localization review entry allowed: YES
```

本轮只做文档同步，不改功能代码，不进入 P2 研发。

## 已知旧口径

需要检查并更新：

1. `src/ExternalSupport/SelfHostedEditor/README.md`
   - 旧口径：packaged builds do not yet bundle the LanguageServer artifact。
   - 新口径：packaged builds bundle `Inscape.LanguageServer` under `resources/language-server`，packaged language smoke 已覆盖真实 long-lived path。

2. `docs/self-hosted-editor-p1-40-round-execution-plan.md`
   - 旧口径：packaged app 内置 LanguageServer artifact 与 `process-per-request` 降级仍待后续容灾增强。
   - 新口径：P1.5 artifact / packaged language smoke / fallback 已完成；后续若继续增强，只能作为 hardening，不是 P1.5 阻塞。

3. `docs/agent-handoff.md`
   - 确认是否需要追加 2026-06-17 P1.5 completion 快照。
   - 如果已有新口径，只保留一致表述即可。

4. `docs/todo.md`
   - 已有较新的 P1.5 完成口径，但需要确认没有残留互相矛盾的待办项。

## 执行步骤

### Step 1：定位旧口径

```powershell
rg "Packaged builds do not yet bundle|packaged app 内置 LanguageServer artifact.*仍待|P1\\.5 has started|P1\\.5.*待|process-per-request 降级仍待|LanguageServer artifact" `
  src\ExternalSupport\SelfHostedEditor\README.md `
  docs\self-hosted-editor-p1-40-round-execution-plan.md `
  docs\agent-handoff.md `
  docs\todo.md
```

### Step 2：同步 README

在 `src/ExternalSupport/SelfHostedEditor/README.md` 中把 P1.5 段落改为完成态：

- desktop app 默认使用 main-process workspace-scoped long-lived `Inscape.LanguageServer --stdio` session。
- packaged app 会从随包 `resources/language-server` 解析 LanguageServer artifact。
- packaged language smoke 覆盖 diagnostics、completions、definition、references、hover、documentSymbols。
- fallback / health / restart / documentRevisionLag 已有 contract 覆盖。
- 不暗示 P2 已开始。

### Step 3：同步 P1 执行计划

在 `docs/self-hosted-editor-p1-40-round-execution-plan.md` 中更新 `P1.5 I` / post-40 记录：

- 标记 artifact bundling、resolver、fallback、packaged language smoke 已完成。
- 保留 P1.5 不包括 P2 的边界。
- 如果写 residual risk，只写非阻塞增强，例如进一步改善错误文案、扩展 CI 覆盖、真实用户长时间运行观察。

### Step 4：同步 handoff / TODO

确认 `docs/agent-handoff.md` 和 `docs/todo.md` 都表达：

- P1 desktop backend v0 已完成。
- P1.5 long-lived LanguageServer 已完成。
- 下一 phase 是 P2 stable identity / localization review 主线。
- 不进入 RuntimeSession long-lived、sidecar daemon、多窗口共享或 VSCode 复用 embedded backend。

### Step 5：复查无旧口径

```powershell
rg "Packaged builds do not yet bundle|packaged app 内置 LanguageServer artifact.*仍待|P1\\.5 has started|P1\\.5.*待|process-per-request 降级仍待" `
  src\ExternalSupport\SelfHostedEditor\README.md `
  docs\self-hosted-editor-p1-40-round-execution-plan.md `
  docs\agent-handoff.md `
  docs\todo.md
```

期望：无命中，或只剩历史执行记录中明确标注“旧状态 / 已被 2026-06-17 收口取代”的文字。

### Step 6：验证

本轮是文档收口，至少跑：

```powershell
git -c safe.directory=D:/LabProjects/Inscape diff --check
git -c safe.directory=D:/LabProjects/Inscape diff --stat
```

如果执行者顺手触碰了代码或 package 配置，则必须补跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

## 完成标准

本轮完成时应满足：

1. README、P1 执行计划、handoff、TODO 对 P1.5 的状态一致。
2. 不再出现 “packaged app 未 bundle LanguageServer artifact” 的当前态表述。
3. 不再把 `process-per-request` fallback 写成 P1.5 阻塞项。
4. 明确下一 phase 是 P2：稳定身份与本地化 review 主线。
5. 没有功能代码改动，或若有则已跑对应验证。
6. `git diff --check` 通过。

## 交接结论格式

完成后用：

```text
P1.5 document sync: PASS / FAIL
P2 entry allowed: YES / NO
Blocking reason if NO:
```

若 PASS，下一轮即可执行 P2。

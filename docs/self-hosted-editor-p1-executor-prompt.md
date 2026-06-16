# SelfHostedEditor P1 Executor Prompt

用途：把本段内容直接交给下一轮执行者，用于从已验收通过的 P0 进入 SelfHostedEditor Phase 1 / P1。

```text
目标：从已验收通过的 P0 进入 SelfHostedEditor Phase 1 / P1，推进 desktop backend v0。

上下文：
- 工作区：D:\LabProjects\Inscape
- P0 current-stage readiness 已完成并验收通过。
- P1 目标没有改口径：实现 Electron + embedded EditorBackend v0，不做 sidecar daemon，不做多窗口共享，不做正式单文件模式，不默认启用 full long-lived LanguageServer；P1.5 才是 workspace-scoped long-lived LanguageServer。
- 当前有两个 P1 细化文档可能还是 untracked，请务必读取并按它们执行：
  - docs/self-hosted-editor-p1-40-round-execution-plan.md
  - docs/self-hosted-editor-p1-self-check.md

开始前请读取：
1. docs/agent-handoff.md
2. docs/todo.md
3. docs/self-hosted-editor-p1-40-round-execution-plan.md
4. docs/self-hosted-editor-p1-self-check.md
5. docs/self-hosted-editor-desktop-backend-v0-plan.md
6. docs/adr/0019-self-hosted-editor-embedded-backend-v0.md
7. docs/adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md
8. src/ExternalSupport/SelfHostedEditor/README.md

执行要求：
- 以 docs/self-hosted-editor-p1-40-round-execution-plan.md 为主线推进。
- 以 docs/self-hosted-editor-p1-self-check.md 作为验收清单。
- 不要回滚或覆盖现有未提交 / untracked 文档；如果要改同一文件，先看 diff。
- 不要把 Compiler / LanguageServer / Tooling / Runtime 语义复制进 EditorBackend。
- 不要让 renderer 直接访问 Node、fs、child_process、shell 或 arbitrary IPC。
- 不要把 dev-host /api/* 当成最终产品 API。
- 不要进入 P1.5 long-lived LanguageServer 默认启用。

建议本轮优先完成 P1 A 段 Round 1-6：
1. P1 基线审计
2. 定义 embedded backend v0 model contract
3. 抽出 EditorBackendTransport
4. 定义业务窄接口 adapter
5. fake embedded transport harness
6. structure guard 第一刀

如果时间不足，至少完成一个可验证的小闭环，不要只写计划。修改后同步必要文档。

开始先跑基线：
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build

完成本轮后至少汇报：
- 完成了 P1 哪些 Round
- 改动文件
- 跑过哪些验证命令及结果
- 是否仍可继续进入下一组 Round
- 是否有任何 P1/P1.5 边界风险
```

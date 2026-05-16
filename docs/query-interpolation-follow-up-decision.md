# Query Interpolation Follow-up Decision

状态：草案，F1.13 后续路线决策

最后更新：2026-05-16

本文承接 [Query Interpolation Tooling Decision](query-interpolation-tooling-decision.md)。F1.11 / F1.12 已经在 VSCode 侧完成 `[]` 简单路径查询插值的第一版 authoring hint：读取 Host Schema 零参数简单 query，提供 completion / Hover，未知 query 只提示，不改变 Compiler、预览或本地化语义。

## 结论

F1.13 的结论是：

```text
Do not migrate query interpolation into LanguageServer immediately.
Do not add Compiler diagnostics for unknown queries.
Keep VSCode prototype as the feedback surface.
Next candidate is a separate workspace audit, not default Problems.
```

也就是说，当前 `[]` 查询插值应继续停留在 VSCode authoring hint 层。LanguageServer 可以在后续接手同一数据契约，但不应在作者反馈不足、Host Schema / Host Bridge 查询实现尚未闭环时提前成为新的语义入口。

## 为什么暂不迁 LanguageServer

当前 LanguageServer 基线已经覆盖 Compiler-backed diagnostics、definition、references 和 node completion。这些能力的共同点是：它们直接来自 `Inscape.Compiler` 的图、source span 或 diagnostic 输出。

`[]` 查询插值不同：

- 它读取 Host Schema，而 Host Schema 是宿主能力清单，不是 Compiler 语义真相。
- 它现在只做作者提示，不产生默认 Problems 诊断。
- 它还没有 Runtime Host fallback、异步查询策略、Host Bridge 查询实现、workspace audit 输出格式等稳定下游。
- 旧 `[kind: alias]` inline host binding 仍作为兼容事实存在，过早迁移到 LanguageServer 容易把 authoring hint 误读成正式语言语义。

因此 LanguageServer 暂时只应记录未来接手边界，而不是立即实现 query interpolation provider。

## 什么时候适合迁 LanguageServer

满足以下条件后，再把 query interpolation 从 VSCode 原型迁入 LanguageServer：

- Host Schema query 读取已成为 Tooling 或 LanguageServer 可复用的窄职责模块，而不是复制 VSCode 的 JSON / config 读取逻辑。
- VSCode 原型的 completion / Hover 文案和范围识别经过实际写作验证，不再频繁变化。
- Workspace audit 或类似命令已经明确未知 query 的报告格式、严重级别和忽略策略。
- Host Bridge 查询实现的映射字段足够稳定，能说明 query name 如何映射到宿主实现，但不会把宿主内部 API 暴露给 `.inscape`。
- LanguageServer 有正式 LSP transport 或至少有清晰的临时 probe 命令，能验证 Hover / completion 输出而不是只改模型。

迁移时必须复用 [Query Interpolation Data Contract](query-interpolation-data-contract.md) 中的 `query-interpolation` 对象形态，避免 VSCode 和 LanguageServer 各自发明字段。

## Workspace Audit 候选边界

如果继续推进，应优先考虑一个显式 workspace audit，而不是默认实时诊断。第一版 audit 可以只做：

- 扫描 `.inscape` 正文里的简单 `[query.path]`。
- 排除 legacy `[kind: alias]`。
- 读取当前项目 `inscape.config.json` 的 `hostSchema`。
- 报告 Host Schema 未声明的 query。
- 报告 Host Schema 中不适合文本插值的 query，例如有参数的 query。
- 输出 info / warning 级报告，不阻止 `compile-project`、`diagnose-project`、本地化提取或预览。

第一版 audit 不做：

- 不执行 query。
- 不解析函数、算术或条件表达式。
- 不检查 Runtime Host 是否真的实现 query。
- 不把 unknown query 升级为 Compiler diagnostic。
- 不为 legacy `[timeline: alias]` 生成 query 报告。

## 推荐后续拆分

后续可以拆成这些小节点：

1. F1.14：设计 query interpolation workspace audit 输出格式和命令入口，先文档化，不实现。
2. F1.15：把 Host Schema query 读取从 VSCode provider 中抽象为可迁移的数据契约说明，评估落在 Tooling 还是 LanguageServer。
3. F1.16：如确有需要，再实现 workspace audit 最小命令或 VSCode 命令，不接默认 Problems。
4. F1.17：等 audit 稳定后，再评估 LanguageServer completion / Hover 接手。

## 自检结论

- 本文没有新增 Compiler 语义，也没有把 Host Schema 升级为编译依赖。
- 本文没有要求 VSCode 默认新增 Problems 诊断。
- LanguageServer 仍以 Compiler-backed 能力为主，不提前复制 VSCode authoring hint。
- Workspace audit 被明确为显式、可选、非阻断的后续节点。
- legacy `[kind: alias]` 继续与新 `[]` query interpolation 分开处理。

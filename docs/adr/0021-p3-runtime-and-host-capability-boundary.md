# ADR 0021：P3 Runtime 与宿主能力边界

状态：Accepted

日期：2026-06-18

## 背景

P2.5 已完成 Host Schema / Host Bridge 与 Unity-Bird 适配收口，P3 可以作为第二版语法 / Runtime / 扩展能力的新阶段进入。P3 讨论涉及条件表达式、宿主查询、`@` 动作、Runtime state、Rollback、Trace Replay、Timeline 控制权和宿主存档关系。

这些决定会长期影响 Inscape 语言、Runtime、编辑器和宿主接入边界，不能只留在 TODO 或会话记录中。

## 决策

1. `[]` 只读，不允许副作用；`@` 表达动作 / 事件 / 控制权交接。
2. Host Schema 是统一宿主能力清单，包含 `queries[]` 与 `actions[]` 两部分；Action Schema 不是独立系统，而是 Host Schema 的动作部分。
3. Query Schema 第一版最小字段为 `name`、`parameters`、`returnType`，可选 `idKind` 与 `description`。
4. Action Schema 第一版最小字段为 `name`、`parameters`、`mode`，可选 `idKind` 与 `description`；`mode` 取值为 `fire`、`wait`、`handoff`。
5. 第一版不把 `rollbackPolicy`、`replayPolicy`、`receiptPolicy`、`failurePolicy`、`timeoutPolicy` 塞进 Host Schema。
6. 正式运行的查询主路是 delegate query；mock / recorded values 服务编辑器预览、测试、CI 和调试复现；snapshot 不作为每帧同步主链路。
7. Inscape 可以拥有内部叙事运行事实，例如 visited / seen / last_choice / Log / rollback stack；背包、任务、好感度、战斗结果、NPC 生死、玩家位置、经济数值等业务玩法状态默认由宿主管。
8. 接入宿主项目时，宿主存档是正式游戏存档权威；Inscape state 是宿主存档中的子状态 blob。纯 Inscape 游戏和编辑器 Preview 可例外。
9. 普通存档、Log / Backlog、Rollback、Trace Replay、Flashback Playback 必须拆开命名和设计。
10. P3 第一刀只设计并验证 Runtime State 最小 shape，不实现完整正式 Save / Load、完整 Rollback、完整 Trace Replay 或 Flashback Playback。
11. Timeline / Inscape / 玩法系统遵循“同一段情节只有一个导演”：对话段可由 Inscape 驱动 Timeline，电影化演出段可由 Timeline 驱动 Inscape，玩法段可由宿主 `handoff` 后恢复剧情。
12. 异步 action 失败、取消或超时统一作为宿主异常上报；Inscape 不把这些错误设计成第一版剧情分支语义。
13. `.inscape` 脚本可生成机器可读 Usage / Requirement Manifest，用于 audit、CI、Bridge TODO 和编辑器提示，但不能反向成为权威 Host Schema。
14. 条件表达式第一版支持 `and`、`or`、`not`、括号、标量比较、字符串、数字和 bool；不支持数组、列表或复杂表达式。
15. 条件语法第一刀优先选项条件与条件跳转，行级条件和节点入口条件后置。

## 原因

- `[]` 与 `@` 分工清楚，可以保护存档、Rollback、调试、文本提取和本地化稳定性。
- Host Schema 由宿主生成或维护，才能表达真实返回类型、副作用、模式和宿主能力；脚本 Usage 只能说明“用了什么”，不能证明宿主能提供。
- delegate query 保持宿主为玩法状态权威，避免每帧 snapshot 制造两份真相。
- Action policy、Replay、Rollback、Flashback 都是低优先级或高复杂度能力，不应让第一版 Schema 提前膨胀。
- 宿主存档权威符合游戏项目现实：Unity / 宿主拥有世界、实体、背包、任务、战斗和资源系统，Inscape 只应导出可嵌入的叙事状态。
- Timeline、剧情和玩法系统都可能成为主控者；用 `fire` / `wait` / `handoff` 表达控制权交接，比固定“永远谁驱动谁”更适合不同项目。

## 影响

- P3 执行者应先补 Host Schema `queries[]` / `actions[]` 草案、Usage Manifest、条件语法和 Runtime State 最小模型，而不是直接实现完整 Runtime 功能。
- Compiler 仍不读取 Host Schema / Host Bridge，不依赖 Unity、Bird 或项目内部 ID。
- 编辑器、Tooling、LanguageServer 可以消费 Host Schema 和 Usage / audit 输出做提示与报告，但不得把宿主配置变成 Compiler 真相。
- Rollback 第一版遇到改变宿主状态的 `@action` 默认作为 barrier；Trace Replay 不真实重放 action。
- 异步 action 错误由宿主处理；Inscape 只暴露清晰错误。

## 延后问题

- `events[]` 到 `actions[]` 的兼容 / 迁移策略。
- `inspect-usage-project` 与 `audit-host-integration-project` 的具体 JSON shape 已在 P3 Round 4-6 给出最小实现；P3 Round 12 已用最小端到端 smoke 证明 Usage、Audit、条件语法与 Runtime State 可以串接。
- 条件语法 contract / parser design 已在 P3 Round 7 收口到 [Condition Syntax Contract](../condition-syntax-contract.md)；Compiler parser / IR 最小实现已在 P3 Round 8 完成，Tooling / LanguageServer / Editor consumption 已在 P3 Round 9 完成，Runtime query provider / internal facts 最小 contract 已在 P3 Round 10 完成，Runtime State 最小 model / validate shape 已在 P3 Round 11 完成，最小 integration smoke 已在 P3 Round 12 完成。后续仍需实现 query receipt、条件 Runtime 求值和 action dispatcher。
- Runtime State 自动迁移与正式 Save / Load 产品系统。
- 受限用户自定义叙事局部变量。
- Action rollback / replay / receipt 精细 policy。
- Flashback Playback、完整 Trace Replay、时空穿越式特殊倒放。
- Presentation IR。

## 验证

P3 应至少通过以下方式验证本 ADR：

- Host Schema 文档和 JSON Schema 能表达 `queries[]` / `actions[]` 最小字段。
- Usage Manifest 能从脚本中输出 query / action usage、source location 和 required ids。
- Host integration audit 能对账 Usage、Host Schema 与 Host Bridge。
- 条件表达式 IR / 诊断不复制进 VSCode 或 SelfHostedEditor。
- Runtime State 最小 model / smoke 能输出 `ExportState` shape，并能做 `ValidateStateAgainstCurrentScript` 的 compatible / migratable / incompatible 判断。
- 最小端到端 smoke 能证明条件 IR、Usage、Audit 与 Runtime State export / validate 共同工作。
- `git diff --check`、`.NET build`、Internal tests、VSCode structure / semantic parity 和 SelfHostedEditor structure / model / semantic parity 保持通过。

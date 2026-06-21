# 文档索引

本目录是 Inscape 的项目知识库。当前目标不是一次性写出最终规格，而是建立一个能持续收敛的文档体系：已经确定的内容进入基线文档，仍在探索的内容进入草案和待确认清单，已经做出的项目级选择进入 ADR。

## 快速入口

- 接手项目或恢复上下文：先读 [Agent 接手指南](agent-handoff.md)，再读 [TODO](todo.md)。
- 查长期决策：读 [ADR](adr/README.md)，不要只看当前实现推断设计意图。
- 查当前实现边界：读 [代码结构规划](code-structure.md)、[编码与命名规范](coding-conventions.md) 和 [渐进式重构计划](refactoring-plan.md)，再进入对应源码目录。
- 查未定事项：读 [待确认问题](open-questions.md)，避免把草案当成规范。
- 查 P3 第二版语法 / Runtime 讨论脉络：读 [P3 Runtime / Language Discussion Memory](p3-runtime-language-discussion-memory.md)，再读对应正式 contract 文档。
- 执行 P3 goal：读 [P3 第二版语法 / Runtime / 宿主能力 Goal 模式执行指南](self-hosted-editor-p3-goal-mode-execution-guide.md)，并从 [P3 Baseline Audit](self-hosted-editor-p3-baseline-audit.md)、[P3 Host Schema v2 Contract Audit](self-hosted-editor-p3-host-schema-v2-contract-audit.md)、[P3 Host Schema Compatibility Audit](self-hosted-editor-p3-host-schema-compatibility-audit.md)、[P3 Usage Manifest Contract Audit](self-hosted-editor-p3-usage-manifest-contract-audit.md)、[P3 Usage Manifest Implementation Audit](self-hosted-editor-p3-usage-manifest-implementation-audit.md)、[P3 Host Integration Audit](self-hosted-editor-p3-host-integration-audit.md)、[P3 Condition Syntax Contract Audit](self-hosted-editor-p3-condition-syntax-contract-audit.md)、[P3 Condition Syntax Implementation Audit](self-hosted-editor-p3-condition-syntax-implementation-audit.md)、[P3 Condition Consumption Audit](self-hosted-editor-p3-condition-consumption-audit.md)、[P3 Runtime Query Provider Audit](self-hosted-editor-p3-runtime-query-provider-audit.md)、[P3 Runtime State Audit](self-hosted-editor-p3-runtime-state-audit.md)、[P3 Integration Audit](self-hosted-editor-p3-integration-audit.md) 与 [P3 Final Validation Report](self-hosted-editor-p3-final-validation-report.md) 接上当前实现状态。
- 执行 P4 goal：读 [P4 Runtime Playable MVP Goal 模式执行指南](self-hosted-editor-p4-goal-mode-execution-guide.md)，再读 [P4 Final Validation Report](self-hosted-editor-p4-final-validation-report.md)，从 P3 final validation 接上 Runtime playable MVP，不要把 P4 扩成编辑器产品化、Rollback / Trace / Flashback、Presentation IR 或 Unity / Host SDK。
- 执行 P5 goal：读 [P5 SelfHostedEditor Runtime Authoring Goal 模式执行指南](self-hosted-editor-p5-goal-mode-execution-guide.md)，再读 [P5 Baseline Audit](self-hosted-editor-p5-baseline-audit.md)、[P5 Runtime Authoring Contract](self-hosted-editor-p5-runtime-authoring-contract.md)、[P5 Runtime Session Audit](self-hosted-editor-p5-runtime-session-audit.md)、[P5 Mock Query Model Audit](self-hosted-editor-p5-mock-query-model-audit.md) 与 [P5 Mock Query UI Audit](self-hosted-editor-p5-mock-query-ui-audit.md)，从 P4 final validation 接上 SelfHostedEditor Runtime authoring / productization；每轮必须 Debug 自检、架构自检、验证通过后提交推送，再进入下一轮。
- P5 Runtime authoring / productization 已完成 final validation：读 [P5 Final Validation Report](self-hosted-editor-p5-final-validation-report.md)、[P5 Final Validation / PASS-FAIL Goal 模式执行指南](self-hosted-editor-p5-final-validation-goal-mode-execution-guide.md) 和 [P5 Integration Audit](self-hosted-editor-p5-integration-audit.md)。下一候选方向必须由用户批准，不能自动进入 Unity / Host SDK、Rollback / Trace Replay / Flashback、Presentation IR 或完整 host save。
- Post-P5 下一方向决策已完成：读 [Post-P5 Next Direction Decision Brief](post-p5-next-direction-decision-brief.md) 和 [Post-P5 Next Direction Decision Goal 模式执行指南](post-p5-next-direction-decision-goal-mode-execution-guide.md)。2026-06-21 已批准其推荐方向的具体化版本：`Host Integration Partner Readiness`，但范围仅限 contract / fixture / report / planning。
- 执行 Host Integration Partner Readiness goal：读 [Host Integration Partner Readiness Goal 模式执行指南](host-integration-partner-readiness-goal-mode-execution-guide.md)、[Host Integration Package Contract](host-integration-package-contract.md)、[Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md)、[Source Location External Contract](source-location-external-contract.md)、[Localization Anchor Export Contract](localization-anchor-export-contract.md)、[Host Bridge Candidate Contract](host-bridge-candidate-contract.md)、[Host Integration Partner Readiness Fixtures](host-integration-partner-readiness-fixtures.md)、[Sinan Cooperation Notes](sinan-cooperation/README.md)、[Host Integration Partner Readiness 决策简报](sinan-cooperation/host-integration-partner-readiness-decision-brief-2026-06-21.md) 和 [商务反馈口径](sinan-cooperation/host-integration-partner-readiness-business-response-2026-06-21.md)。总预算 6 轮，每轮必须 Debug 自检、架构自检、验证通过后提交推送；Sinan 只能作为 partner profile / fixture，不得成为 core dependency。

## 阅读路径

新成员建议按以下顺序阅读：

1. [Agent 接手指南](agent-handoff.md)
2. [项目立项说明](project-brief.md)
3. [架构草案](architecture.md)
4. [代码结构规划](code-structure.md)
5. [编码与命名规范](coding-conventions.md)
6. [渐进式重构计划](refactoring-plan.md)
7. [DSL 生态定位对比](dsl-ecosystem-positioning.md)
8. [语法样例对比](syntax-comparison.md)
9. [DSL 语言设计草案](dsl-language.md)
10. [Inscape 语法说明](dsl-syntax-guide.md)
11. [VSCode 轻工具链](vscode-tooling.md)
12. [CLI 命令速查](cli-command-reference.md)
13. [哈希锚点与本地化](hash-localization.md)
14. [本地化提取](l10n-extraction.md)
15. [编辑器设计草案](editor-design.md)
16. [运行时与 Unity 宿主](runtime-unity.md)
17. [宿主 Schema 草案](host-schema.md)
18. [Usage Manifest Contract](usage-manifest-contract.md)
19. [Condition Syntax Contract](condition-syntax-contract.md)
20. [P3 Runtime / Language Discussion Memory](p3-runtime-language-discussion-memory.md)
21. [P3 第二版语法 / Runtime / 宿主能力 Goal 模式执行指南](self-hosted-editor-p3-goal-mode-execution-guide.md)
22. [P3 Baseline Audit](self-hosted-editor-p3-baseline-audit.md)
23. [P3 Host Schema v2 Contract Audit](self-hosted-editor-p3-host-schema-v2-contract-audit.md)
24. [P3 Host Schema Compatibility Audit](self-hosted-editor-p3-host-schema-compatibility-audit.md)
25. [P3 Usage Manifest Contract Audit](self-hosted-editor-p3-usage-manifest-contract-audit.md)
26. [P3 Usage Manifest Implementation Audit](self-hosted-editor-p3-usage-manifest-implementation-audit.md)
27. [P3 Host Integration Audit](self-hosted-editor-p3-host-integration-audit.md)
28. [P3 Condition Syntax Contract Audit](self-hosted-editor-p3-condition-syntax-contract-audit.md)
29. [P3 Condition Syntax Implementation Audit](self-hosted-editor-p3-condition-syntax-implementation-audit.md)
30. [P3 Condition Consumption Audit](self-hosted-editor-p3-condition-consumption-audit.md)
31. [P3 Runtime Query Provider Audit](self-hosted-editor-p3-runtime-query-provider-audit.md)
32. [P3 Runtime State Audit](self-hosted-editor-p3-runtime-state-audit.md)
33. [P3 Integration Audit](self-hosted-editor-p3-integration-audit.md)
34. [P3 Final Validation Report](self-hosted-editor-p3-final-validation-report.md)
35. [P4 Runtime Playable MVP Goal 模式执行指南](self-hosted-editor-p4-goal-mode-execution-guide.md)
36. [P4 Baseline Audit](self-hosted-editor-p4-baseline-audit.md)
37. [Runtime Playable MVP Contract](runtime-playable-mvp-contract.md)
38. [P4 Condition Evaluator Audit](self-hosted-editor-p4-condition-evaluator-audit.md)
39. [P4 Runtime Flow Audit](self-hosted-editor-p4-runtime-flow-audit.md)
40. [P4 Final Validation Report](self-hosted-editor-p4-final-validation-report.md)
41. [P5 SelfHostedEditor Runtime Authoring Goal 模式执行指南](self-hosted-editor-p5-goal-mode-execution-guide.md)
42. [P5 Baseline Audit](self-hosted-editor-p5-baseline-audit.md)
43. [P5 Runtime Authoring Contract](self-hosted-editor-p5-runtime-authoring-contract.md)
44. [P5 Runtime Session Audit](self-hosted-editor-p5-runtime-session-audit.md)
45. [P5 Mock Query Model Audit](self-hosted-editor-p5-mock-query-model-audit.md)
46. [P5 Mock Query UI Audit](self-hosted-editor-p5-mock-query-ui-audit.md)
47. [Bird / Unity 调研记录](bird-unity-research.md)
48. [Bird Adapter 原型](bird-adapter.md)
49. [Unity Editor Importer 草案](unity-editor-importer.md)
50. [路线图](roadmap.md)
51. [TODO](todo.md)
52. [待确认问题](open-questions.md)

## 按任务检索

```text
任务类型             建议读取
接手/恢复上下文      agent-handoff.md, todo.md, roadmap.md
代码质量/重构        code-structure.md, coding-conventions.md, refactoring-plan.md, architecture.md, roadmap.md
DSL 定位/语法        dsl-ecosystem-positioning.md, dsl-syntax-guide.md, dsl-language.md, syntax-comparison.md, open-questions.md
VSCode 工具          vscode-tooling.md, src/ExternalSupport/VSCode/README.md
VSCode 目录命名审计  vscode-directory-naming-audit.md
模块资源脚本边界     module-resource-script-boundary-plan.md
CLI 命令速查         cli-command-reference.md, README.md
本地化               hash-localization.md, l10n-extraction.md, ADR 0006
宿主 Schema/查询事件 host-schema.md, usage-manifest-contract.md, condition-syntax-contract.md, host-query-event-registration-strategy.md, p3-runtime-language-discussion-memory.md, open-questions.md, todo.md
P3 Runtime/存档/回滚  p3-runtime-language-discussion-memory.md, runtime-unity.md, host-query-event-registration-strategy.md, open-questions.md, todo.md
P3 Goal 执行         self-hosted-editor-p3-goal-mode-execution-guide.md, self-hosted-editor-p3-baseline-audit.md, self-hosted-editor-p3-host-schema-v2-contract-audit.md, self-hosted-editor-p3-host-schema-compatibility-audit.md, self-hosted-editor-p3-usage-manifest-contract-audit.md, self-hosted-editor-p3-usage-manifest-implementation-audit.md, self-hosted-editor-p3-host-integration-audit.md, self-hosted-editor-p3-condition-syntax-contract-audit.md, self-hosted-editor-p3-condition-syntax-implementation-audit.md, self-hosted-editor-p3-condition-consumption-audit.md, self-hosted-editor-p3-runtime-query-provider-audit.md, self-hosted-editor-p3-runtime-state-audit.md, self-hosted-editor-p3-integration-audit.md, self-hosted-editor-p3-final-validation-report.md, condition-syntax-contract.md, p3-runtime-language-discussion-memory.md, ADR 0021, todo.md
P4 Runtime Goal 执行 self-hosted-editor-p4-goal-mode-execution-guide.md, self-hosted-editor-p4-baseline-audit.md, runtime-playable-mvp-contract.md, self-hosted-editor-p4-condition-evaluator-audit.md, self-hosted-editor-p4-runtime-flow-audit.md, self-hosted-editor-p3-final-validation-report.md, p3-runtime-language-discussion-memory.md, runtime-unity.md, condition-syntax-contract.md, usage-manifest-contract.md, host-schema.md, host-bridge-contract.md, ADR 0021, todo.md
P5 Runtime Authoring 执行 self-hosted-editor-p5-goal-mode-execution-guide.md, self-hosted-editor-p5-baseline-audit.md, self-hosted-editor-p5-runtime-authoring-contract.md, self-hosted-editor-p5-runtime-session-audit.md, self-hosted-editor-p5-mock-query-model-audit.md, self-hosted-editor-p5-mock-query-ui-audit.md, self-hosted-editor-p4-final-validation-report.md, editor-design.md, self-hosted-editor-architecture-plan.md, vscode-self-hosted-editor-parity.md, runtime-unity.md, host-schema.md, host-bridge-contract.md, usage-manifest-contract.md, condition-syntax-contract.md, todo.md
Unity/Bird 适配      bird-adapter.md, unity-editor-importer.md, bird-unity-research.md, runtime-unity.md, architecture.md, todo.md
编辑器阶段           editor-design.md, roadmap.md
长期设计决策         adr/README.md
```

## 文档状态标记

- `基线`：已经作为当前项目方向采纳，除非新决策覆盖。
- `草案`：方向合理，但仍需要验证、讨论或原型证明。
- `待确认`：必须由项目负责人或核心设计讨论明确后才能进入实现。
- `候选`：目前仅作为可选方案保留，不能视为最终技术选型。

## 目录结构

```text
docs/
  README.md              文档索引与维护规则
  agent-handoff.md       Agent 接手指南、当前快照、检索地图和工作协议
  project-brief.md       项目定位、目标、非目标、成功标准
  architecture.md        三层架构、数据流与关键约束
  code-structure.md      代码目录规划与分层原则
  coding-conventions.md  编码、命名、入口与渐进式重构规范
  refactoring-plan.md    按大目标/中目标/小目标拆分的渐进式重构计划
  dsl-ecosystem-positioning.md  DSL 生态、竞品差异和分层参照
  syntax-comparison.md   同一剧情在多种叙事 DSL 风格下的对比
  dsl-syntax-guide.md    面向作者的当前语法说明与写法示例
  dsl-language.md        DSL 语言设计草案与语法待确认项
  host-schema.md         宿主查询、动作清单与连接层 Schema 草案
  usage-manifest-contract.md P3 Usage / Requirement Manifest 契约
  condition-syntax-contract.md P3 条件语法、表达式 grammar 与 parser / IR 设计契约
  p3-runtime-language-discussion-memory.md P3 Runtime / 语言讨论脉络与上下文记忆
  self-hosted-editor-p3-goal-mode-execution-guide.md P3 goal 模式执行指南
  self-hosted-editor-p3-baseline-audit.md P3 Round 1 基线审计
  self-hosted-editor-p3-host-schema-v2-contract-audit.md P3 Round 2 Host Schema v2 契约审计
  self-hosted-editor-p3-host-schema-compatibility-audit.md P3 Round 3 Host Schema action consumption 兼容审计
  self-hosted-editor-p3-usage-manifest-contract-audit.md P3 Round 4 Usage Manifest 契约审计
  self-hosted-editor-p3-usage-manifest-implementation-audit.md P3 Round 5 inspect-usage-project 实现审计
  self-hosted-editor-p3-host-integration-audit.md P3 Round 6 Host Integration Audit 实现审计
  self-hosted-editor-p3-condition-syntax-contract-audit.md P3 Round 7 条件语法 contract / parser 设计审计
  self-hosted-editor-p3-condition-syntax-implementation-audit.md P3 Round 8 条件语法 Compiler / IR 实现审计
  self-hosted-editor-p3-condition-consumption-audit.md P3 Round 9 条件表达式 Tooling / LanguageServer / Editor 消费审计
  self-hosted-editor-p3-runtime-query-provider-audit.md P3 Round 10 Runtime query provider / internal facts 审计
  self-hosted-editor-p3-runtime-state-audit.md P3 Round 11 Runtime State 最小模型审计
  self-hosted-editor-p3-integration-audit.md P3 Round 12 最小端到端 smoke / 文档收口审计
  self-hosted-editor-p3-final-validation-report.md P3 第一刀最终验证报告
  self-hosted-editor-p4-goal-mode-execution-guide.md P4 Runtime playable MVP goal 模式执行指南
  self-hosted-editor-p4-baseline-audit.md P4 Round 1 Runtime playable MVP 基线审计
  runtime-playable-mvp-contract.md P4 Runtime playable MVP 行为合同
  self-hosted-editor-p4-condition-evaluator-audit.md P4 Round 2 Runtime condition evaluator 审计
  self-hosted-editor-p4-runtime-flow-audit.md P4 Round 3 Runtime flow 条件接入审计
  self-hosted-editor-p4-final-validation-report.md P4 Runtime playable MVP 最终验证报告
  self-hosted-editor-p5-goal-mode-execution-guide.md P5 SelfHostedEditor Runtime authoring goal 模式执行指南
  self-hosted-editor-p5-baseline-audit.md P5 Round 1 Runtime authoring 基线审计
  self-hosted-editor-p5-runtime-authoring-contract.md P5 Runtime authoring 产品化合同
  self-hosted-editor-p5-runtime-session-audit.md P5 Round 2 Runtime authoring session 审计
  self-hosted-editor-p5-mock-query-model-audit.md P5 Round 3 Mock query model 审计
  self-hosted-editor-p5-mock-query-ui-audit.md P5 Round 4 Mock query UI 审计
  self-hosted-editor-p5-integration-audit.md P5 Round 12 integration smoke 审计
  self-hosted-editor-p5-final-validation-goal-mode-execution-guide.md P5 final validation goal 模式执行指南
  self-hosted-editor-p5-final-validation-report.md P5 Runtime authoring 最终验证报告
  post-p5-next-direction-decision-goal-mode-execution-guide.md Post-P5 下一方向决策门 goal 模式执行指南
  post-p5-next-direction-decision-brief.md Post-P5 下一候选方向决策 brief
  host-integration-partner-readiness-goal-mode-execution-guide.md Host Integration Partner Readiness goal 模式执行指南
  host-integration-partner-readiness-baseline-audit.md Host Integration Partner Readiness Round 1 baseline audit
  host-integration-package-contract.md Host Integration Package 契约
  narrative-graph-ir-external-contract.md Narrative Graph IR 外部契约
  source-location-external-contract.md Source Location 外部契约
  localization-anchor-export-contract.md Localization Anchor Export 外部契约
  host-bridge-candidate-contract.md Host Bridge Candidate 外部契约
  host-integration-partner-readiness-fixtures.md Host Integration Partner Readiness fixture 说明
  host-integration-static-fixtures/ Round 4 static artifact fixture pack
  sinan-cooperation/README.md Sinan / Inscape 合作资料索引
  sinan-cooperation/host-integration-partner-readiness-decision-brief-2026-06-21.md Host Integration Partner Readiness 决策简报
  sinan-cooperation/host-integration-partner-readiness-business-response-2026-06-21.md Host Integration Partner Readiness 商务反馈口径
  vscode-tooling.md      VSCode 阶段的轻工具链设计与使用方式
  cli-command-reference.md CLI 命令、参数、产物和验证命令速查
  l10n-extraction.md     CSV 本地化提取命令与字段说明
  editor-design.md       独立编辑器交互草案与待验证工作流
  hash-localization.md   隐式哈希锚点、本地化与文本修订策略
  runtime-unity.md       Unity 宿主、IR 执行与运行时边界
  bird-unity-research.md Bird 现有 Story/L10N/Director 数据结构调研
  bird-adapter.md        Bird manifest/L10N 导出原型
  unity-editor-importer.md Unity Editor Importer 草案
  roadmap.md             阶段规划与阶段验收门槛
  todo.md                当前可执行任务与调研项
  open-questions.md      当前最重要的待确认问题
  adr/                   架构决策记录
```

## 维护规则

- 发现不确定内容时，先进入 [待确认问题](open-questions.md)，不要直接写成最终规范。
- 影响架构、长期兼容性、存档、本地化或编辑器交互模型的决定，需要新增 ADR。
- 草案可以大胆记录候选方案，但必须写明风险、取舍和下一步验证方式。
- 当代码实现与文档不一致时，应优先判断是不是设计变化。如果是，更新文档或新增 ADR；如果不是，修正实现。
- 每次完成可独立接续的阶段后，更新 [Agent 接手指南](agent-handoff.md) 的当前快照和下一步优先队列。

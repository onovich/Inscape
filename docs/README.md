# 文档索引

本目录是 Inscape 的项目知识库。当前目标不是一次性写出最终规格，而是建立一个能持续收敛的文档体系：已经确定的内容进入基线文档，仍在探索的内容进入草案和待确认清单，已经做出的项目级选择进入 ADR。

## 快速入口

- 接手项目或恢复上下文：先读 [Agent 接手指南](agent-handoff.md)，再读 [TODO](todo.md)。
- 查长期决策：读 [ADR](adr/README.md)，不要只看当前实现推断设计意图。
- 查当前实现边界：读 [代码结构规划](code-structure.md)，再进入对应源码目录。
- 查未定事项：读 [待确认问题](open-questions.md)，避免把草案当成规范。

## 阅读路径

新成员建议按以下顺序阅读：

1. [Agent 接手指南](agent-handoff.md)
2. [项目立项说明](project-brief.md)
3. [架构草案](architecture.md)
4. [代码结构规划](code-structure.md)
5. [语法样例对比](syntax-comparison.md)
6. [DSL 语言设计草案](dsl-language.md)
7. [VSCode 轻工具链](vscode-tooling.md)
8. [哈希锚点与本地化](hash-localization.md)
9. [本地化提取](l10n-extraction.md)
10. [编辑器设计草案](editor-design.md)
11. [运行时与 Unity 宿主](runtime-unity.md)
12. [Bird / Unity 调研记录](bird-unity-research.md)
13. [Bird Adapter 原型](bird-adapter.md)
14. [路线图](roadmap.md)
15. [TODO](todo.md)
16. [待确认问题](open-questions.md)

## 按任务检索

```text
任务类型             建议读取
接手/恢复上下文      agent-handoff.md, todo.md, roadmap.md
DSL 语法             dsl-language.md, syntax-comparison.md, open-questions.md
VSCode 工具          vscode-tooling.md, tools/vscode-inscape/README.md
本地化               hash-localization.md, l10n-extraction.md, ADR 0006
Unity/Bird 适配      bird-adapter.md, bird-unity-research.md, runtime-unity.md, architecture.md, todo.md
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
  syntax-comparison.md   同一剧情在多种叙事 DSL 风格下的对比
  dsl-language.md        DSL 语言设计草案与语法待确认项
  vscode-tooling.md      VSCode 阶段的轻工具链设计与使用方式
  l10n-extraction.md     CSV 本地化提取命令与字段说明
  editor-design.md       独立编辑器交互草案与待验证工作流
  hash-localization.md   隐式哈希锚点、本地化与文本修订策略
  runtime-unity.md       Unity 宿主、IR 执行与运行时边界
  bird-unity-research.md Bird 现有 Story/L10N/Director 数据结构调研
  bird-adapter.md        Bird manifest/L10N 导出原型
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

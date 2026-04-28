# 文档索引

本目录是 Inscape 的项目知识库。当前目标不是一次性写出最终规格，而是建立一个能持续收敛的文档体系：已经确定的内容进入基线文档，仍在探索的内容进入草案和待确认清单，已经做出的项目级选择进入 ADR。

## 阅读路径

新成员建议按以下顺序阅读：

1. [项目立项说明](project-brief.md)
2. [架构草案](architecture.md)
3. [代码结构规划](code-structure.md)
4. [DSL 语言设计草案](dsl-language.md)
5. [哈希锚点与本地化](hash-localization.md)
6. [编辑器设计草案](editor-design.md)
7. [运行时与 Unity 宿主](runtime-unity.md)
8. [路线图](roadmap.md)
9. [TODO](todo.md)
10. [待确认问题](open-questions.md)

## 文档状态标记

- `基线`：已经作为当前项目方向采纳，除非新决策覆盖。
- `草案`：方向合理，但仍需要验证、讨论或原型证明。
- `待确认`：必须由项目负责人或核心设计讨论明确后才能进入实现。
- `候选`：目前仅作为可选方案保留，不能视为最终技术选型。

## 目录结构

```text
docs/
  README.md              文档索引与维护规则
  project-brief.md       项目定位、目标、非目标、成功标准
  architecture.md        三层架构、数据流与关键约束
  code-structure.md      代码目录规划与分层原则
  dsl-language.md        DSL 语言设计草案与语法待确认项
  editor-design.md       独立编辑器交互草案与待验证工作流
  hash-localization.md   隐式哈希锚点、本地化与文本修订策略
  runtime-unity.md       Unity 宿主、IR 执行与运行时边界
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

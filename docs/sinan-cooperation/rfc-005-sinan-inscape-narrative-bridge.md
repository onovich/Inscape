# RFC-005：Sinan / Inscape Narrative Bridge

> 状态：Draft for alignment
> 日期：2026-06-20
> 关联战略：Sinan Engine 外部基础设施合作战略决定
> 适用合作方：Inscape / 叙事 DSL、编译器、作者工具链

---

## 1. 摘要

Sinan Engine 与 Inscape 的合作边界应定义为：

```txt
Sinan Engine owns game runtime semantics.
Inscape owns narrative authoring and narrative compilation.
The bridge owns import, catalog exchange, Host Schema, Host Bridge, validation, and dry-run reports.
```

Inscape 不进入 Sinan Web runtime core，也不被收编为 Sinan 内部模块。它应作为 Sinan 的 narrative authoring partner，提供 `.inscape` 剧本文本、Narrative Graph IR、source map、本地化 anchor、Host Schema / Host Bridge 作者体验和 Runtime authoring 工具链。

Sinan 保留引擎主权：World、Director、Event、Action、Condition、Timeline、Runtime UI、Asset、Input、Camera、save/load、build pipeline 和最终游戏运行时 ownership。

## 2. 背景

Sinan 已升级为 AI-native、data-first、Web 原生 3D 游戏引擎与编辑器。原 Scene Director 范围现在是引擎内部 Director System，负责事件、条件、动作、Timeline、Camera Shot、动画 cue、材质参数和 cinematic flow。

Inscape 是以 `.inscape` 文本 DSL 为源数据的叙事编译链与作者工具体系。它已经形成较成熟的边界：

- Compiler 输出 Narrative Graph IR、diagnostics、source map 和 localization anchors。
- Tooling / LanguageServer / SelfHostedEditor 提供作者工作流。
- Host Schema 回答剧本可引用哪些 query / action / host capability。
- Host Bridge 回答 Inscape 可读 ID 如何映射到宿主资源、事件、query 或 handler。
- Runtime authoring surfaces 已覆盖 Preview、Mock Query、Runtime Actions、Status、Log / Backlog、Branch Receipts 和 Substate。

这使 Inscape 很适合作为 Sinan 的叙事 authoring 合作方，但不适合作为 Sinan engine core 的直接组成部分。

## 3. 目标

本 RFC 定义：

- Sinan 与 Inscape 的所有权边界。
- Narrative Bridge 的最小交换对象。
- 第一阶段 dry-run importer / report POC。
- Host Schema / Host Bridge 对齐路径。
- Runtime / live preview 的后置条件。

## 4. 非目标

本 RFC 不做：

- 不把 Inscape Compiler、Runtime 或 SelfHostedEditor 并入 Sinan repo。
- 不让 Sinan Web runtime 直接依赖 Inscape C# / .NET runtime。
- 不让 Inscape 管理 Sinan World、Director、Event、Action 或 save/load。
- 不把 Sinan Timeline、CameraShot 或 material action 变成 Inscape DSL 内建语义。
- 不在第一阶段做 live preview、bidirectional edit 或完整 runtime handoff。
- 不承诺排他合作、品牌合并、仓库合并或统一 npm / NuGet scope。

## 5. Source Of Truth

Sinan source-of-truth：

```txt
data/**/*.json
src/schemas/**
src/events/**
src/director/**
src/engine/**
src/world/**
Sinan validation / smoke / migration / report pipeline
```

Inscape source-of-truth：

```txt
*.inscape source files
Compiler-produced Narrative Graph IR
source locations / source map
localization anchors
Inscape Host Schema / Host Bridge inputs
Inscape Tooling / LanguageServer / Runtime authoring contracts
```

Bridge artifacts 不是双方任一 core 的隐藏事实源。它们是可生成、可校验、可 diff、可回退的交换层。

## 6. 核心概念

### 6.1 Narrative Graph IR

Inscape 编译输出的叙事图数据。

Sinan 可以消费它来生成或验证：

- dialogue sequence。
- choices。
- narrative node graph。
- source locations。
- localization anchors。
- host action/query usage。
- timeline / cutscene hooks。

限制：

- Sinan 不直接解析 `.inscape` 源文本。
- Inscape IR 不直接成为 Sinan World state。
- IR import 需要 dry-run report 和 source location diagnostics。

### 6.2 Sinan Resource Catalog

Sinan 可导出的资源能力清单。

候选内容：

- speaker / role ids。
- models / images / audio。
- timelines。
- camera shots。
- UI panels / prompt types。
- actions / events。
- query names。
- material cues。

该 catalog 用于 Inscape 作者补全、校验和 bridge 建议，不代表 Inscape 拥有 Sinan 资源事实源。

### 6.3 Host Schema

Inscape 侧能力清单。

Sinan 可提供：

- `queries[]`：叙事可读取的状态，例如 inventory、quest、relationship、flag。
- `actions[]`：叙事可请求的动作，例如 play timeline、show UI、set flag、start director cue。
- parameter types。
- side-effect mode。
- authoring display metadata。

Host Schema 不保存具体资源映射。

### 6.4 Host Bridge

可读 ID 到 Sinan 内部 ID / resource / action handler 的映射。

示例：

```txt
speaker.mira -> Sinan entity / role id
timeline.gate_open -> data/timelines/tl_open_gate.json
cameraShot.gate_reveal -> data/cameraShots/cam_gate_reveal.json
action.play_timeline -> Sinan action registry route
```

限制：

- Host Bridge 可以由 Sinan 生成候选，也可以人工确认。
- Host Bridge 不进入 Inscape Compiler core。
- Host Bridge 不替代 Sinan data references。

### 6.5 Import Report

Bridge dry-run 的核心产物。

应包含：

- imported narrative nodes。
- unresolved speakers / resources / actions / queries。
- unsupported Inscape feature。
- suggested Sinan ids。
- localization anchor mapping。
- source location。
- severity。
- whether applying would modify Sinan data。

第一阶段只要求 dry-run report，不要求写盘。

## 7. 推荐接入边界

第一阶段推荐数据流：

```txt
Inscape .inscape source
  -> Inscape Compiler / Tooling
  -> Narrative Graph IR + localization CSV + usage manifest
  -> Sinan Narrative Bridge dry-run importer
  -> import report / Host Bridge candidate
  -> human review
```

第二阶段推荐数据流：

```txt
Sinan resource/action/query catalog
  -> Inscape Host Schema / Host Bridge authoring support
  -> completion / hover / diagnostics
  -> updated Inscape narrative source
  -> dry-run importer report
```

第三阶段之后才考虑：

```txt
Inscape Runtime / action protocol
  <-> Sinan preview runtime / Director / UI / query provider
```

## 8. POC Plan

### POC-1：Static Narrative Import Dry Run

目标：证明 Inscape graph 能被 Sinan 读取并形成报告。

输入：

- 一个小型 `.inscape` sample。
- Inscape 导出的 Narrative Graph IR。
- localization CSV / anchors。
- usage manifest。

输出：

- Sinan import report。
- Host Bridge candidate。
- missing binding diagnostics。

验收：

- 不修改 Sinan 正式 data。
- report 可 diff。
- source location 可追溯。
- unsupported feature 明确列出。

### POC-2：Sinan Catalog Export

目标：让 Inscape 作者工具理解 Sinan 可用能力。

Sinan 输出：

- resource catalog。
- action catalog。
- query catalog。
- timeline / cameraShot catalog。

Inscape 消费：

- Host Schema。
- Host Bridge candidate。
- completion / hover / diagnostics。

验收：

- Inscape core 不依赖 Sinan。
- Sinan catalog 不泄漏 runtime cache 或 private editor store。
- missing binding 可被 Inscape authoring surface 显示。

### POC-3：One-Way Apply Candidate

目标：在人工确认后生成 Sinan-side narrative data draft。

候选输出：

- `data/narrative/*.json`
- event/action references。
- timeline hook references。
- localization anchor mapping。

验收：

- 生成文件 ownership 明确。
- 可回退。
- validation 通过。
- 不覆盖手写数据。

### POC-4：Runtime Preview Bridge

目标：在前 3 个 POC 稳定后，再验证 live preview。

候选方式：

- Sinan 提供 query provider。
- Inscape Runtime 产出 narrative snapshot。
- Sinan Director / Runtime UI 消费有限 action。

验收：

- 谁拥有 runtime truth 明确。
- pending action / handoff / resume 边界明确。
- 不把 Inscape substate 扩张为 Sinan 完整 save。

## 9. 验收标准

Narrative Bridge 进入 Sinan 主线前必须满足：

- 不要求 Sinan runtime 依赖 Inscape core。
- 不要求 Inscape core 依赖 Sinan。
- 不替代 Sinan `data/**/*.json` source-of-truth。
- 不把 Sinan Timeline / CameraShot / Event / Material action 变成 Inscape DSL 内建私有语义。
- 有 dry-run report。
- 有 source location diagnostics。
- 有 Host Schema / Host Bridge version。
- 有 import fallback / no-op path。
- 有至少一个 small sample。
- 未通过前不进入 Sinan hard dependency。

## 10. 拒绝方案

拒绝：

- 让 Inscape 直接修改 Sinan project data 而不经过 dry-run / report / review。
- 把 `.inscape` 文件作为 Sinan runtime 唯一剧情事实源。
- 让 Sinan 直接解析 `.inscape` 源文本。
- 让 Inscape Runtime 接管 Sinan DirectorSystem。
- 把 Timeline hook、CameraShot、Material parameter、UI action 全部硬编码进 Inscape DSL。
- 在 POC-1 之前做 live preview 或 bidirectional edit。

## 11. Sinan 侧架构调整建议

为了让合作可以进入工程执行，而不是停留在概念对齐，Sinan 侧需要为 Narrative Bridge 预留一组明确的上层结构。以下调整不要求 Inscape 修改核心编译器，也不要求 Sinan 立即引入 Inscape runtime 依赖。

### 11.1 新增 Narrative Import 边界

Sinan 应在 engine data pipeline 中新增 narrative import 边界，而不是把 Inscape 当成某个 runtime subsystem。

建议边界：

```txt
external narrative artifact
  -> narrative import adapter
  -> dry-run report
  -> generated data candidate
  -> Sinan validation
  -> human approval
```

该边界的职责：

- 接收 Inscape Narrative Graph IR / usage manifest / localization anchors。
- 生成只读 import report。
- 在后续阶段生成 Sinan-side narrative data candidate。
- 不直接修改正式 `data/**/*.json`。
- 不解析 `.inscape` 源文本。
- 不持有 Sinan runtime state。

### 11.2 新增 Host Catalog Export

Sinan 需要把自身可暴露给外部叙事工具的能力整理成 catalog，而不是让 Inscape 猜测 Sinan 内部结构。

首批 catalog 建议包含：

- speaker / character ids。
- asset ids 与 asset kind。
- action ids 与参数 schema。
- query ids 与返回类型。
- event ids。
- timeline hook ids。
- cameraShot ids。
- runtime UI target ids。
- localization namespace / key policy。

这些 catalog 应从 Sinan 的 schema、registry、data validation 中生成，避免成为手写副本。Inscape 可以把它们消费为 Host Schema / Host Bridge 的输入，但 Inscape core 不应依赖 Sinan catalog 的实现细节。

### 11.3 新增 Bridge Artifact 分层

建议把合作产生的文件分成三类：

- Source artifact：Inscape 产生并拥有，例如 `.inscape`、Narrative Graph IR、localization anchors。
- Host artifact：Sinan 产生并拥有，例如 resource/action/query catalog、validation schema、import rules。
- Bridge artifact：双方共同对齐，例如 Host Bridge candidate、import report、binding diagnostics、compatibility matrix。

Bridge artifact 不应被当成双方任何一方的核心事实源。它的价值是暴露差异、生成候选、支撑评审。

### 11.4 新增 Validation Gate

Narrative Bridge 进入 Sinan 主线前，Sinan 应增加独立 validation gate。该 gate 至少检查：

- Graph node ids 是否稳定。
- referenced Sinan ids 是否存在。
- action/query 参数是否符合 Sinan schema。
- localization anchors 是否可追踪到 source location。
- unsupported feature 是否被显式降级或拒绝。
- import candidate 是否只写入允许的 generated 区域。
- dry-run report 是否可 diff。

该 gate 是 Sinan 接入外部 authoring 工具的基础设施，不应只为 Inscape 一次性定制。

## 12. 双方最小交付物

建议第一轮合作不要以 live preview 作为目标，而是以可审查的静态交换作为目标。

Inscape 侧最小交付物：

- 一个小型 `.inscape` sample。
- sample 对应的 Narrative Graph IR。
- usage manifest。
- localization CSV / anchor map。
- Host Bridge candidate 或可生成 Host Bridge candidate 的输入说明。
- source location diagnostics 样例。

Sinan 侧最小交付物：

- resource/action/query/catalog 草案。
- import dry-run report schema。
- missing binding diagnostic 格式。
- generated narrative data candidate 的预期目录和 ownership 说明。
- validation checklist。
- 一份 small sample 的人工评审记录。

双方共同交付物：

- compatibility matrix。
- POC-1 acceptance report。
- open questions list。
- next-slice decision note。

## 13. 评审节奏与升级条件

建议采用小步评审：

1. 先评审 artifact shape。
2. 再评审 dry-run report。
3. 再评审 one-way generated candidate。
4. 最后才讨论 runtime preview。

每一步都应有明确升级条件：

- 没有 source location，就不升级到 apply candidate。
- 没有 catalog version，就不升级到 authoring completion。
- 没有 no-op / fallback policy，就不升级到 runtime preview。
- 没有 ownership 说明，就不允许写入 Sinan 正式 data。

## 14. 近期非目标

近期不建议做：

- Sinan 内置 `.inscape` parser。
- Inscape 内置 Sinan Director / World / Timeline 语义。
- 双向编辑。
- Inscape Runtime 接管 Sinan save/load。
- 在 Sinan runtime 中强依赖 Inscape compiler。
- 把 Sinan 所有 action/query/camera/ui 能力一次性暴露给 Inscape。
- 在 POC-1 前做复杂 SelfHostedEditor 联动。

## 15. 技术建议文档

本 RFC 关注 Sinan / Inscape Narrative Bridge 的合作边界。更具体的技术建议见同目录：

- `sinan-technical-advisory-2026-06-20.md`

## 16. Open Questions

- Sinan 是否应新增 `data/narrative/*.json`，还是先只输出 import report？
- Sinan action/query catalog 的格式是否复用 Inscape Host Schema，还是另有 Sinan catalog schema？
- localization anchor 映射应进入 Sinan data、Inscape sidecar，还是 bridge artifact？
- Inscape Runtime preview 是否由 Inscape 驱动 Sinan，还是 Sinan 驱动 Inscape Runtime？
- Narrative Bridge adapter 放在 Sinan repo、Inscape repo，还是独立 `sinan-inscape-bridge`？

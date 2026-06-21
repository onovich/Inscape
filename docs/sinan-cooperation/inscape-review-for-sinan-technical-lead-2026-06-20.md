# Inscape 对 Sinan / Inscape Narrative Bridge RFC-005 的 Review

状态：对外 review 草案

日期：2026-06-20

读者：Sinan Engine 架构师 / 最高技术负责人、技术架构顾问、商务与生态合作负责人

参考材料：

- `rfc-005-sinan-inscape-narrative-bridge.md`
- `sinan-technical-advisory-2026-06-20.md`
- `sinan-business-letter-2026-06-20.md`

## 1. 总体结论

我们已经阅读 Sinan 侧补充后的 RFC-005 与技术顾问建议。整体判断是：这份 RFC 的合作边界是健康的，技术路线是合理的，值得进入下一步小范围工程 POC。

我们尤其认可以下判断：

- Sinan Engine owns game runtime semantics。
- Inscape owns narrative authoring and narrative compilation。
- Bridge owns import, catalog exchange, Host Schema, Host Bridge, validation, and dry-run reports。
- 第一阶段先做 static artifact exchange / dry-run importer，不做 live preview。
- 不把 Inscape Compiler、Runtime 或 SelfHostedEditor 并入 Sinan repo。
- 不让 Sinan Web runtime 直接依赖 Inscape C# / .NET runtime。
- 不让 Inscape 直接管理 Sinan World、Director、Event、Action、save/load 或 build pipeline。
- 不把 Sinan Timeline、CameraShot、Material action、Runtime UI 等能力变成 Inscape DSL 内建语义。

这说明 Sinan 侧并不是希望把 Inscape 当作 engine 内部 runtime subsystem，而是把 Inscape 当作 narrative authoring infrastructure partner。这个定位与 Inscape 当前架构方向一致。

我们的建议是：继续推进合作，但第一阶段应保持 `report-first / artifact-first / dry-run-first`。只有静态 artifact、catalog、Host Bridge candidate、source location、localization anchor 和 validation report 都跑通后，才进入 one-way generated candidate；Runtime Preview Bridge 应放在更后面。

## 2. 对 RFC-005 的正向评价

RFC-005 比早期概念交流更进一步，已经进入工程边界层。它最大的优点不是提出了某个新功能，而是明确排除了很多高风险路径。

这些非目标非常重要：

- 不合并仓库。
- 不做排他合作。
- 不让一方 runtime 硬依赖另一方 core。
- 不在 POC-1 前做 live preview。
- 不做 bidirectional edit。
- 不让 Sinan 直接解析 `.inscape` 源文本。
- 不让 Inscape Runtime 接管 Sinan DirectorSystem。
- 不让 Bridge artifact 成为任何一方隐藏事实源。

这套边界可以避免最典型的 double truth problem：

```txt
Inscape narrative graph 判断剧情下一步是 A
Sinan Director / Timeline / Condition 判断剧情下一步是 B
```

我们认为 RFC-005 当前最有价值的共识是：

```txt
Inscape narrative truth
Sinan engine runtime truth
Bridge translation evidence
```

Bridge 的职责应是暴露差异、生成候选、产生 report 和支撑人工确认，而不是替代双方核心事实源。

## 3. 对技术顾问建议的评价

技术顾问建议中 “Inscape should be treated as a narrative authoring infrastructure partner, not as a Sinan internal runtime subsystem” 这个判断是准确的。

我们也认可以下建议：

- Sinan-specific 逻辑应放在 host profile / bridge / ExternalSupport，而不是 Inscape Compiler。
- Inscape 内部继续保持 .NET / C# 路线，不需要为 Web-native engine 改写 core。
- 对外交付应以稳定 JSON artifact 为主。
- Source location 必须一等化。
- Usage / Host Integration / dry-run report 应成为第一阶段核心产物。
- 测试 fixture 应先于 runtime adapter。
- Runtime Preview 应放在 POC 后段。

其中最重要的是：Sinan 需要提供 catalog 和 validation gate，而不是要求 Inscape 猜测 Sinan 内部结构。

换句话说，Sinan 侧应承担 first-party design partner 责任：

- 提供 resource/action/query/timeline/camera/UI catalog。
- 提供 canonical id policy。
- 提供 generated data 目录策略。
- 提供 import dry-run report schema。
- 提供 validation checklist。
- 明确哪些数据是 generated，哪些数据是 manual。

这些不是 Inscape 能单方面补齐的内容。

## 4. 对 Inscape 自研路线的影响

这份 RFC 不要求 Inscape 改变核心架构，也不要求 Inscape 成为 Sinan 的附属模块。

我们不会做以下调整：

- 不把 Sinan Director、World、Timeline、Camera、Runtime UI 语义写入 `Inscape.Compiler`。
- 不新增 Sinan 专用 DSL 语法。
- 不让 `Internal/Runtime` 依赖 Sinan TypeScript runtime。
- 不让 SelfHostedEditor 变成 Sinan editor 插件。
- 不把 Sinan 的 data directory layout 写成 Inscape core contract。

但它会影响 Inscape 下一阶段优先级。Inscape Post-P5 原本已经倾向下一步做 Host Bridge / Host Schema 自动化与代码生成收口。Sinan 的 RFC 进一步说明，这个方向不只是服务 Unity / Bird，也服务 Sinan 这类 Web-native engine。

因此我们建议把下一阶段目标从：

```txt
Host Bridge / Host Schema automation
```

升级为：

```txt
Host Integration Partner Readiness
```

这个阶段仍然保持 engine-agnostic，但会以 Sinan 作为重要 partner profile / fixture 来检验通用契约是否足够清楚。

## 5. 建议的 Inscape 侧调整

### 5.1 定义 Integration Package

建议 Inscape 明确一个对外交换包概念。它不是单一文件，而是一组可版本化、可 diff、可审计的 artifact。

候选组成：

```txt
inscape integration package
  Narrative Graph IR
  source map / source locations
  localization anchors / localization CSV
  inscape.usage
  Host Integration Audit report
  optional Host Bridge candidate
  diagnostics JSON
```

其中 `inscape.usage` 仍只回答“剧本实际用了哪些宿主能力”。不要把 branch、speaker、localization anchor、diagnostics 全部塞进 Usage Manifest。它们可以作为 integration package 的其他 artifact 存在。

### 5.2 强化 Narrative Graph IR 对外 contract

Sinan dry-run importer 需要消费 Narrative Graph IR，所以 Inscape 需要明确哪些字段可作为稳定外部契约。

第一阶段至少需要：

- graph format / formatVersion。
- producer version。
- node stable id。
- node title / display label。
- dialogue / narration line。
- choices / jumps。
- conditions usage。
- host action / timeline hook usage。
- source locations。
- localization anchors。
- unsupported feature markers。

这不意味着 Compiler 要为 Sinan 增加特殊语义。只是把当前已有的叙事图数据整理成对外可消费的 contract。

### 5.3 定义 Host Bridge Candidate

Sinan 需要 Host Bridge candidate，而 Inscape 也需要避免手写 bridge 漂移。

建议第一阶段只生成候选，不生成最终业务代码：

```txt
usage + Sinan catalog
  -> bridge candidate
  -> dry-run report
  -> human review
  -> optional generated candidate
```

Host Bridge candidate 应包含：

- Inscape readable id。
- host kind。
- suggested Sinan id。
- confidence / match reason。
- source location。
- conflict / ambiguity。
- missing binding diagnostic。
- whether applying would modify host data。

### 5.4 准备 shared fixtures

在 runtime adapter 之前，建议双方先建立 fixture。

Inscape 可以准备：

- minimal dialogue sample。
- branching sample。
- localization sample。
- missing speaker sample。
- unknown action sample。
- unsupported feature sample。
- source location diagnostic sample。

这些 fixture 会比 live preview 更早暴露真正的接口问题。

## 6. 对 Sinan 侧的建议

RFC-005 第 11 节提出 Sinan 侧新增 narrative import boundary、Host Catalog Export、Bridge Artifact 分层和 Validation Gate。我们认为这些建议合理，并且是进入 POC 的前置条件。

我们建议 Sinan 优先完成以下最小产物：

### 6.1 Catalog 草案

Sinan 需要输出稳定 catalog，而不是让 Inscape 读取内部 runtime store。

首批 catalog 建议包含：

- speaker / character ids。
- action ids 与参数 schema。
- query ids 与返回类型。
- timeline ids。
- cameraShot ids。
- runtime UI target ids。
- asset ids 与 asset kind。
- localization namespace / key policy。

这些 catalog 最好由 Sinan schema / registry / validation pipeline 生成，避免成为手写副本。

### 6.2 Dry-run Report Schema

Sinan importer 第一版应只输出 report，不修改正式 data。

Report 至少包含：

- imported node summary。
- unresolved speaker / resource / action / query。
- unsupported feature。
- suggested Sinan id。
- source location。
- localization anchor mapping。
- generated candidate path。
- severity。
- no-op reason。
- apply risk。

### 6.3 Generated Data Ownership

如果进入 POC-3，Sinan 需要提前说明：

- generated data 放在哪里。
- 是否使用 `data/narrative/generated/*.json`。
- generated 文件是否允许手工编辑。
- 如何回滚。
- 如何通过 Sinan validation。
- 如何避免覆盖 manual data。

没有 ownership 说明前，不建议进入 apply candidate。

## 7. 建议合作路线

### POC-1：Static Artifact Exchange / Dry-run

目标：确认 Inscape artifact 能被 Sinan importer 读取，并产出可审查 report。

Inscape 提供：

- `.inscape` sample。
- Narrative Graph IR。
- source map / source locations。
- localization anchors / CSV。
- `inscape.usage`。
- diagnostics sample。

Sinan 提供：

- dry-run importer report。
- missing binding diagnostics。
- Host Bridge candidate。

验收标准：

- 不写 Sinan 正式 data。
- 不引入 Sinan runtime dependency。
- report deterministic / diffable。
- diagnostics 可回到 Inscape source。

### POC-2：Sinan Catalog To Host Schema / Host Bridge

目标：确认 Sinan catalog 能投影成 Inscape authoring surface 可理解的能力。

Sinan 提供：

- resource catalog。
- action catalog。
- query catalog。
- timeline / cameraShot / UI target catalog。

Inscape 验证：

- Host Schema projection。
- Host Bridge candidate projection。
- completion / hover / diagnostics 可行性。
- Host Integration Audit 可报告 missing binding。

验收标准：

- Inscape core 不依赖 Sinan。
- Sinan catalog 不泄漏 runtime cache 或 private editor store。
- unknown / missing / ambiguous mapping 可被作者理解。

### POC-3：One-way Generated Candidate

目标：人工确认后生成 Sinan-side narrative data candidate。

候选输出：

- `data/narrative/generated/*.json`。
- event/action references。
- timeline hook references。
- localization anchor mapping。
- import report。

验收标准：

- generated 区域 ownership 明确。
- 不覆盖手写数据。
- Sinan validation 通过。
- 可回滚。

### POC-4：Runtime Preview Bridge

仅在 POC-1 到 POC-3 稳定后讨论。

需要先回答：

- 谁驱动 preview tick。
- query provider 由谁提供。
- pending action 如何 handoff。
- resume token 如何定义。
- Inscape substate 和 Sinan save/load 如何分离。
- Runtime UI 显示权归谁。

在这些问题明确前，不建议做 live preview。

## 8. 风险与红线

### 8.1 Runtime truth 冲突

最大风险仍然是双方都想拥有 runtime truth。

推荐边界：

```txt
Inscape owns narrative authoring truth.
Sinan owns game runtime truth.
Bridge owns translation evidence, not truth.
```

### 8.2 Host Schema 被误用为 Engine API

Host Schema 是 authoring contract，不是绕过 Sinan runtime registry 的执行通道。

Inscape 可以展示 action/query 能力，但不拥有这些能力的执行权。

### 8.3 过早 live preview

Live preview 会过早引入 state sync、pending action、handoff、resume、save/load 等复杂问题。建议在静态 artifact 和 generated candidate 跑通后再进入。

### 8.4 单一合作方污染 Inscape Core

Sinan-specific 逻辑必须留在：

- host profile。
- bridge package。
- `ExternalSupport`。
- 独立 `sinan-inscape-bridge`。

不得进入 `Inscape.Compiler` 或通用 Runtime 语义。

## 9. 对 Sinan 来信问题的初步回应

### 9.1 POC-1 是否可以只做静态 dry-run？

可以，并且我们建议必须如此。POC-1 不应进入 live preview。

### 9.2 Inscape 当前最适合导出的 artifact 是哪一组？

建议第一组为：

- Narrative Graph IR。
- source map / source locations。
- localization anchors / CSV。
- `inscape.usage`。
- diagnostics JSON。
- Host Integration Audit report。

必要时再增加 Host Bridge candidate。

### 9.3 Sinan catalog 应优先对齐 Host Schema，还是保留独立 catalog？

建议 Sinan 保留独立 catalog 作为 Sinan truth，再提供到 Inscape Host Schema / Host Bridge candidate 的 projection。

不要把 Sinan catalog 直接等同于 Inscape Host Schema。

### 9.4 Host Bridge candidate 的人工确认流程放在哪里？

第一阶段建议放在独立 report 中。后续可以接入 Inscape SelfHostedEditor Host view 或 Sinan editor，但不应在第一阶段绑定 UI。

### 9.5 bridge 放在哪个仓库？

第一阶段可以先以 artifact / report 形式协作，不急着定仓库。

后续判断原则：

- 如果主要消费 Sinan catalog 并生成 Sinan data candidate，更适合在 Sinan repo。
- 如果主要生成 Inscape diagnostics / Host Bridge candidate，更适合在 Inscape `ExternalSupport`。
- 如果双方维护权重接近，可以独立 `sinan-inscape-bridge`。

不建议进入 Inscape `Internal`。

## 10. 最终建议

我们建议双方继续推进，并把第一轮合作定位为：

```txt
Sinan / Inscape Host Integration POC
```

而不是：

```txt
Sinan runtime integration
Inscape plugin for Sinan
shared runtime product
bidirectional editor integration
```

第一轮成功标准应非常朴素：

```txt
Inscape 能稳定输出 artifact。
Sinan 能稳定输出 catalog。
Bridge 能稳定生成 dry-run report。
Report 能回到 source location。
Missing binding / unsupported feature 能被人审查。
双方 core 都不新增对彼此的 hard dependency。
```

如果这一步成功，再进入 generated candidate。如果 generated candidate 也稳定，再讨论 Runtime Preview Bridge。

整体判断：Sinan 与 Inscape 的合作值得继续推进。Sinan 的 RFC-005 和技术顾问建议没有要求 Inscape 改变自研核心方向，反而强化了 Inscape 当前的 engine-agnostic、contract-first、Host Schema / Host Bridge 分层路线。对 Inscape 来说，Sinan 最适合成为下一阶段 Host Integration Partner Readiness 的重要验证对象，而不是唯一宿主或 core dependency。

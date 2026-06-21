# Sinan 技术顾问建议：Inscape

日期：2026-06-20
发件方：Sinan Engine 技术架构顾问
收件方：Inscape 项目负责人 / 架构维护者
关联文档：

- `rfc-005-sinan-inscape-narrative-bridge.md`
- `sinan-business-letter-2026-06-20.md`
- `docs/inscape-design-for-engine-collaboration.md`

## 1. 总体判断

Sinan 已从原先的导演系统升级为 **Sinan Engine**。这意味着 Sinan 不再只是关心 cinematic flow、timeline、camera shot 或 action orchestration，而是要承担完整 Web-native game engine 的数据、运行时、编辑器、验证、资源、输入、UI、相机、构建与生态集成责任。

在这个新定位下，我们对 Inscape 的判断是：

```txt
Inscape should be treated as a narrative authoring infrastructure partner,
not as a Sinan internal runtime subsystem.
```

也就是说，Inscape 很适合成为 Sinan 的叙事 authoring、叙事编译、localization anchor、Host Schema / Host Bridge 合作方。Sinan 不应该把 Inscape 直接并入 engine core，也不应该让 Inscape 接管 Sinan 的 runtime truth。

从合作性价比看，Inscape 与普通超早期项目不同。它已经具备 Compiler、Tooling、LanguageServer、Runtime-backed Preview、Host Schema、Host Bridge、Usage Manifest、SelfHostedEditor 等结构化基础。Sinan 如果完全自研同等深度的 narrative authoring pipeline，会消耗大量架构和产品注意力，而且很容易把 Sinan 的 engine core 拉向叙事工具细节。与 Inscape 合作的性价比是高的，前提是双方把边界控制住，并用 report-first 的方式验证合作，而不是过早做 runtime 绑定。

## 2. Inscape 当前值得保留的优点

从 Sinan 的视角看，Inscape 当前最有价值的不是某一个功能点，而是已经形成了比较健康的分层：

- `Internal/Compiler` 是 `.inscape` 语义和图结构的事实源。
- `Internal/Tooling` 负责项目发现、preview、localization、Host Schema / Host Bridge 等共享工具能力。
- `Internal/LanguageServer` 负责高频编辑器语义服务。
- `Internal/Runtime` 消费 Compiler / Tooling 产物，而不是重新解释源文本。
- `ExternalSupport/*` 负责 VSCode、SelfHostedEditor、UnityPlugin 等宿主胶水。

这个方向应继续坚持。Inscape 接入 Sinan 时，最重要的不是为 Sinan 加一堆专用逻辑，而是保持：

```txt
Internal is shared truth.
ExternalSupport and bridge packages are host integration surfaces.
```

如果这条边界被打破，例如把 Sinan 的 Director、World、Timeline、Camera、Runtime UI 语义直接写进 Inscape Compiler，那么短期 demo 会变快，长期会让 Inscape 失去跨引擎价值，也会让 Sinan 被迫理解 Inscape 内部演化。

## 3. 建议采用的合作架构

建议双方把合作拆成三层。

### 3.1 Inscape Core

Inscape Core 继续负责：

- `.inscape` source。
- parser / compiler / diagnostics。
- Narrative Graph IR。
- source location / source map。
- localization anchors。
- usage manifest。
- Host Schema / Host Bridge 的通用模型。
- Runtime authoring contracts。

Inscape Core 不应依赖：

- Sinan TypeScript runtime。
- Sinan data directory layout。
- Sinan DirectorSystem。
- Sinan World / Camera / Asset / Input / UI runtime。
- Sinan editor implementation。

### 3.2 Sinan Engine

Sinan Engine 继续负责：

- `data/**/*.json` source-of-truth。
- engine schemas。
- event/action/condition registries。
- world runtime。
- director runtime。
- runtime UI。
- camera and shot runtime。
- asset catalog and loader policy。
- input routing。
- validation and smoke tests。
- generated data ownership。

Sinan 不应直接解析 `.inscape` 源文本。Sinan 消费的是 Inscape 导出的 graph、manifest、anchor、bridge candidate 和 report。

### 3.3 Narrative Bridge

Narrative Bridge 是双方协作层，建议先以 artifact 和 report 存在，而不是先做 live runtime adapter。

Bridge 负责：

- 读取 Inscape Narrative Graph IR。
- 读取 Sinan catalog。
- 生成 import dry-run report。
- 生成 missing binding diagnostics。
- 生成 Host Bridge candidate。
- 后续生成 Sinan-side narrative data candidate。
- 记录 source location。
- 输出 compatibility matrix。

Bridge 不负责：

- 修改 Inscape Compiler 语义。
- 修改 Sinan runtime truth。
- 接管 Sinan save/load。
- 接管 Sinan Director。
- 绕过 Sinan validation。

## 4. 对 Inscape 的架构建议

### 4.1 把 Sinan 当成 Host Profile，而不是内建目标

Inscape 可以支持一个 `sinan` host profile，但这个 profile 应尽量放在 ExternalSupport 或独立 bridge 包中。它应该描述 Sinan 能力如何暴露给 Inscape authoring surface，而不是把 Sinan 语义变成 Inscape DSL 的内建语义。

建议形态：

```txt
Inscape Core
  -> generic Host Schema / Host Bridge
  -> sinan host profile
  -> Sinan catalog fixtures
  -> dry-run report
```

不建议形态：

```txt
Inscape Compiler
  -> built-in Sinan action semantics
  -> built-in Sinan timeline syntax
  -> built-in Sinan camera behavior
```

### 4.2 Host Schema 应表达能力，不表达控制权

Host Schema 可以告诉作者：

- 有哪些 action 可调用。
- action 参数是什么。
- 哪些 query 可用。
- query 返回什么类型。
- 哪些 resource id 可引用。
- 哪些 speaker / character / localization namespace 可用。

但 Host Schema 不应暗示 Inscape 拥有这些 runtime 能力。实际执行权仍属于 Sinan runtime。Inscape 提供 authoring 和 validation 视角，Sinan 决定运行时行为。

### 4.3 Usage Manifest 应成为第一阶段核心产物

第一阶段不必急着生成最终 Sinan data。更重要的是让双方知道一个叙事脚本到底引用了哪些宿主能力。

建议 usage manifest 至少包含：

- speakers。
- assets。
- actions。
- queries。
- branches。
- localization anchors。
- runtime UI intents。
- timeline / camera / effect references。
- unsupported or unknown feature list。
- source locations。

这样 Sinan 可以先做 dry-run report，判断缺什么、错什么、哪些映射有歧义。

### 4.4 Source Location 必须一等化

如果 bridge 只报告 “action 不存在”，但无法回到 `.inscape` 文件和具体位置，就很难进入真实生产流程。建议 Inscape 在所有对外 artifact 中保留稳定 source location。

至少需要：

- file。
- range。
- node id。
- symbol path。
- original text excerpt 的短片段或 hash。
- diagnostic severity。

Sinan importer 不应吞掉这些信息。最终 report 要能让作者回到 Inscape 编辑器修复问题。

### 4.5 不要过早扩展 DSL

Sinan 可能会有大量 engine 能力，例如 camera shot、timeline hook、material parameter、runtime UI prompt、objective、input lock、asset prefetch、save marker。短期内不建议把这些全部变成 Inscape DSL 的专用语法。

更稳妥的方式是：

- 通用 action call。
- 通用 query。
- typed parameter schema。
- catalog-driven completion。
- bridge-level validation。

只有当某类能力被多个 host 共享，且 authoring 价值明显高于 generic action，才考虑进入 Inscape DSL。

### 4.6 Runtime Preview 应放在 POC 后段

Inscape 已有 Runtime-backed Preview，这很有价值。但 Sinan 合作第一阶段不建议从 live preview 开始。

原因：

- Live preview 会立刻引入 runtime truth、pending action、handoff、resume、save/load、state sync 等复杂边界。
- 如果 static artifact 还未稳定，live preview 只会放大接口不确定性。
- Sinan 当前还在 engine 化阶段，核心 runtime surface 也需要先稳定 catalog 和 validation。

建议等 POC-1 到 POC-3 稳定后，再做 POC-4 Runtime Preview Bridge。

### 4.7 Bridge Report 要可 diff、可审计、可回滚

Sinan 的开发方式是 data-first 和 validation-first。任何外部 authoring 工具接入都必须产生可审查 artifact。

建议 report 具备：

- stable ordering。
- deterministic output。
- severity 分类。
- source location。
- referenced host id。
- suggested mapping。
- unsupported feature。
- generated candidate path。
- apply risk。
- no-op reason。

这比直接生成数据更重要，因为它能保护双方团队不被不透明自动化拖进维护成本。

## 5. 技术栈建议

### 5.1 Inscape 内部继续以 .NET / C# 为主

Inscape 当前 Compiler、Tooling、Runtime、LanguageServer 的 .NET 路线是合理的。它有利于共享模型、测试、CLI、Language Server 和 SelfHostedEditor 后端能力。Sinan 不建议 Inscape 为了接入 Web engine 而把核心迁移到 TypeScript。

### 5.2 对外交付用稳定 JSON artifact

Sinan 是 Web-native engine，TypeScript 侧天然适合消费 JSON artifact。建议 Inscape 对外输出稳定 JSON，而不是要求 Sinan 调用 Inscape 内部 API。

建议输出：

- narrative graph JSON。
- usage manifest JSON。
- localization anchor JSON / CSV。
- Host Bridge candidate JSON。
- diagnostics JSON。

JSON artifact 应包含：

- schema version。
- producer version。
- generated timestamp。
- source root。
- deterministic ids。
- compatibility flags。

### 5.3 Bridge 可独立，不急着归入任何一方 core

第一阶段可以把 bridge 当成独立协作产物。它可以先在 Inscape repo 的沟通目录中讨论，在后续阶段进入：

- Sinan repo 的 importer。
- Inscape ExternalSupport。
- 独立 `sinan-inscape-bridge` repo。

决策标准不是谁写得快，而是谁长期维护更自然。如果 bridge 主要消费 Sinan catalog 并生成 Sinan data candidate，它更适合在 Sinan 侧。如果 bridge 主要生成 Host Bridge candidate 和 Inscape diagnostics，它更适合在 Inscape 侧。如果两边都重，则可以独立。

### 5.4 测试 fixture 要先于 runtime adapter

建议双方先建立 shared fixtures：

- minimal dialogue sample。
- branching sample。
- localization sample。
- missing speaker sample。
- unknown action sample。
- unsupported feature sample。
- source location diagnostic sample。

这些 fixture 比 live adapter 更适合作为早期共同语言。

## 6. 建议的 POC 路线

### POC-1：Static Artifact Exchange

目标：确认 Inscape 能稳定输出 Sinan 可消费的 artifact。

输入：

- `.inscape` sample。
- Narrative Graph IR。
- usage manifest。
- localization anchors。
- source locations。

输出：

- Sinan dry-run report。
- missing binding diagnostics。
- Host Bridge candidate。

成功标准：

- 不写 Sinan 正式 data。
- 不引入 Sinan runtime dependency。
- report 可 diff。
- diagnostics 可回到 Inscape source。

### POC-2：Sinan Catalog To Host Schema

目标：确认 Sinan 能把 engine 能力暴露给 Inscape authoring surface。

输入：

- Sinan resource catalog。
- Sinan action catalog。
- Sinan query catalog。
- timeline / camera / UI target catalog。

输出：

- Inscape Host Schema。
- completion / hover / diagnostics 样例。
- catalog compatibility report。

成功标准：

- Inscape core 不依赖 Sinan。
- Sinan catalog 不是手写临时副本。
- missing binding 可被作者理解。

### POC-3：One-way Generated Candidate

目标：在人工确认后生成 Sinan-side narrative data candidate。

输出可以是：

- `data/narrative/generated/*.json`。
- localization mapping。
- event/action references。
- timeline hook references。
- import report。

成功标准：

- generated 区域 ownership 明确。
- 不覆盖手写数据。
- Sinan validation 通过。
- 可以回滚。

### POC-4：Runtime Preview Bridge

目标：确认 Inscape authoring preview 能和 Sinan runtime preview 做有限互动。

只建议在前三个 POC 稳定后做。届时需要明确：

- 谁驱动 preview tick。
- query provider 由谁提供。
- pending action 如何 handoff。
- resume token 如何定义。
- Inscape substate 和 Sinan save/load 如何分离。
- Runtime UI 显示权归谁。

## 7. 对 Inscape 团队的具体建议清单

建议优先做：

- 明确一个最小 Narrative Graph IR 对外契约。
- 为每个 graph node 保留 stable id 和 source location。
- 把 usage manifest 作为一等输出。
- 为 Host Schema / Host Bridge 增加 host profile version。
- 保留 unsupported feature 列表，不要静默降级。
- 提供 CLI 或 Tooling API 生成 deterministic artifact。
- 准备 5 到 7 个 integration fixtures。
- 把 Sinan 相关逻辑放在 ExternalSupport 或 bridge 层。

建议暂缓做：

- Sinan 专用 DSL 语法。
- Sinan runtime adapter。
- 双向编辑。
- 直接写 Sinan data。
- 对 Sinan Director / Timeline / Camera 建模成 Inscape 内建实体。
- 大范围扩展 SelfHostedEditor 以适配 Sinan。

## 8. 需要 Sinan 提供的支持

如果双方进入 POC，Sinan 需要提供：

- engine resource/action/query catalog 草案。
- action parameter schema。
- query return type schema。
- canonical ids policy。
- generated data 目录策略。
- validation report 格式。
- sample project。
- import dry-run report schema。
- runtime preview 的非目标说明。

Sinan 也需要承担 first-party design partner 的责任：不能只要求 Inscape 适配 Sinan，而要把 Sinan 的能力边界、命名规则、validation 机制和 generated data ownership 讲清楚。

## 9. 主要风险

### 风险一：双方都想拥有 runtime truth

如果 Inscape Runtime 和 Sinan Runtime 都试图成为最终事实源，合作会迅速变复杂。建议明确：

```txt
Inscape owns narrative authoring truth.
Sinan owns game runtime truth.
Bridge owns translation evidence, not truth.
```

### 风险二：过早做 live preview

Live preview 很诱人，但会提前暴露最复杂的状态同步问题。建议先用 dry-run report 和 generated candidate 建立信任。

### 风险三：Host Schema 被误用成 engine API

Host Schema 是 authoring contract，不是 runtime API。它可以描述能力，不应成为绕过 Sinan runtime registry 的执行通道。

### 风险四：Sinan catalog 手写漂移

如果 Sinan catalog 不是从 schema / registry / data validation 中生成，就会很快和真实 runtime 脱节。Inscape 可以消费 catalog，但 catalog 的生产责任应在 Sinan。

### 风险五：Inscape 为单一合作方污染 Core

Sinan 希望成为重要合作方，但不希望 Inscape 因此失去跨引擎能力。Sinan-specific 逻辑应留在 host profile / bridge / ExternalSupport。

## 10. 合作是否值得

从 Sinan 技术负责人视角，答案是值得，但要选择正确合作形态。

完全自研 Inscape 同类能力的成本较高，且会分散 Sinan 在 engine runtime、editor、validation、asset/input/camera/UI infrastructure 上的资源。Inscape 已经具备叙事工具链雏形，且边界意识较强，适合作为 first-party design partner。

但合作不等于依赖外包。Sinan 仍然需要主导：

- engine catalog 的结构。
- import validation。
- generated data ownership。
- runtime action/query execution。
- browser smoke 和工程质量门。
- 和其他基础设施项目的整体协调。

因此推荐策略是：

```txt
Cooperate on narrative authoring infrastructure.
Guide the bridge contract as first-party design partner.
Keep Sinan runtime independent.
Prove value through static artifacts before runtime integration.
```

## 11. 建议的下一步

1. 双方确认 RFC-005 的边界是否可接受。
2. Inscape 提供最小 sample 与 artifact shape。
3. Sinan 提供最小 catalog 草案。
4. 双方生成第一版 dry-run report。
5. 评审 unsupported feature 与 missing binding。
6. 决定 bridge 放置位置。
7. 再讨论是否进入 one-way generated candidate。

如果以上步骤顺利，再进入 Runtime Preview Bridge。否则应继续收敛 static artifact，而不是扩大 runtime 耦合。

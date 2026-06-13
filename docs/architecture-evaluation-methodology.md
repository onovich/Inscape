# 架构评估方法和标准

状态：评估标准

适用对象：评估 Inscape 架构质量的 AI 或工程代理

本文定义 Inscape 的架构评估方法、证据采集方式、评分标准和报告模板。它用于回答“当前架构处于什么水平、风险在哪里、下一步是否值得重构”，不用于直接规定重构实现方案。

## 评估原则

架构评估必须基于证据，而不是代码观感。

一次有效评估应同时回答：

- 当前架构是否遵守既定分层。
- 新增功能是否被放在正确层级。
- 修改一个局部功能时，影响范围是否可预期。
- 失败路径是否可见、可定位、可恢复。
- 测试和 contract 是否能挡住关键回归。
- 安全边界是否明确，尤其是文件路径、HTTP、进程调用和 WebView。
- 复杂度是否被清楚的模块边界吸收，而不是被隐藏到 helper 或 fallback 中。

## 必读上下文

开始评估前先读取：

```text
docs/agent-handoff.md
docs/todo.md
docs/architecture.md
docs/code-structure.md
docs/refactoring-standard.md
```

如评估涉及具体模块，还应读取对应专题文档，例如：

- SelfHostedEditor：`docs/self-hosted-editor-architecture-plan.md`
- VSCode：`docs/vscode-tooling.md`、`docs/vscode-self-hosted-editor-parity.md`
- Unity：`docs/unity-plugin-package-boundary-plan.md`
- Host bridge：`docs/host-bridge-contract.md`
- Localization：`docs/l10n-extraction.md`
- ADR：相关 `docs/adr/*.md`

## 证据采集

### 1. 工作树状态

记录当前是否存在未提交变更，避免把用户未完成工作误判为架构缺陷。

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

评估报告中应说明：

- 当前分支。
- 是否有未提交或未跟踪文件。
- 这些文件是否纳入本次评估。

### 2. 项目和依赖边界

检查 solution、project reference 和跨层引用。

重点判断：

- `Inscape.Compiler` 是否仍保持独立。
- `Inscape.Tooling` 是否只承载共享用例，不吸收 UI 状态。
- `Inscape.LanguageServer` 是否只做语言服务协议层。
- `src/ExternalSupport/*` 是否仍是宿主适配层。
- Unity / VSCode / SelfHostedEditor 是否没有反向污染 Internal。

### 3. 文件体量和复杂度分布

评估大文件不是为了追求行数洁癖，而是为了发现职责混杂和维护风险。

建议统计：

- 各顶层模块源码文件数量和总行数。
- 超过 800 行的源码、测试、脚本、CSS 文件。
- 超过 1000 行且承担多个职责的文件。
- 最近重构前后的体量变化。

重点关注：

- 组合根是否过厚。
- controller 是否同时处理 UI、模型、请求、缓存和业务语义。
- contract check 是否过大导致定位困难。
- CSS 是否混杂 layout、state、feature-specific 样式。

### 4. 行为和 contract 覆盖

记录当前可用验证命令及结果。

默认验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
```

SelfHostedEditor 验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

VSCode 语义 parity：

```powershell
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

Unity 外部支持：

```powershell
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-restore
```

报告中必须明确：

- 已运行哪些验证。
- 哪些验证未运行。
- 未运行原因。
- 失败项是否阻断评分上限。

### 5. 安全和健壮性扫描

重点搜索：

- `innerHTML`、`insertAdjacentHTML`、HTML 字符串拼接。
- `child_process.exec`、shell 拼接、未约束的 spawn 参数。
- 文件写入、删除、移动、backup、restore。
- `path.join` 写入后缺少最终 root containment。
- HTTP request body 是否无限读取。
- session / cache 是否无 TTL 或容量上限。
- fallback 是否吞掉真实错误。
- CSP 是否仍依赖 `unsafe-inline`。

安全评估不是完整安全审计，但必须指出明显 hardening 缺口。

## 评分维度

采用 10 分制。评分必须给出证据、风险和提升路径。

| 分数 | 含义 |
|---:|---|
| 9.0 到 10.0 | 边界稳定，失败路径明确，自动化充分，局部修改风险低，可长期演进 |
| 8.0 到 8.9 | 整体健康，关键边界成立，存在少量明确债务 |
| 7.0 到 7.9 | 中上水平，可持续推进，但复杂度正在累积，需要主动收口 |
| 6.0 到 6.9 | 能工作但维护成本偏高，新增功能容易造成风险扩散 |
| 6.0 以下 | 结构或质量机制不足，新增功能容易造成明显回归 |

### 架构边界 / 可演进性

评估问题：

- Compiler 是否仍是唯一语义真相层。
- Internal 和 ExternalSupport 是否边界清晰。
- 共享能力是否下沉到 Tooling / LanguageServer / Runtime。
- 宿主层是否只是适配，而不是重新推断语义。
- 新功能是否有稳定 ownership。

高分特征：

- 依赖方向单向。
- 新语义只需改 Internal 层即可跨宿主生效。
- 宿主层没有复制 parser、graph、diagnostics 规则。
- ADR 和文档能解释长期边界。

扣分信号：

- VSCode、SelfHostedEditor、CLI 出现重复语义判断。
- 单个模块同时承担协议、UI、业务、缓存、文件系统。
- 为了某个宿主体验污染 Compiler API。

### 可维护性

评估问题：

- 文件和模块是否按职责组织。
- 修改局部功能是否容易定位入口和测试。
- 是否存在过大的组合根、controller、contract check。
- 文档、TODO、ADR 是否跟得上实现。

高分特征：

- 大部分文件职责单一。
- 大文件虽然存在，但有明确聚合理由。
- 检查脚本和测试失败能快速定位。
- 文档描述与代码一致。

扣分信号：

- 超过 1000 行文件承担多个职责。
- helper / utils 命名泛化，隐藏 ownership。
- package script 过长，难以维护。
- 变更需要同时理解多个宿主才能落地。

### 安全性

评估问题：

- 用户输入、文件路径、HTTP 请求、进程调用是否有边界。
- WebView / Preview 是否避免不必要的 HTML 注入。
- 文件写回是否校验最终路径。
- 是否有备份、dry-run 或错误恢复策略。

高分特征：

- DOM 文本使用 `textContent` / `createTextNode`。
- 进程调用使用参数数组，不拼 shell。
- 所有写入路径都做 root containment。
- POST body 有 size limit。
- CSP 逐步移除 `unsafe-inline`。

扣分信号：

- `innerHTML` 处理不可信文本。
- 未校验最终绝对路径就写文件。
- dev server 可被任意大 body 或无限 session 拖垮。
- 失败被静默 fallback 掩盖。

### 稳定性

评估问题：

- 构建、测试、contract、smoke 是否通过。
- 行为 contract 是否被自动化覆盖。
- 重构是否保持 payload shape 和协议结果。
- 失败是否可复现、可定位。

高分特征：

- 默认验证链路全部通过。
- 外部宿主有 structure / model / semantic parity / HTTP smoke。
- 关键路径有正向和失败用例。
- 重构前后有明确对比。

扣分信号：

- 验证无法运行且无解释。
- contract check 被弱化。
- 只做手工验证。
- 回归需要用户体验后才能发现。

### 健壮性

评估问题：

- 输入异常、进程失败、LS 不可用、文件缺失、编码问题是否被处理。
- fallback 是否可观测。
- cache / session / temp workspace 是否有生命周期。
- 大 payload、大文件、多请求是否可控。

高分特征：

- 错误状态区分 transport、process、semantic、contract。
- fallback 有日志和用户可见状态。
- session/cache 有 TTL 或容量上限。
- 临时资源有清理策略。
- BOM、编码、缺失字段有明确处理。

扣分信号：

- 空数组、null、draft fallback 淹没真实失败。
- 长期运行 dev host 内存增长不可控。
- 进程 stderr 过长或超时缺少约束。
- 异常路径没有 smoke 覆盖。

### 可读性

评估问题：

- 命名是否表达业务职责。
- 调用链是否容易从入口追到核心。
- 文件拆分是否帮助理解，而不是制造跳转噪声。
- 注释是否解释复杂意图，而不是复述代码。

高分特征：

- 目录、文件、类型、函数命名清楚。
- 组合根只做 wiring。
- 复杂规则旁有短注释或文档链接。
- 测试名能表达行为。

扣分信号：

- `Manager`、`Utils`、`Common` 等泛名过多。
- 抽象层过多但没有稳定领域含义。
- 单个函数横跨多个业务阶段。
- 测试只描述实现步骤，不描述行为。

### 测试 / 回归体系

评估问题：

- 是否有单元测试、contract check、structure check、semantic parity、HTTP smoke 的组合。
- 新增风险是否有对应验证。
- 测试失败是否能定位到能力而非巨大聚合。
- 验证速度是否适合日常运行。

高分特征：

- 核心 Compiler / Tooling 有快速测试。
- 宿主层有 contract 和 smoke。
- 语义 parity 能防止 VSCode / SelfHostedEditor 分叉。
- 结构检查防止边界退化。

扣分信号：

- 大量行为只靠人工测试。
- 测试文件巨大且失败定位困难。
- 检查脚本过长或不可组合。
- 新增功能没有回归入口。

## 建议权重

综合评分可使用以下权重：

| 维度 | 权重 |
|---|---:|
| 架构边界 / 可演进性 | 20% |
| 可维护性 | 15% |
| 安全性 | 15% |
| 稳定性 | 15% |
| 健壮性 | 15% |
| 可读性 | 10% |
| 测试 / 回归体系 | 10% |

如果某一项触发红线，应限制总分上限，而不是仅在该项扣分。

## 红线和评分上限

以下情况会限制总分：

| 情况 | 总分上限 |
|---|---:|
| Compiler 依赖 ExternalSupport 或宿主框架 | 6.5 |
| 宿主层复制 parser 或核心语义规则 | 7.0 |
| 构建失败且原因不是环境问题 | 7.0 |
| 关键 contract check 失败 | 7.2 |
| 文件写入存在明显路径逃逸风险 | 7.0 |
| 存在不可信 HTML 注入路径 | 7.0 |
| 大量 fallback 静默吞掉核心语义失败 | 7.5 |
| 没有运行任何验证 | 7.5 |

上限不是惩罚，而是防止总体平均分掩盖结构性风险。

## 分层评分

除总分外，应按层级给出评分。

推荐层级：

- Compiler
- Tooling
- Runtime
- LanguageServer
- CLI
- VSCode
- SelfHostedEditor
- UnityPlugin / UnitySample
- Tests / Contracts
- Docs / ADR

分层评分应说明：

- 当前职责是否清楚。
- 与相邻层的依赖方向是否正确。
- 最大维护风险是什么。
- 下一步最有价值的改进是什么。

## 评估报告结构

建议报告使用以下结构：

```text
# 架构评估

状态：
评估日期：
评估对象：
工作树状态：

## 总体结论

整体评分：
一句话判断：
最强项：
最大风险：

## 分项评分

| 维度 | 分数 | 证据 | 风险 | 改进方向 |
|---|---:|---|---|---|

## 分层评分

| 层级 | 分数 | 判断 |
|---|---:|---|

## 主要证据

- 分层和项目引用
- 体量分布
- 大文件列表
- 安全观察
- 验证结果

## 红线检查

- 是否触发评分上限：
- 原因：

## 主要风险

1. ...
2. ...

## 优先改进建议

P0：
P1：
P2：

## 目标分数

短期：
中期：
不建议追求的方向：
```

## 评估输出要求

报告必须做到：

- 每个分数都有证据。
- 明确区分事实、判断和建议。
- 不把“文件变小”直接等同于“架构变好”。
- 不把“测试通过”直接等同于“架构健康”。
- 不因少量大文件自动判低分，要判断大文件是否职责混杂。
- 不因局部美观牺牲既有 contract。
- 不要求所有维度都 9 分以上。

## 常见误判

### 误判一：行数越少架构越好

行数下降只是信号，不是结论。需要继续看职责、依赖方向和失败定位是否改善。

### 误判二：拆文件就是重构

如果拆出来的文件没有清楚 ownership，只是把复杂度分散到更多跳转点，评分不应提高。

### 误判三：宿主体验代码不重要

宿主层可以比核心层更厚，但不能变成第二套语义系统。VSCode 和 SelfHostedEditor 的 parity 是重要架构信号。

### 误判四：测试通过即可高分

测试通过说明当前行为稳定，不代表边界健康。架构评分仍要看可演进性和风险集中度。

### 误判五：所有项都应该冲 9 分

9 分以上适合核心语义、跨宿主 contract 和安全边界。宿主 UI、开发脚本、过渡性外部支持达到 8 分以上通常已经足够。

## 当前 Inscape 的评估重点

后续评估应特别关注：

- Compiler 是否继续保持小而独立。
- Tooling 是否承接跨宿主共享能力。
- VSCode 和 SelfHostedEditor 是否继续保持语义 parity。
- SelfHostedEditor 的 dev host、controller、CSS、contract check 是否持续收口。
- HTTP bridge、path guard、session cache 是否有明确边界。
- localization、node map、story graph、preview、runtime 的 contract 是否被自动化覆盖。
- docs、TODO、ADR 是否和实现同步。

最终判断标准：架构不是越抽象越好，而是让复杂度待在正确的位置，让下一次功能修改更容易、更安全、更可验证。

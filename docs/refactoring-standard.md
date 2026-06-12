# AI 重构标准

状态：执行标准

适用对象：负责 Inscape 重构的 AI 或工程代理

本文定义 Inscape 后续重构的目标、边界、优先级、评分口径和验收要求。它不是通用代码洁癖规范，而是用于指导“有必要、有收益、不会破坏架构边界”的重构。

## 总体目标

重构目标不是把所有维度机械推到 9 分以上，而是让真实复杂度被正确边界吸收。

推荐阶段目标：

| 区域 | 目标 |
|---|---|
| Compiler 语义核心 | 9.0+ |
| Tooling / LanguageServer / Runtime contract | 8.5 到 9.0 |
| 安全性 / 文件路径 / 本地 HTTP bridge | 8.0+，逐步接近 9.0 |
| SelfHostedEditor / VSCode 宿主层 | 8.0 到 8.5 |
| 测试和回归体系 | 8.7 到 9.0 |
| 全仓库综合水平 | 8.4 到 8.6 |

9 分以上只适合用于长期稳定的核心语义层、跨宿主 contract 和低成本高风险的安全边界。宿主 UI 和开发辅助脚本不应为了分数过度抽象。

## 不可破坏的架构边界

1. `Inscape.Compiler` 是语义真相层。
   - 不在 CLI、VSCode、SelfHostedEditor、Unity 中重新实现 parser 或语义规则。
   - 新语法、新诊断、新 graph 语义优先落到 Compiler 或 Internal 共享层。

2. `Inscape.Compiler` 必须保持独立。
   - 不引用 Unity、VSCode、HTML、浏览器 API、Node 包或第三方宿主依赖。
   - 不为了某个宿主体验污染 Compiler API。

3. `src/Internal/Tooling` 是共享用例层。
   - 跨 CLI、VSCode、SelfHostedEditor 复用的扫描、定位、模型构建、审计、映射能力应下沉到 Tooling。
   - Tooling 可以组织用例，但不应吸收 UI 状态和宿主生命周期。

4. `src/Internal/LanguageServer` 是编辑器协议层。
   - 可暴露 diagnostics、completion、definition、references、hover、outline、capability 等编辑器能力。
   - 不应持有 VSCode 或 SelfHostedEditor 专属 UI 逻辑。

5. `src/ExternalSupport/*` 是宿主适配层。
   - 可以处理 UI、命令注册、source reveal、HTTP transport、临时 workspace、webview 资源。
   - 不应成为新的语义真相层。

## 什么算有效重构

一次重构只有满足以下至少一项，才算有明确收益：

- 降低跨层耦合，特别是把宿主层语义逻辑下沉到 Internal。
- 拆除大文件中的独立职责，并让新文件有清楚 ownership。
- 消除重复的 parser、path、process、HTTP、contract 或 model 逻辑。
- 增加失败路径的可观测性，而不是用空数组、null 或 fallback 静默吞掉问题。
- 增加输入边界、路径边界、进程执行边界或资源生命周期边界。
- 在不改变行为的前提下，让测试、contract check 或 smoke 更容易定位失败。

以下不算有效重构：

- 只移动代码位置，但职责和依赖方向没有改善。
- 把一个大文件拆成多个无语义命名的 helper / utils。
- 为了减少行数引入更难理解的通用抽象。
- 在没有测试护栏时顺手修改行为。
- 让宿主层绕过 Compiler / Tooling 直接推断语义。
- 为了“更干净”删除仍有设计价值的 draft、open question 或 ADR 线索。

## 评分口径

使用 10 分制，但评分必须基于证据，而不是主观观感。

| 分数 | 含义 |
|---:|---|
| 9.0 到 10.0 | 边界稳定，失败路径明确，测试护栏充分，局部修改风险低，可长期演进 |
| 8.0 到 8.9 | 整体健康，关键边界成立，存在少量可定位债务 |
| 7.0 到 7.9 | 可以持续推进，但复杂度正在累积，需要主动收口 |
| 6.0 到 6.9 | 能工作但维护成本偏高，新增功能容易扩散风险 |
| 6.0 以下 | 结构或质量机制不足，新增功能容易造成明显回归 |

建议每次重构前后至少评估：

- 架构边界 / 可演进性
- 可维护性
- 安全性
- 稳定性
- 健壮性
- 可读性
- 测试 / 回归体系
- 关键模块分层评分

## 优先级

### P0：保持行为和 contract 不变

默认先做等价重构。除非任务明确要求，不能改变：

- DSL 语法和 parser 行为
- diagnostics 语义
- LanguageServer protocol 结果
- CLI 输出 contract
- VSCode / SelfHostedEditor 已有 model contract
- HTTP smoke payload 结构
- UnitySample 可验证行为

### P1：收口宿主层复杂度

优先处理以下类型：

- 超过 1000 行且包含多个职责的开发脚本、controller、contract check。
- 同时处理 route、session、process、filesystem、payload、UI 的组合根。
- 大 CSS 文件中混杂 layout、panel、state、feature-specific 样式。
- VSCode 和 SelfHostedEditor 中重复的语义模型构建。

拆分时按业务职责命名，不按“工具箱”命名。

好命名示例：

- `SelfHostedEditorWorkspaceBridge`
- `SelfHostedEditorStaticAssetBridge`
- `PreviewLocalizationContractCheck`
- `StoryGraphPreviewController`

谨慎命名示例：

- `CommonHelpers`
- `MiscUtils`
- `SharedStuff`
- `Manager`

### P1：把共享语义下沉到 Internal

当同一语义被两个以上宿主使用时，优先考虑：

- Compiler：语法、AST、source span、semantic graph。
- Tooling：项目扫描、host schema、localization、node map、authoring model。
- Runtime：运行期 graph 消费和状态推进。
- LanguageServer：编辑器协议和语言服务查询。

宿主层只保留展示、命令、transport、临时文件和用户交互。

### P2：安全和健壮性硬化

优先补齐：

- 所有文件写入前校验最终绝对路径仍位于预期 root 下。
- HTTP JSON body size limit。
- session / cache 的 TTL、清理策略或容量上限。
- process spawn 的 timeout、cwd、参数数组、错误输出截断和用户可见状态。
- static asset 的 MIME、root containment、cache policy。
- WebView / Preview 的 CSP hardening，逐步减少 `unsafe-inline`。

### P2：测试文件和检查脚本拆分

当测试或 contract check 超过 1000 行时，优先按能力拆分：

- model shape
- transport contract
- localization
- story graph
- preview
- runtime
- source reveal
- failure cases

测试 helpers 应表达业务意图，不应隐藏断言。

## 工作流程

每次重构按以下顺序执行：

1. 读取 `docs/agent-handoff.md`、`docs/todo.md` 和相关 task 文档。
2. 查看当前 git 状态，确认已有用户改动，不回滚无关变更。
3. 识别目标文件的职责、依赖方向、测试覆盖和外部 contract。
4. 先列出本次重构的“不改变项”。
5. 小步移动代码，优先保持函数签名和 payload shape。
6. 每拆出一个模块，确认调用方向仍从宿主指向共享层，而不是反向。
7. 更新必要文档；长期决策新增 ADR。
8. 跑验证命令。
9. 输出变更说明、风险、验证结果和后续建议。

## 必跑验证

默认验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
```

修改 SelfHostedEditor 时追加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

修改 VSCode 时追加：

```powershell
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

修改 UnityPlugin 或 UnitySample 时追加：

```powershell
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-restore
```

如果因为环境原因不能运行某项验证，必须在交付说明中明确写出未运行项和原因。

## 交付标准

重构完成后，交付说明必须包含：

- 本次重构的目标。
- 哪些行为和 contract 保持不变。
- 主要文件变更。
- 架构边界是否改善。
- 安全性、稳定性、健壮性是否有提升。
- 已运行验证和结果。
- 剩余风险。
- 不建议继续拆的部分及原因。

## 禁止事项

- 禁止用 `git reset --hard`、`git checkout --` 等方式回滚用户改动，除非用户明确要求。
- 禁止在宿主层复制 parser 或语义推断。
- 禁止为了通过测试而降低 contract 检查强度。
- 禁止把失败静默改成空结果，除非同时提供可观测状态。
- 禁止在没有 root containment 的情况下写入用户文件或临时 workspace。
- 禁止把多个无关重构混在一次提交中。
- 禁止为了追求 9 分引入过度抽象。

## 推荐的重构报告模板

```text
目标：
- ...

不改变项：
- ...

完成内容：
- ...

架构影响：
- ...

验证：
- [pass] ...
- [not run] ...，原因：...

风险：
- ...

建议下一步：
- ...
```

## 当前最有价值的方向

结合当前架构状态，优先级最高的方向是：

1. 继续把 SelfHostedEditor dev host 的 API handlers 从组合根拆出。
2. 为 HTTP request body、session cache、临时 workspace 写入补齐上限和生命周期。
3. 拆分超大的 model contract check 和 localization 测试。
4. 把 package script 中过长的检查命令沉到独立脚本。
5. 继续压住 VSCode / SelfHostedEditor 重新吸收语义逻辑的趋势。

判断是否值得做的标准很简单：如果重构能降低未来功能改动的风险、减少跨层重复、增强失败可见性或加固安全边界，就值得；如果只是让文件看起来更小，但 ownership 变模糊，就不值得。

# 架构评估

状态：当前评估

评估日期：2026-06-12

本文记录对当前 Inscape 代码架构的阶段性评估。评估重点是可维护性、安全性、稳定性、健壮性、可读性，以及更适合本仓库的边界清晰度、测试回归能力和演进风险。

本评估基于当前仓库代码、文档、项目引用关系、文件体量、静态扫描和本地验证命令。当前工作树中未跟踪的 `StartLocalTest.cmd` / `StartLocalTest.ps1` 视为本地辅助脚本，未纳入架构评分。

## 评分口径

评分采用 10 分制：

- 9.0 到 10.0：边界清晰，自动化充分，修改局部功能时风险低，可作为长期稳定架构。
- 8.0 到 8.9：整体健康，关键边界成立，存在少量明确债务。
- 7.0 到 7.9：中上水平，可持续推进，但若继续扩张需要主动收口复杂度。
- 6.0 到 6.9：能工作但维护成本偏高，局部风险容易扩散。
- 6.0 以下：结构或质量机制不足，新增功能容易造成回归。

## 总体结论

整体评分：7.7 / 10

Inscape 当前不是临时原型式堆叠，而是已经进入中高水平的工具链和编辑器架构。最强项是分层意识、Compiler 边界、文档化决策和回归护栏；最大风险集中在快速生长的宿主客户端层，尤其是 SelfHostedEditor 和 VSCode 的组合根、桥接脚本、CSS 和大测试文件。

一句话判断：核心语义层比较干净，宿主层仍在生长期；只要继续把语义能力下沉到 Internal，把宿主保持为薄适配层，这个架构可以稳定演进。

## 分项评分

| 维度 | 分数 | 说明 |
|---|---:|---|
| 架构边界 / 可演进性 | 8.3 | `Internal` / `ExternalSupport` 分层清楚；默认 solution 只包含内部项目和内部测试；Compiler 无项目引用，语义真相层干净。 |
| 可维护性 | 7.6 | 文档、ADR、TODO、结构检查很强；SelfHostedEditor、VSCode 组合根、CSS 和部分测试文件偏大，仍会提高修改成本。 |
| 安全性 | 7.0 | UI 文本大多使用 `textContent` / `createTextNode`，进程调用主要使用 `execFile` / `spawn`；但 WebView / Preview CSP 仍允许 `unsafe-inline`，文件写入和路径约束还可继续硬化。 |
| 稳定性 | 8.2 | 当前构建、内部测试、外部 UnitySample 回归、VSCode parity、SelfHostedEditor HTTP smoke 全部通过，回归信号很好。 |
| 健壮性 | 7.4 | 有 BOM 处理、fallback 状态、contract violation、临时目录清理和 HTTP smoke；但部分 provider 仍以空数组 / null 降级，长期可能掩盖语义服务不可用。 |
| 可读性 | 7.1 | 核心 C# 文件短小清晰，命名和目录规则明确；大文件主要集中在宿主 UI、开发宿主脚本和聚合测试。 |
| 测试 / 回归体系 | 8.5 | 结构检查、模型契约、语义 parity、HTTP smoke 都已制度化，且当前运行速度可接受。 |

## 分层评估

| 层级 | 分数 | 判断 |
|---|---:|---|
| Compiler | 8.6 | 体量小、依赖干净、职责明确，是当前最健康的层。 |
| Tooling | 7.7 | 共享流程下沉方向正确，承载项目扫描、本地化、HostSchema、HostBinding、StoryNodeMap 等能力；复杂度正在上升，需要继续按窄模块收口。 |
| Runtime | 8.0 | 当前 `NarrativeRuntime` 小而清楚，只消费 Compiler graph，不解析源文本，边界良好。 |
| LanguageServer | 7.5 | 已覆盖 diagnostics、definition、references、completion、hover、outline 和 host capability；入口命令列表偏长，但方向正确。 |
| CLI | 6.9 | 已从大入口拆出命令，但 `CliStoryGraphCommand` 仍偏重，仍有部分流程编排可继续上提到 Tooling。 |
| VSCode | 7.2 | 主体拆分已经完成，结构检查可执行；组合根和部分 command 仍偏厚，仍需防止宿主重新吸收语义。 |
| SelfHostedEditor | 6.9 | 能力增长很快，HTTP smoke 完整；当前最大维护面，主要债务是大开发宿主脚本、大控制器和大 CSS。 |
| UnityPlugin / UnitySample | 7.3 | 已退出默认 solution，边界隔离正确；仍作为 ExternalSupport 过渡样例，不应反向污染 Internal。 |

## 主要证据

### 分层和项目引用

当前默认 solution 包含：

```text
src/Internal/Cli/Inscape.Cli/Inscape.Cli.csproj
src/Internal/Compiler/Inscape.Compiler.csproj
src/Internal/LanguageServer/Inscape.LanguageServer.csproj
src/Internal/Runtime/Inscape.Runtime.csproj
src/Internal/Tooling/Inscape.Tooling.csproj
tests/Internal/Inscape.Tests/Inscape.Tests.csproj
```

关键引用关系：

- `Inscape.Compiler` 目标框架为 `netstandard2.1`，无 `ProjectReference`。
- `Inscape.Tooling` 只引用 Compiler。
- `Inscape.Runtime` 只引用 Compiler。
- `Inscape.LanguageServer` 引用 Compiler 和 Tooling。
- `Inscape.Cli` 引用 Compiler、Runtime 和 Tooling。
- UnitySample 外部支持项目不进入默认 `Inscape.slnx`。

这个方向符合当前架构规则：Compiler 是语义真相层，Tooling 是共享用例层，CLI / VSCode / SelfHostedEditor 是宿主入口或适配层。

### 体量分布

当前非生成源码大致分布：

```text
src/Internal/Compiler             28 files,  1628 lines
src/Internal/Tooling              49 files,  5207 lines
src/Internal/Cli                   7 files,  1338 lines
src/Internal/LanguageServer       21 files,  1235 lines
src/Internal/Runtime               4 files,   274 lines
src/ExternalSupport/VSCode        47 files,  9238 lines
src/ExternalSupport/SelfHostedEditor 77 files, 17853 lines
src/ExternalSupport/UnityPlugin   25 files,  2795 lines
tests/Internal                    11 files,  4158 lines
tests/ExternalSupport              3 files,   582 lines
```

最大文件集中在宿主层和测试层：

```text
SelfHostedEditorWorkbench.css                         2956 lines
StartSelfHostedEditorPreview.js                       1781 lines
TestPreviewLocalization.cs                            1602 lines
SelfHostedEditorModelContractCheck.js                 1439 lines
StoryGraphPreviewController.js                        1025 lines
PreviewPanelController.js                             1002 lines
LocalizationAlignmentAuditDomain.cs                    878 lines
LocalizationEditorController.js                        818 lines
EditorSurfaceController.js                             813 lines
SelfHostedEditorAppEntry.js                            793 lines
CliStoryGraphCommand.cs                                771 lines
```

结论：核心语义层体量可控，维护风险主要来自宿主 UI、开发宿主脚本、CSS 和聚合测试。

## 安全性观察

正面信号：

- Preview 渲染大量使用 `document.createTextNode`、`textContent` 和 DOM API 拼装用户文本。
- VSCode 错误页和加载页对动态文本使用 `escapeHtml`。
- VSCode 进程调用主要使用 `childProcess.execFile`，SelfHostedEditor 开发宿主使用 `childProcess.spawn`，避免直接 shell 拼接。
- SelfHostedEditor dev server 对静态资源设置了 `Cache-Control: no-store`。
- SelfHostedEditor POST 请求集中经过 `parseJsonRequestBody()`，并处理 UTF-8 BOM。
- `sanitizeRelativePath()` 阻止空路径、绝对路径前缀和 `..` 片段。

风险和不足：

- Preview / VSCode WebView CSP 当前允许 `style-src 'unsafe-inline'` 和 `script-src 'unsafe-inline'`。这在本地工具阶段可理解，但不能算强安全边界。
- SelfHostedEditor 的临时 workspace 通过 `path.join(tempRoot, document.relativePath)` 写文件，虽然相对路径经过清洗，但更稳妥的做法是写入前统一校验最终 full path 仍位于 tempRoot 内。
- 部分真实文件写回能力已经存在，例如 localization line-map、node-map review backup / apply、旧 CSV 替换。当前有备份和回归，但还可以增加统一的写入策略和最终路径 guard。
- 这不是安全审计结论，只能说明当前代码有一定安全意识，仍需要专门 hardening。

## 稳定性和回归验证

本次评估期间已运行并通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-restore
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

结果摘要：

- 默认 solution 构建通过，0 warning，0 error。
- 内部测试全部通过。
- UnitySample 外部支持回归全部通过。
- VSCode structure contract 和 semantic parity contract 通过。
- SelfHostedEditor syntax、structure、model contract、semantic parity HTTP、runtime HTTP、localization review HTTP smoke 通过。
- `check:localization-review-http` 当前样例返回 170 items，payload 约 222 KB，用时约 450 ms。速度可接受，但 payload 体积应继续留意。

## 主要风险

1. SelfHostedEditor 开发宿主过厚
   - `StartSelfHostedEditorPreview.js` 同时承担 HTTP 路由、临时 workspace、session cache、payload compact、CLI / LanguageServer invocation、路径还原和业务桥接。
   - 它是当前最适合拆分的单点。

2. 宿主 UI 层增长快于抽象收口
   - SelfHostedEditor 目前有大量 controller / bridge / mapper，方向清楚，但 UI 功能增长很快。
   - 如果后续继续加功能，必须同步把可复用语义下沉到 Tooling / LanguageServer / Runtime。

3. 大 CSS 和大测试影响局部理解
   - `SelfHostedEditorWorkbench.css` 已接近 3000 行。
   - `TestPreviewLocalization.cs` 和 `SelfHostedEditorModelContractCheck.js` 也是长期维护成本点。

4. fallback 策略可能掩盖问题
   - 多处 provider 在失败时返回空数组、null 或 draft fallback。
   - 对作者体验友好，但对开发者排查不够硬。重要语义能力失败时应有更强的状态表达、日志和 contract smoke。

5. WebView / Preview 安全边界还不够硬
   - `unsafe-inline` 是当前最明显的 hardening 机会。
   - 文件写回路径 guard 也应该统一。

## 优先改进建议

### P0：保持现有架构纪律

- 继续坚持 Compiler 是语义真相层。
- VSCode / SelfHostedEditor 只做宿主适配、UI 展示、source reveal 和 command 调度。
- 新增跨宿主语义时，优先落到 Tooling / LanguageServer / Runtime。

### P1：拆分 SelfHostedEditor 开发宿主

建议从 `StartSelfHostedEditorPreview.js` 拆出：

- HTTP route registration
- request parsing / response helpers
- temporary workspace writer
- LanguageServer command runner
- CLI command runner
- Runtime session cache
- Localization baseline session cache
- Line-map session cache
- payload compact / path relativization

拆分时不改 HTTP 契约，先保持所有现有 smoke 通过。

### P1：拆分 SelfHostedEditor CSS

建议按以下方向拆：

- base / tokens
- workspace layout
- editor authoring
- preview panel
- localization
- story graph
- host capability catalog
- runtime / status

目标不是改变视觉，而是降低视觉调整的回归范围。

### P1：拆分聚合测试

优先拆：

- `TestPreviewLocalization.cs`
  - preview source / CSP / query token
  - localization extract / update
  - alignment audit
  - line-map refresh
  - presenter contract
- `SelfHostedEditorModelContractCheck.js`
  - authoring model
  - preview model
  - localization model
  - graph model
  - interaction contract

### P2：安全硬化

- WebView / Preview 引入 nonce 或 hash，逐步去掉 `script-src 'unsafe-inline'`。
- 统一文件写入 guard：解析最终绝对路径后确认仍在预期 root 下。
- 对 node-map / localization 写回保留备份、dry-run 和错误恢复路径。
- 对 dev host POST body 增加 size limit。

### P2：fallback 可观测性

- 重要语义桥失败时，不只返回空结果，还要记录 provider、错误来源和用户可见状态。
- 对 LanguageServer 不可用、CLI 失败、HTTP transport 失败分别给出不同状态。
- 已有 contract violation 的做法应继续扩展到更多关键数据契约。

## 长期目标分数

如果完成上述 P1 / P2 项，合理目标是：

```text
整体：8.3 到 8.6
Compiler：8.8+
Tooling：8.0+
VSCode：7.8+
SelfHostedEditor：7.8+
测试 / 回归：8.7+
```

不建议追求 9 分以上的“极简架构”。Inscape 同时包含 DSL、工具链、LanguageServer、Runtime、VSCode、自研编辑器、Localization、Host Bridge 和 Unity 外部支持，复杂度是业务真实存在的。更现实的目标是让复杂度被边界吸收，而不是假装它不存在。

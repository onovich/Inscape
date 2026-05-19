# ADR 0016：VSCode 语言能力使用常驻 LanguageServer 会话

状态：Accepted

日期：2026-05-19

## 背景

在 Goal 5 的第一轮迁移后，VSCode 的 diagnostics、node completion、definition、references、hover、document symbols 与 Host Schema capability 已经优先调用 `Inscape.LanguageServer`。但那一轮仍然是 probe 式接法：每次请求都可能重新走一次 `dotnet run --project ... -- --probe`。

这种方式可以验证语义已经回到 `Compiler` / `Tooling` / `LanguageServer`，但并不适合作为长期编辑器热路径：

- 第一次 Hover、Ctrl+Click、补全和诊断刷新会感到发涩。
- VSCode 更容易出现“正在加载”一类等待态。
- 选项文本这类同时叠加预览 reveal 与 jump target 导航的场景，对延迟更敏感。

项目当前没有历史用户和已发布兼容包袱，因此不应为了维持临时 probe 接法而长期承受交互成本。既然语言能力已经迁入 `LanguageServer`，下一步就应让 VSCode 真正复用常驻服务，而不是停留在“每次起进程问一次”的中间态。

## 决策

VSCode 的高频语言能力改为复用同一个常驻 `LanguageServer` stdio 会话。

当前范围包括：

- diagnostics
- node completion
- node definition
- node references
- node / jump hover
- document symbols
- Host Schema capability endpoint

实现方式：

- `src/Internal/LanguageServer` 新增 `--stdio` 入口，维持一个轻量 JSON-RPC 风格会话。
- `src/ExternalSupport/VSCode` 新增 `LanguageServerSessionClient`，按工作区和启动参数复用同一个子进程。
- VSCode provider 通过会话发请求，而不是每次重新 `dotnet run --project ... -- --probe`。
- CLI diagnostics fallback 与 CLI Host Schema fallback 继续保留，但只作为失败兜底，不再承担常态热路径。

## 不做的事

- 这次不把 preview 渲染迁进 LanguageServer。预览仍由 VSCode + CLI `preview-project` 负责。
- 这次不把 speaker / host binding / metadata hover 与导航统一迁进 LanguageServer；它们继续保留在当前作者提示边界。
- 这次不强行引入完整 `vscode-languageclient` 依赖栈。先用仓库内可控的 stdio 会话把“常驻服务”闭环做好，再决定是否要演进成更标准的 LSP transport。

## 影响

- VSCode 语言能力的长期主路径从“probe per request”切换为“daemon session per workspace / launch config”。
- `LanguageServer` 不再只是 probe 集合，而是开始承担真正的编辑器会话职责。
- 删除 CLI fallback 的前提更清晰：它们不再承担正常热路径，只保留为失败保护和显式验证边界。
- 文档、回归清单和 handoff 必须明确区分“常驻会话主路径”和“CLI fallback”。

## 验证

- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- `node --check src\ExternalSupport\VSCode\ExtensionManifestEntry.js`
- `npm --prefix src\ExternalSupport\VSCode run check:diagnostics-fallback`
- `npm --prefix src\ExternalSupport\VSCode run check:preview-navigation`
- `npm --prefix src\ExternalSupport\VSCode run check:preview-source-sync`
- `npm run rebuild:vsix`

手动验证记录：

- Goal 7 的 `off|click|selection` 真实 VSCode smoke 已通过。
- Goal 11.1 的“LanguageServer 不可用 -> CLI diagnostics fallback”真实 VSCode smoke 已通过。

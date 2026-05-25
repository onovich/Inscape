# ADR 0017：自研编辑器归属 ExternalSupport 并复用 Internal 契约

状态：Accepted

日期：2026-05-23

## 背景

Inscape 路线图已经把独立编辑器列为阶段 2 的核心目标。当前仓库也已经形成了更清晰的长期边界：

- `Compiler` 是 DSL 与 StoryGraph 的语义真相。
- `Tooling` 承接项目扫描、预览、本地化、HostSchema、HostBinding 等共享流程。
- `LanguageServer` 为编辑器热路径提供诊断、补全、跳转、引用、Hover 与大纲。
- `Runtime` 开始承载 Narrative Graph IR 的真实运行期消费。
- `VSCode` 已归属 `ExternalSupport/VSCode`，作为外部编辑器平台支持层。

自研编辑器虽然是第一方产品，但它会绑定桌面壳、前端框架、窗口生命周期、文件对话框、菜单、快捷键、打包与自动更新机制。如果把它放入 `Internal`，会再次混淆“第一方维护”和“核心语义归属”。

## 决策

自研编辑器归属：

```text
src/ExternalSupport/SelfHostedEditor
```

它与 `ExternalSupport/VSCode`、`ExternalSupport/UnityPlugin` 并列，是一个第一方维护的宿主客户端，而不是 `Internal` 核心层。

自研编辑器必须复用 `Internal` 契约：

- 编辑语义走 `LanguageServer`。
- 项目扫描、预览、本地化、HostSchema、HostBinding 等共享流程走 `Tooling`。
- 剧情运行和状态观察走 `Runtime`。
- 编译期语义只来自 `Compiler`。

自研编辑器不复用 VSCode package 内部结构，也不依赖 VSCode controller、provider、QuickPick adapter 或 Webview glue。两个编辑器宿主共享的是 `Internal` 提供的数据契约和服务，而不是彼此的 UI 代码。

## 不做的事

- 不在自研编辑器前端重新实现 DSL parser。
- 不把 Compiler 语义复制到 TypeScript / JavaScript / Rust 壳层。
- 不让自研编辑器直接依赖 UnityEngine / UnityEditor 或 Bird 项目代码。
- 不把 HTML Preview 模板当作正式 Runtime API。
- 不在第一版就承诺完整图编辑器；节点图第一版优先只读。

## 影响

- `docs/editor-design.md` 中的“第三阶段迁移到 Monaco Editor 独立编辑器”应理解为建立 `ExternalSupport/SelfHostedEditor` 宿主，而不是把 VSCode 改造成独立产品。
- VSCode 仍保留为专业编辑入口和语言功能验证场。
- 任何同时被 VSCode 与 SelfHostedEditor 需要的 report model、presenter model、query contract 或定位契约，应优先下沉到 `Tooling` 或 `LanguageServer`。
- `Runtime` 的优先级提高：自研 Player 不应继续依赖 HTML Preview 来模拟运行时。
- 后续如果采用 Tauri，Rust 壳只承担系统集成；Inscape 业务语义仍保留在 Internal。

## 验证

- 仓库不新增 `src/Internal/SelfHostedEditor`。
- 自研编辑器实现时，`Compiler` 不出现 SelfHostedEditor、VSCode、Tauri、HTML UI、Unity 等依赖。
- 自研编辑器打开项目、诊断、预览、CSV、本地化审查和源位置跳转时，优先通过 `LanguageServer` / `Tooling` / `Runtime` 获取数据。
- VSCode 与 SelfHostedEditor 可以并存，并通过同一批 Internal 契约获得一致结果。

## 关联文件

- [自研编辑器架构方案](../self-hosted-editor-architecture-plan.md)
- [代码结构规划](../code-structure.md)
- [编码与命名规范](../coding-conventions.md)
- [编辑器设计草案](../editor-design.md)
- [路线图](../roadmap.md)

# VSCode Directory Naming Audit

状态：执行中

日期：2026-05-18

## 结论

`src/ExternalSupport/VSCode` 是当前正确根路径。它直接表达 ExternalSupport 下的 VSCode 平台支持，不再需要 `EditorExtensions` 类别层，也不需要 `vscode-inscape` 包名目录。

VSCode package 内部目录仍有不符合命名规范的部分。下一轮不应直接推进新功能，而应先按本审计收敛目录主语、角色后缀和资源 / 脚本边界。

2026-05-18 更新：资源 / 脚本目录收口已完成，旧 `media`、`schemas`、`snippets`、`syntaxes`、`scripts` 已迁入 `Resources/*` 与 `Scripts`；`language-configuration.json` 已迁入 `Resources/Language`。`ExtensionEntry` 已收敛为复数 Role 目录 `Entries`。`PreviewWebview` 已收敛为业务主语目录 `Preview`，内部按 `Providers` / `Controllers` 分角色。`DslScript` providers / diagnostics 已从 `LanguageFeatures` 与 `WorkspaceIndex` 收敛到 `DslScript/Providers` 与 `DslScript/Controllers`。`EditorAuthoring` providers 已从 `LanguageFeatures` / `WorkspaceIndex` 收敛到 `EditorAuthoring/Providers`，`LanguageFeatures` 过渡目录已删除。`HostBinding` 与 `HostSchema` providers 已从 `WorkspaceIndex` 收敛到各自业务目录，`WorkspaceIndex` 过渡目录已删除。根级 `Commands` 已按业务迁入 `EditorAuthoring` / `Preview` / `HostSchema` / `Localization` 的 `Commands` 目录。

## 当前目录判断

| 当前目录 | 判断 | 原因 | 建议 |
| --- | --- | --- | --- |
| `DslScript` | 保留 | 业务主语明确，承载 DslScript authoring providers 与 diagnostics controllers | 保持只做作者体验适配，不重写 Compiler 语义 |
| `EditorAuthoring` | 保留 | 业务主语明确，承载 VSCode 作者工具通用数据和位置 provider | 保持只做 VSCode authoring 适配，共享项目加载继续下沉 Tooling |
| `HostBinding` | 保留 | 业务主语明确，承载 Host Bridge / host binding 作者提示 | 继续只做 VSCode authoring 适配 |
| `HostSchema` | 保留 | 业务主语明确，承载 Host Schema capability 作者提示 | 继续复用 Internal Tooling / CLI capability contract |
| `Localization` | 保留 | 业务主语明确，承载 VSCode localization command 入口 | 只做 VSCode 命令适配，抽取 / 更新语义继续下沉 Internal Tooling |
| `Preview` | 保留 | 业务主语明确，VSCode webview 技术细节不再占据顶层目录名 | 继续保持 `Providers` / `Controllers` / `Bridges` 角色目录 |
| `Entries` | 保留 | 复数 Role 目录，承载 VSCode extension activate / deactivate 与注册装配边界 | 保持薄入口，不承载 feature 行为 |
| `Resources` | 保留 | VSCode 是未来可独立发布 extension package，非源码资源已按模块根内资源边界收口 | 继续保持 `Language`、`Media`、`Schemas`、`Snippets`、`Syntaxes` 子目录 |
| `Scripts` | 保留 | VSCode package-only 开发脚本已与源码目录分离 | 继续只放该 package 的打包 / 安装脚本 |

## 执行顺序

1. 已完成：先收敛资源 / 脚本目录：`media`、`schemas`、`snippets`、`syntaxes`、`scripts`。
2. 已完成：收敛 `ExtensionEntry` 到 `Entries`。
3. 已完成：拆 `PreviewWebview` 到 `Preview/*`。
4. 已完成：先把 DslScript providers / diagnostics 从 `LanguageFeatures` 与 `WorkspaceIndex` 收敛到 `DslScript/*`。
5. 已完成：拆 EditorAuthoring providers 到 `EditorAuthoring/Providers` 并删除 `LanguageFeatures`。
6. 已完成：拆剩余 `WorkspaceIndex` 到 `HostBinding/Providers` 与 `HostSchema/Providers` 并删除 `WorkspaceIndex`。
7. 已完成：迁 `Bridges/PreviewRevealBridge` 到 `Preview/Bridges`，删除根级 `Bridges`。
8. 已完成：拆根级 `Styles` 到 `EditorAuthoring` / `Preview`，并将 `StyleDefaults.js` 拆为带 `Model` 后缀的默认值文件。
9. 已完成：拆根级 `Commands` 到 `EditorAuthoring` / `Preview` / `HostSchema` / `Localization` 的 `Commands` 目录。
10. 已完成：`extension.js` 明确为 `package.json` 的 VSCode manifest main 入口例外，只允许承载 activation、依赖装配和注册 glue。
10. 每一步都要同步 VSCode `require()`、`package.json` 资源路径、README、回归命令和测试路径。

## 自检规则

- 不引入新的类别层。
- 不使用单数 Role 目录。
- 不用 `Workspace` 作为长期主语前缀。
- 资源、脚本和源码在 VSCode package 根内可一眼区分。
- VSCode 目录只承载 VSCode 平台支持；可共享语义继续下沉到 Internal `LanguageServer` / `Tooling`。

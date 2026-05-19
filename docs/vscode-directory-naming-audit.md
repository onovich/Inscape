# VSCode Directory Naming Audit

状态：执行中

日期：2026-05-18

## 结论

`src/ExternalSupport/VSCode` 是当前正确根路径。它直接表达 ExternalSupport 下的 VSCode 平台支持，不再需要 `EditorExtensions` 类别层，也不需要 `vscode-inscape` 包名目录。

VSCode package 内部目录仍有不符合命名规范的部分。下一轮不应直接推进新功能，而应先按本审计收敛目录主语、角色后缀和资源 / 脚本边界。

2026-05-18 更新：资源 / 脚本目录收口当时只完成了“把旧资源桶和脚本桶从散乱根目录迁走”的阶段目标。2026-05-19 重新澄清后，这个阶段性结论需要修正：`Scripts` 不能再被理解成“package-only 开发脚本目录”。为避免与最终口径冲突，当前开发脚本桶已临时改名为 `DevScripts`；而 `Preview`、`Localization`、`EditorAuthoring`、`DslScript` 等业务源码目录继续与它平级，这仍不符合最终口径。若 VSCode 模块决定采用 `Resources` / `Scripts` 二分，则这些业务源码目录应进入 `Scripts` 之下，当前结构应视为待迁移状态。

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
| `Resources` | 保留 | VSCode 是未来可独立发布 extension package，需要明确资源侧根 | 继续保持 `Language`、`Media`、`Schemas`、`Snippets`、`Syntaxes` 子目录 |
| `DevScripts` | 过渡保留 | 只是临时承载 package-local 开发脚本，避免与最终 `Scripts` 语义冲突 | 等 `Scripts` 变成代码侧父层后，再评估是否保留为独立开发脚本桶 |

## 执行顺序

1. 已完成：先收敛资源 / 脚本目录：`media`、`schemas`、`snippets`、`syntaxes`、`scripts`。
2. 已完成：收敛 `ExtensionEntry` 到 `Entries`。
3. 已完成：拆 `PreviewWebview` 到 `Scripts/Preview/*`。
4. 已完成：先把 DslScript providers / diagnostics 从 `LanguageFeatures` 与 `WorkspaceIndex` 收敛到 `Scripts/DslScript/*`。
5. 已完成：拆 EditorAuthoring providers 到 `Scripts/EditorAuthoring/Providers` 并删除 `LanguageFeatures`。
6. 已完成：拆剩余 `WorkspaceIndex` 到 `Scripts/HostBinding/Providers` 与 `Scripts/HostSchema/Providers` 并删除 `WorkspaceIndex`。
7. 已完成：迁 `Bridges/PreviewRevealBridge` 到 `Scripts/Preview/Bridges`，删除根级 `Bridges`。
8. 已完成：拆根级 `Styles` 到 `EditorAuthoring` / `Preview`，并将 `StyleDefaults.js` 拆为带 `Model` 后缀的默认值文件。
9. 已完成：拆根级 `Commands` 到 `EditorAuthoring` / `Preview` / `HostSchema` / `Localization` 的 `Commands` 目录。
10. 已完成：`extension.js` 明确为 `package.json` 的 VSCode manifest main 入口例外，只允许承载 activation、依赖装配和注册 glue；但该命名是否仍应保留为长期例外，需在后续迁移中重新评估。
11. 新增：决定 VSCode 是否正式采用 `Resources` / `Scripts` 二分终局；若采用，则把当前平级业务源码整体迁入 `Scripts` 下，并同步 `require()`、`package.json`、README、验证脚本与测试路径；当前 `DevScripts` 只是避免语义冲突的过渡名。
12. 新增：清点并重命名不符合当前命名法的历史例外文件，例如 `check-preview-source-sync-modes.js`、`assert-preview-navigation-contract.js`、`preview-template.html`、`extension.js`。

## 自检规则

- 不引入新的类别层。
- 不使用单数 Role 目录。
- 不用 `Workspace` 作为长期主语前缀。
- 资源、脚本和源码在 VSCode package 根内可一眼区分。
- VSCode 目录只承载 VSCode 平台支持；可共享语义继续下沉到 Internal `LanguageServer` / `Tooling`。

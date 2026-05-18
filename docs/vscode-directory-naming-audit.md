# VSCode Directory Naming Audit

状态：执行中

日期：2026-05-18

## 结论

`src/ExternalSupport/VSCode` 是当前正确根路径。它直接表达 ExternalSupport 下的 VSCode 平台支持，不再需要 `EditorExtensions` 类别层，也不需要 `vscode-inscape` 包名目录。

VSCode package 内部目录仍有不符合命名规范的部分。下一轮不应直接推进新功能，而应先按本审计收敛目录主语、角色后缀和资源 / 脚本边界。

2026-05-18 更新：资源 / 脚本目录收口已完成，旧 `media`、`schemas`、`snippets`、`syntaxes`、`scripts` 已迁入 `Resources/*` 与 `Scripts`；`language-configuration.json` 已迁入 `Resources/Language`。`ExtensionEntry` 已收敛为复数 Role 目录 `Entries`。

## 当前目录判断

| 当前目录 | 判断 | 原因 | 建议 |
| --- | --- | --- | --- |
| `Commands` | 保留 | Role 复数目录，承载 VSCode command 入口，符合规范 | 后续只检查文件主语是否清楚 |
| `Bridges` | 保留 | Role 复数目录，承载 VSCode 与 preview / editor 之间的桥接 | 后续只检查是否存在可下沉到 Tooling 的逻辑 |
| `Styles` | 暂保留 | Role / feature 之间略混，但承载样式控制器与默认样式，当前可读 | 后续资源拆分时再决定是否并入 `EditorAuthoring` 或 `Preview` |
| `LanguageFeatures` | 需改 | 这是 VSCode API 分类，不是 Inscape 业务主语；内部混有 DslScript provider 与 EditorAuthoring location provider | 拆为更业务化目录，例如 `DslScript/Providers` 与 `EditorAuthoring/Providers` |
| `WorkspaceIndex` | 需改 | `Workspace` 不应作为类型名前缀，`Index` 只是二级限定；该目录混合 DslScript 扫描、HostBinding、HostSchema capability 和 EditorAuthoring data | 拆为 `DslScript/Providers`、`HostBinding/Providers`、`HostSchema/Providers`、`EditorAuthoring/Providers` |
| `PreviewWebview` | 需改 | 业务主语和平台角色压在一个目录名里，且 `Webview` 是 VSCode UI 技术，不应遮住 `Preview` 主语 | 改为 `Preview/Providers`、`Preview/Controllers` 或 `Preview/Bridges` |
| `Entries` | 保留 | 复数 Role 目录，承载 VSCode extension activate / deactivate 与注册装配边界 | 保持薄入口，不承载 feature 行为 |
| `Resources` | 保留 | VSCode 是未来可独立发布 extension package，非源码资源已按模块根内资源边界收口 | 继续保持 `Language`、`Media`、`Schemas`、`Snippets`、`Syntaxes` 子目录 |
| `Scripts` | 保留 | VSCode package-only 开发脚本已与源码目录分离 | 继续只放该 package 的打包 / 安装脚本 |

## 执行顺序

1. 已完成：先收敛资源 / 脚本目录：`media`、`schemas`、`snippets`、`syntaxes`、`scripts`。
2. 已完成：收敛 `ExtensionEntry` 到 `Entries`。
3. 再拆 `PreviewWebview` 到 `Preview/*`。
4. 再拆 `LanguageFeatures` 与 `WorkspaceIndex`，优先按 `DslScript`、`HostBinding`、`HostSchema`、`EditorAuthoring` 分业务。
5. 每一步都要同步 VSCode `require()`、`package.json` 资源路径、README、回归命令和测试路径。

## 自检规则

- 不引入新的类别层。
- 不使用单数 Role 目录。
- 不用 `Workspace` 作为长期主语前缀。
- 资源、脚本和源码在 VSCode package 根内可一眼区分。
- VSCode 目录只承载 VSCode 平台支持；可共享语义继续下沉到 Internal `LanguageServer` / `Tooling`。

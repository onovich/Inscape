# VSCode / SelfHostedEditor 功能对齐盘点

状态：工作清单

最后更新：2026-06-01

本文用业务语言记录 VSCode 扩展与 SelfHostedEditor 自研编辑器之间的能力差异。目标不是让两边 UI 长得一样，而是让作者在两边处理同一类写作任务时不会遇到“这里能做、那里完全断掉”的落差。

## 当前结论

SelfHostedEditor 近期主线继续优先，但 VSCode 不应退化成历史入口。两边应共享 `LanguageServer` / `Tooling` / `Runtime` 的真实契约，并按功能 parity 补齐差异。

2026-06-01 已收口第一项：SelfHostedEditor 现在通过开发宿主读取 `LanguageServer --host-schema-capabilities-project`，补上 `[query]` 与 `@emit` 的 completion / hover。业务上这意味着作者在自研编辑器里写“读宿主变量”和“发宿主事件”时，已经能看到和 VSCode 同源的候选与说明。

2026-06-01 已收口第二项：SelfHostedEditor 现在通过 `LanguageServer --host-binding-capabilities-project` 补上 speaker 与 `@timeline` 的 completion / hover。候选来自共享 Tooling Host Binding capability，包含配置好的 Host Bridge 行和当前 workspace 编译出来的 speaker / timeline 出现位置；浏览器端不再需要复制 VSCode 的 `.host.bridge.json` 解析。

2026-06-01 已收口第三项：同一 Host Binding capability 现在也承载 speaker / `@timeline` 的导航位置。SelfHostedEditor 的 Ctrl+Click、definition provider 和 references provider 会优先跳到 Host Bridge 映射行，并保留 workspace 出现位置用于 references；dev-host 会把临时 workspace 路径还原成项目相对路径，避免前端拿临时目录当源码真相。

2026-06-01 已收口第四项：SelfHostedEditor 现在有 `Node Map` 入口，会通过开发宿主调用共享 CLI `update-node-map-project --report`，展示 `renamed / new / missing / conflict / manual-review` 摘要和审查项，支持跳到当前标题 / 候选标题源码，并可下载生成的 `inscape.node-map.json`。浏览器端不复制 VSCode 里的 candidate apply 逻辑；这类 node map 变更语义后续应先下沉为 Internal 共享能力，再让两边消费。

2026-06-01 已收口第五项：SelfHostedEditor L10N 表格现在保留 Tooling presenter 里的 review actions，并在每行提供 `Current` / `Candidate` / `Diff` 轻量动作。作者可以从表格跳当前行、跳候选旧文本来源，并展开候选 diff；前端只展示和导航，不重算 alignment、candidate scoring 或 CSV 语义。`/api/localization-review` 继续裁掉完整 audit report，只保留 compact presenter payload。

2026-06-01 已收口第六项：SelfHostedEditor 现在新增 `Host` 视图，展示同源 Host Schema / Host Binding capability catalog。作者可以看到 query、event、speaker、timeline binding 清单，并从条目来源按钮跳到 schema、bridge 或脚本出现位置；前端不解析 Host Schema / Host Bridge JSON，只消费既有 `/api/host-schema-capabilities` 与 `/api/host-binding-capabilities`。

当前优先级：

1. 先守住 SelfHostedEditor 已有工作流：打开项目 / 编辑 / 预览 / Runtime 推进 / L10N review-update 写回。
2. 再补 VSCode 与 SelfHostedEditor 的功能不一致，优先补作者每天会用到的编辑提示、跳转、审查入口。
3. Graph 设计优化暂时降级，只保留“不回退已完成能力”的维护要求。
4. Unity / Bird 支持继续低优先级，只做准备和决策。

## 已基本对齐

### 脚本编辑基础

- 两边都支持 `.inscape` 脚本编辑。
- 两边都识别 `# 标题`、对白、旁白、prompt、choice、jump、metadata、query token。
- 两边都通过 `LanguageServer` 或开发宿主桥获取 diagnostics、completion、definition、references、hover、document symbols。
- 两边都支持未保存内容参与语义查询：VSCode 通过 LanguageServer 会话 / override，SelfHostedEditor 通过当前 workspace 文档 payload。

### 源码定位与预览联动

- VSCode 支持 Ctrl+Click / preview reveal / source badge 回跳。
- SelfHostedEditor 支持编辑器定位后刷新 Preview block，Preview choice / continue 后回到对应源码标题。
- 两边都不能回退到“Preview 跳了但源码不动”或“源码动了但 Preview 悄悄显示旧块”的状态。

### 本地化底层语义

- 两边都不应在宿主侧重新实现 CSV / alignment 语义。
- VSCode 通过 CLI / Tooling 执行 export、update、alignment review。
- SelfHostedEditor 通过 `/api/localization-review` 与 `/api/localization-update` 消费同一类 Tooling / CLI 结果。

## VSCode 目前更完整

这些能力 SelfHostedEditor 需要后续补齐或明确替代方式。

### 1. Host Schema / Host Bridge 作者提示

VSCode 已有：

- `[query.path]` completion / Hover。
- `@emit eventName` completion / Hover。
- `@timeline...` host binding completion / Hover / Ctrl+Click。
- speaker completion / Hover / Go to Definition / Find All References。
- `Inscape: Show Host Schema Capabilities`。

SelfHostedEditor 已补齐：

- `[query.path]` completion / Hover，经由开发宿主调用共享 LanguageServer Host Schema capability。
- `@emit eventName` completion / Hover，经由同一 Host Schema capability。
- speaker completion / Hover / Go to Definition / Find All References，经由共享 LanguageServer Host Binding capability。
- `@timeline...` completion / Hover / Ctrl+Click / references，经由同一 Host Binding capability。

SelfHostedEditor 仍缺：

- 无。SelfHostedEditor 已用 `Host` 视图提供等价查看入口，UI 不是 Quick Pick，但展示同源 query / event / speaker / timeline 清单和 source jump。

建议下一步：继续守 `check:host-schema` / `check:host-schema-http` / `check:host-binding` / `check:host-binding-http`，避免 Host 视图退回宿主侧 JSON 解析。

### 2. Stable Node Map 工作流

VSCode 已有：

- `Insert Node Title`。
- `Update Stable Node Map`。
- `Review Stable Node Map Changes`。
- rename/manual-review/conflict/missing report 的 Quick Pick 审查入口。

SelfHostedEditor 已补齐：

- `Node Map` 显式入口。
- 通过 `/api/node-map-review` 调用共享 CLI `update-node-map-project --report`。
- 轻量 review 面板展示 `new / renamed / manual-review / conflict / missing`。
- 当前标题与候选标题可跳源码。
- 生成后的 `inscape.node-map.json` 可下载，用于浏览器壳无法直接写 sidecar 的阶段。

SelfHostedEditor 仍缺：

- VSCode 当前已有的 `Apply candidate stable id` / dry-run preview / revert 操作。该能力不应在 SelfHostedEditor 里复制一套前端 mutation；如果两边都需要，应先收成 Internal / Tooling 共享动作。

### 3. CodeLens / 引用入口

VSCode 已有节点标题 CodeLens，显示 `N 个引用` 并打开 References Peek。

SelfHostedEditor 已有标题旁 refs 浮层，但不是同一套 CodeLens 心智；业务上接近，但需要确认：

- 跨文件引用是否完整。
- 未保存 workspace 文档是否都参与。
- 与 VSCode References Peek 展示的信息是否等价。

建议下一步：把 refs overlay 作为 SelfHostedEditor 的等价入口，不强行实现 CodeLens 样式；重点验证跨文件与未保存内容。

2026-06-02 已收口：SelfHostedEditor refs overlay 继续作为 VSCode CodeLens / References Peek 的业务等价入口。`/api/references` 仍调用 `LanguageServer --references-project`，并把 dev-host 临时目录 `sourcePath` 还原为 workspace 相对路径；新增 `check:references` 与 `check:references-http` 覆盖跨文件引用、当前未保存 draft 内容参与引用查询、引用数量以及返回路径不泄漏临时目录。UI 不复制 CodeLens，守的是作者能看到同一组引用并跳到同一批源码位置。

### 4. Preview source sync 模式

VSCode 有 `inscape.preview.sourceSyncMode = off|click|selection|debug`。

SelfHostedEditor 目前是自研工作台内的固定联动模型，没有显式 source sync 模式。

建议下一步：不急着照搬设置项。先确认业务是否真的需要 off / selection；如果需要，作为 SelfHostedEditor 偏好设置，而不是让前端产生第二套预览真相。

## SelfHostedEditor 目前更完整

这些能力 VSCode 不一定要复制 UI，但需要确认是否需要业务等价。

### 1. Runtime-backed 阅读体验

SelfHostedEditor 已把 Preview choice / continue、Back、节点内 Flow advance / rewind 接到共享 Runtime。

VSCode Preview 仍主要是 CLI 生成的 HTML preview，虽然能 click choices、Back、Restart，但不是当前这条 Runtime-backed workbench 状态链。

建议下一步：先不强行重做 VSCode Preview。只需明确 VSCode Preview 是“调试预览”，SelfHostedEditor Player 是“未来主 Runtime 体验”。如果需要业务一致，先从共享 Runtime HTML payload 或 Runtime-backed preview endpoint 评估。

### 2. L10N 表格编辑与写回

SelfHostedEditor 已有：

- 选择真实旧 CSV。
- review 状态筛选。
- review actions：跳当前行、跳候选来源、展开候选 diff。
- session draft overrides。
- export updated CSV。
- native file handle 下直接 Replace previous CSV。
- linked clean / unsaved 状态。

VSCode 已有 export/update/review 命令和 Quick Pick alignment review，但没有像 SelfHostedEditor 这样的表格式持续编辑 / 写回体验。

建议下一步：不必在 VSCode 复刻整张表。VSCode 可以保持命令式入口；但应确认它至少能做到 review candidate、source jump、update old CSV 的核心闭环。

### 3. 沉浸式写作表面

SelfHostedEditor 的产品目标是写作桌面，侧栏、状态、诊断、预览都更低干扰。

VSCode 是专业编辑器，不需要一致视觉。但两边语义能力要一致：补全、跳转、引用、诊断、hover、rename、localization review 不能因为宿主不同而给出矛盾结果。

## 当前不一致清单

| 能力 | VSCode | SelfHostedEditor | 优先级 |
| --- | --- | --- | --- |
| Diagnostics | LanguageServer 常驻会话 + CLI fallback | dev-host HTTP + LanguageServer probe + fallback | 高，保持 |
| Completion: node jump | 支持跨文件与未保存内容 | 已接 project probe，需继续验证跨文件 | 高 |
| Host Schema / Host Binding capability 查看 | 命令面板查看 query / event，并能打开 schema 来源 | `Host` 视图展示 query / event / speaker / timeline，并能跳 schema / bridge / script 来源 | 已对齐，守回归 |
| Completion: speaker | 支持 hostBridge / workspace fallback | 已通过 dev-host + LanguageServer Host Binding capability 对齐 | 已对齐，守回归 |
| Completion: `[query]` | 支持 Host Schema query | 已通过 dev-host + LanguageServer Host Schema capability 对齐 | 已对齐，守回归 |
| Completion: `@emit` | 支持 Host Schema event | 已通过 dev-host + LanguageServer Host Schema capability 对齐 | 已对齐，守回归 |
| Completion/Hover: `@timeline` | 支持 Host Bridge | 已通过 dev-host + LanguageServer Host Binding capability 对齐 | 已对齐，守回归 |
| Definition / References: node | LanguageServer project navigation | 已接 project probe，refs overlay 已有 | 高，继续验证 |
| Definition / References: speaker | 支持 hostBridge + workspace references | 已通过 Host Binding capability 对齐 | 已对齐，守回归 |
| Definition / References: `@timeline` | 支持 Host Bridge / workspace hook | 已通过 Host Binding capability 对齐 | 已对齐，守回归 |
| Hover: metadata | VSCode 有 authoring hint | SelfHostedEditor 主要走 LS node/jump hover | 中 |
| Outline | LanguageServer | LanguageServer bridge | 高，保持 |
| CodeLens / refs count | 有 CodeLens | 有 refs overlay，不同 UI；refs direct/HTTP smoke 已覆盖跨文件、未保存 draft 与相对 sourcePath | 已确认等价，守回归 |
| Stable node map update/review | 有命令与 review UI，含 apply/revert | 已有 Node Map 入口、共享 report、source jump、sidecar 下载；apply/revert 未对齐 | 中，下一步先评估 shared apply 契约 |
| Localization export/update | 有命令 | 有表格 + update/export/replace | 高，保持 |
| Localization alignment review | Quick Pick review | 表格 review/filter | 高，确认状态语义一致 |
| Localization candidate diff/actions | VSCode 有 candidate 二级动作 | SelfHostedEditor 已消费 Tooling presenter actions，支持 current/candidate source jump 与 diff 展开 | 已对齐，守回归 |
| Line identity debug | VSCode debug hover | SelfHostedEditor hint rail 显示真实 line id | 中 |
| Preview static reading | 有 HTML preview | 有 workbench preview | 高，保持 |
| Preview Flow / Runtime step | HTML preview 非主 Runtime 会话 | Runtime-backed Flow | 中，VSCode 可暂不追 |
| Source sync modes | off/click/selection/debug | 无显式模式 | 低到中 |
| Graph view | 无等价主功能 | SelfHostedEditor 已有 | 低，按用户要求降级 |
| Unity / Bird | 外部支持命令 / docs | 不进入核心 | 低 |

## 建议实施顺序

1. 先跑并修 SelfHostedEditor 回归：`check:syntax`、`check:structure`、`check:model`、`check:localization-review-http`、`check:localization-update-http`、`check:runtime-http`。
2. 做 VSCode / SelfHostedEditor 语义 parity smoke：用同一组脚本验证 diagnostics、node completion、definition、references、hover、outline 在两边结果一致。References 第一刀已完成 SelfHostedEditor direct / HTTP smoke，后续继续补到更完整的两端语义 parity smoke。
3. 已补 SelfHostedEditor Host Schema 作者提示第一版：query、event 的 completion / hover；继续守 `check:host-schema` 与 `check:host-schema-http`。
4. 已补共享 Host Binding capability，并完成 SelfHostedEditor speaker、timeline binding 的 completion / hover / navigation；继续守 `check:host-binding` 与 `check:host-binding-http`。
5. 已补 SelfHostedEditor speaker / timeline navigation，让 Ctrl+Click / definition / references 消费同一 Host Binding capability。
6. 已补 SelfHostedEditor 的 stable node map update / review 入口；继续守 `check:node-map` 与 `check:node-map-http`。
7. 已补 L10N review actions parity：SelfHostedEditor 表格 review 现在消费 Tooling presenter actions，支持 VSCode 已有的 current / candidate source jump 与 candidate diff 信息。
8. 已补 Host Schema / Host Binding capability 查看入口：SelfHostedEditor `Host` 视图消费共享 capability catalog，不复制 VSCode Quick Pick UI 或 JSON 解析。
9. 评估 Stable Node Map candidate apply 是否需要下沉为共享 Tooling 动作，而不是让 VSCode / SelfHostedEditor 各自修改 sidecar。
10. 继续整理 Editor Backend 会话边界：把 workspace、runtime、line-map、localization baseline 从“一次请求一套临时上下文”收向“打开项目后持续存在的会话”。
11. Graph 与 Unity / Bird 暂不进入近期主线，只保留回归不倒退。

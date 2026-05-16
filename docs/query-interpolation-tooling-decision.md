# Query Interpolation Tooling Decision

状态：草案，F1.10 工具原型决策

最后更新：2026-05-16

本文决定是否先在 VSCode / LanguageServer 中实现 `[]` 简单路径查询插值提示原型。它基于 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md) 和 [Query Interpolation Data Contract](query-interpolation-data-contract.md)。

## 结论

可以先做 VSCode 轻量原型，但必须限制为作者提示层：

```text
Host Schema -> VSCode completion / hover / info-warning
Compiler -> unchanged
LanguageServer -> later reuses the same contract
```

第一步不改 Compiler，不改变 `.inscape` 编译结果，不让缺失 Host Schema 阻止作者写作。

## 为什么先做 VSCode

当前 VSCode 扩展已经具备：

- `inscape.config.json` 读取。
- `hostSchema` JSON 浏览命令。
- Completion / Hover provider 注册。
- Host Bridge / legacy binding 的 authoring hint 模型。

因此，最小原型可以沿用现有扩展架构，只新增一个窄职责 provider，用于读取 Host Schema query 并识别正文里的简单 `[query.path]`。这比直接改 Compiler 或 Runtime 风险低，也能最快验证作者是否真的需要这种提示。

## 暂不先做 Compiler

Compiler 当前仍把正文作为文本处理。F1.10 不应让 Compiler 读取 Host Schema，原因是：

- Host Schema 是宿主能力清单，不是 DSL 语义真相。
- 没有宿主配置时，作者仍应能编译和预览叙事图。
- 查询失败、异步、fallback 和 Runtime Host 调用策略都尚未进入实现阶段。
- 旧 `[kind: alias]` 兼容行为还存在，过早把 `[]` 全部语义化容易扩大迁移风险。

## 暂不先做 LanguageServer

LanguageServer 已有基线，但当前 VSCode 仍承担大量轻量 authoring hint。查询插值更适合作为 VSCode 原型先验证：

- 正则范围识别和 Hover 文案可以先在 JS 侧快速试错。
- 只消费 Host Schema，不需要引入新 C# 模型。
- 原型稳定后，再把数据对象和 provider 行为迁到 LanguageServer。

LanguageServer 后续接手时，应复用 `query-interpolation` 对象形态，而不是发明另一套字段。

## 第一版 VSCode 原型范围

建议拆成后续小节点：

1. 新增 `WorkspaceIndex/DslScriptQueryInterpolationProvider.js`。
2. 从当前工作区 `inscape.config.json` 的 `hostSchema` 读取 `queries[]`。
3. 只识别简单路径插值：`[itemName]`、`[player.gold]`、`[delta.affection]`。
4. 排除带冒号的 legacy `[kind: alias]`，继续交给 `HostBindingProvider`。
5. 在 `[` 后或 `[partial` 位置提供 query 补全。
6. 在 `[query]` 上提供 Hover：
   - 已知 query：显示 returnType、isAsync、description 和 Host Schema 来源。
   - 未知 query：显示 info/warning 级说明，不说这是编译错误。
7. 不做 Ctrl+Click，不跳转到 Host Schema；跳转可留到确认需求后再做。
8. 不修改 TextMate grammar、Compiler、preview HTML、localization CSV。

## 提示文案边界

Hover / completion 文案必须保持这个口径：

- `[]` 是只读查询 / 文本插值。
- Host Schema 是作者提示来源。
- 未声明 query 不等于 Compiler 错误。
- 异步 query 和 fallback 策略由 Runtime Host 或后续数据契约决定。
- 带冒号的 `[kind: alias]` 是 legacy inline host binding fallback，不是新查询插值。

## 推荐诊断级别

第一版不要新增 VSCode Problems 诊断。原因是 unknown query 可能只是项目尚未配置 Host Schema，或者作者先写脚本再补桥接。

推荐顺序：

1. Completion / Hover。
2. 可选的轻量 inline message 或 Hover warning。
3. 后续再考虑 workspace audit 命令。
4. 最后才考虑 LanguageServer diagnostics。

## 自检规则

实现原型时必须确认：

- 没有新增 Compiler 依赖。
- 没有改变 `diagnose-project` 输出。
- 没有改变本地化提取结果。
- 没有把 legacy `[timeline: alias]` 当成 query。
- 没有把 Host Schema 缺失当成编译失败。
- 修改 VSCode 后跑 `node --check`、JSON parse、`npm run rebuild:vsix`，并按扩展回归清单手动验证。

## F1.10 自检结论

- 本决策只决定原型入口，不实现行为。
- 下一步可以切 F1.11：新增 VSCode query interpolation provider 的读取和范围识别骨架。
- F1.12 再接入 completion / hover。
- F1.13 再评估是否迁到 LanguageServer 或增加 workspace audit。

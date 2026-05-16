# Query Interpolation Host Schema Reading Decision

状态：草案，F1.15 读取归属决策

最后更新：2026-05-16

本文决定 `[]` 查询插值后续所需的 Host Schema query 读取逻辑应落到哪里。它承接 [Query Interpolation Workspace Audit](query-interpolation-workspace-audit.md)，目标是避免 VSCode、CLI、LanguageServer 各自复制 `inscape.config.json` / Host Schema JSON 读取语义。

## 结论

Host Schema query 读取与归一化应优先落到 `Inscape.Tooling`，而不是 `Inscape.LanguageServer`。

```text
Tooling owns project config + Host Schema reading.
CLI consumes Tooling for explicit audit commands.
VSCode may keep the current JS prototype temporarily.
LanguageServer later consumes Tooling contracts after LSP behavior is stable.
Compiler remains unchanged.
```

## 为什么是 Tooling

`Inscape.Tooling` 已经承担跨工具链的项目级流程：项目源扫描、配置读取、Host Schema 模板、Host Binding、本地化和预览相关数据。Host Schema query 读取属于同一类工作：它是工具链输入，不是 DSL 编译语义。

放在 Tooling 的好处：

- CLI audit 可以直接复用，避免把 JSON 读取写在命令入口里。
- LanguageServer 未来可以复用同一契约，不需要复制 VSCode 的 JS 正则和配置解析。
- VSCode 原型可以先保持轻量，等 audit 稳定后再迁移或桥接。
- Compiler 继续不依赖 Host Schema，保持语义真相边界清楚。

## 为什么不是 LanguageServer

LanguageServer 当前基线主要是 Compiler-backed 能力：diagnostics、definition、references、node completion。Host Schema query 读取不是 Compiler 产物，而是项目配置和宿主能力清单。

过早放进 LanguageServer 的风险：

- 会让 LanguageServer 变成项目配置 service，吞掉 Tooling 边界。
- CLI audit 仍然需要另一套读取逻辑，导致重复。
- 容易让 unknown query 被误解成实时诊断或语言错误。
- 当前还没有正式 LSP transport，先放进 LanguageServer 无法充分验证交互行为。

因此 LanguageServer 后续只应消费 Tooling 产出的 query capability model，或在 LSP 层做展示转换。

## 建议的 Tooling 模型

未来可在 `src/Internal/Tooling/HostSchema` 下增加窄职责模型和 domain：

```text
HostSchemaQueryModel
HostSchemaQueryReadResultModel
HostSchemaQueryReaderDomain
```

候选字段：

```json
{
  "name": "player.gold",
  "returnType": "number",
  "isAsync": false,
  "description": "Current visible gold amount.",
  "parameters": [],
  "sourcePath": "config/inscape.host.schema.json",
  "source": {
    "line": 8,
    "column": 15,
    "length": 11
  }
}
```

`source.line` / `source.column` 继续使用 1-based source location；编辑器层再转换为 0-based location。

## 未来实现边界

Tooling reader 应负责：

- 读取 `ToolConfigModel.HostSchema`。
- 按项目配置路径解析相对路径。
- 读取并解析 Host Schema JSON。
- 归一化 `queries[]`。
- 区分 simple zero-parameter text interpolation query 与 parameterized query。
- 保留 source location 以支持 audit report 或未来跳转。

Tooling reader 不负责：

- 执行 query。
- 验证 Host Bridge handler 是否存在。
- 决定 Runtime Host fallback。
- 给 `.inscape` 产生 Compiler diagnostics。
- 解析复杂表达式、函数调用或条件语法。

## VSCode 原型迁移策略

当前 VSCode 的 `DslScriptQueryInterpolationProvider.js` 可以暂时保留，作为 authoring hint 原型。等 Tooling audit 实现后，再决定：

- VSCode 是否继续保留 JS 轻量读取，只用于即时 completion / Hover。
- VSCode 是否调用 CLI / Tooling 输出做显式 audit。
- LanguageServer 是否接手 completion / Hover，并通过 Tooling 读取 Host Schema query。

在迁移前，不要为了“统一”而把可用原型拆散。更好的顺序是先让 Tooling audit 成为稳定公共契约，再决定编辑器侧替换。

## 自检结论

- 本决策不改 Compiler，不让 Host Schema 成为编译依赖。
- Host Schema query 读取被定位为 Tooling 共享能力，而不是 LanguageServer 私有能力。
- CLI、VSCode、LanguageServer 的分工保持清楚：CLI 输出显式 audit，VSCode 提供作者提示，LanguageServer 后续复用契约。
- Unity / Host Bridge 查询实现不在本节点研发，只保留后续映射需求。

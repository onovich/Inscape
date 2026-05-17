# Query Interpolation Workspace Audit

状态：草案，F1.14 audit 契约设计

最后更新：2026-05-16

本文设计 `[]` 查询插值 workspace audit 的第一版输出格式和命令入口。它承接 [Query Interpolation Follow-up Decision](query-interpolation-follow-up-decision.md)：audit 是显式、可选、非阻断的作者检查，不是 Compiler 语义，也不是 VSCode 默认 Problems 诊断。

## 目标

第一版 audit 只回答一个问题：

```text
当前项目里的 [query.path] 是否能被配置的 Host Schema 解释为文本插值 query？
```

它帮助作者发现拼写错误、漏配 Host Schema、或把有参数 query 误写成文本插值，但不阻止编译、预览、本地化提取或运行时宿主接入。

## 未来命令入口

候选 CLI 命令：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- audit-query-interpolation-project <workspace> [--format json|text]
```

候选 VSCode 命令：

```text
Inscape: Audit Query Interpolations
```

第一版建议先做 CLI，再由 VSCode 显式命令调用 CLI 或复用同一 Tooling domain。不要接入保存时自动 Problems 刷新。

## 扫描范围

输入范围：

- 工作区内 `.inscape` 源文件。
- `inscape.config.json` 中的 `hostSchema`。
- Host Schema 的 `queries[]`。

识别为 query interpolation 的写法：

```inscape
[itemName]
[player.gold]
[delta.affection]
```

不识别为 query interpolation 的写法：

```inscape
@timeline.talking.exit court_intro
@scene courtroom
[has_item("watch")]
[player.gold + bonus]
```

带冒号的 `[kind: alias]` 属于历史 inline host binding，Goal 0 后不再由当前 Host Bridge 或 query interpolation 主路径维护。

## 诊断类型

第一版只需要以下 code：

```text
IQI001 unknown-query
IQI002 query-requires-parameters
IQI003 host-schema-missing
IQI004 host-schema-invalid
```

级别约定：

- `info`：项目未配置 Host Schema，无法审计 query。
- `warning`：query 未声明、Host Schema 无法读取、或 query 不适合文本插值。

不要输出 `error`。未知 query 不是 Compiler 错误。

## JSON 输出形态

建议 JSON 顶层：

```json
{
  "format": "inscape.query-interpolation.audit",
  "formatVersion": 1,
  "workspace": "samples",
  "hostSchema": {
    "configuredPath": "config/inscape.host.schema.json",
    "resolvedPath": "D:/LabProjects/Inscape/samples/config/inscape.host.schema.json",
    "loaded": true
  },
  "summary": {
    "interpolationCount": 3,
    "diagnosticCount": 1,
    "unknownQueryCount": 1,
    "parameterizedQueryCount": 0
  },
  "diagnostics": [
    {
      "code": "IQI001",
      "severity": "warning",
      "message": "Query 'player.godl' is not declared in the configured Host Schema.",
      "query": "player.godl",
      "raw": "[player.godl]",
      "source": {
        "path": "story.inscape",
        "line": 12,
        "column": 8,
        "length": 13
      }
    }
  ]
}
```

`source.line` / `source.column` 使用 Compiler source location 口径：1-based。编辑器展示时再按 [Source Location Contracts](source-location-contracts.md) 转成 0-based `line` / `character`。

## Text 输出形态

文本输出应适合终端阅读：

```text
Query interpolation audit: samples
Host Schema: config/inscape.host.schema.json

warning IQI001 story.inscape:12:8 [player.godl]
  Query 'player.godl' is not declared in the configured Host Schema.

Summary: 3 interpolations, 1 diagnostic.
```

没有诊断时：

```text
Query interpolation audit: samples
Host Schema: config/inscape.host.schema.json
No query interpolation issues found.
Summary: 3 interpolations, 0 diagnostics.
```

未配置 Host Schema 时：

```text
info IQI003 inscape.config.json
  No hostSchema is configured; query interpolation audit was skipped.
```

## 退出码

第一版退出码建议：

- `0`：命令成功执行，包括发现 warning / info。
- `2`：命令参数错误，例如缺少 workspace。
- `3`：工具自身失败，例如无法枚举工作区。

不要因为 `IQI001` / `IQI002` 返回非零退出码。这样 CI 或作者脚本可以显式决定是否把 audit warning 当成阻断条件。

## 分层归属

推荐实现归属：

- 扫描 `.inscape` 与读取 `inscape.config.json` / Host Schema 的共享逻辑优先放在 `Inscape.Tooling`。
- CLI 只负责参数、输出格式和退出码。
- VSCode 后续显式命令只负责调用或展示，不复制解析逻辑。
- LanguageServer 暂不接手默认 diagnostics；等 audit 输出稳定后再评估 Hover / completion 迁移。

## 不做事项

第一版 audit 明确不做：

- 不执行 query。
- 不读取 Host Bridge handler。
- 不验证 Runtime Host 是否实现 query。
- 不把 warning 接入 `diagnose-project`。
- 不修改 `compile-project` 输出。
- 不修改本地化 CSV。
- 不解析函数调用、算术表达式或条件表达式。
- 不把历史 `[timeline: alias]` / `[bg: alias]` 当成 query。

## 自检结论

- 本文只设计显式 audit，不实现行为。
- 输出使用独立 `inscape.query-interpolation.audit` 格式，避免混入 Compiler diagnostic payload。
- 诊断 code 使用 `IQI` 前缀，和 Compiler diagnostic 维持边界。
- 退出码保持非阻断，符合“作者提示层优先”的 F1 决策。

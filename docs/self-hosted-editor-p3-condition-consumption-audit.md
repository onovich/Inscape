# SelfHostedEditor P3 Condition Consumption Audit

状态：P3 Round 9 condition expression Tooling / LanguageServer / Editor consumption complete

最后更新：2026-06-18

## 结论

PASS：P3 Round 9 已完成条件表达式的 Tooling / LanguageServer / Editor consumption 第一刀。

本轮不宣称 P3 完成。下一轮进入 P3 Round 10：Runtime query provider 与内部叙事事实设计。

## 本轮范围

已完成：

- `UsageManifestDomain` 复用 `Inscape.Compiler` 的条件 IR，从选项条件和条件跳转中抽取 query usage。
- 条件 query 进入 `inscape.usage` 的 `queries[]`，context 分别为 `choice-condition` 与 `conditional-jump`。
- query call / path 沿用现有 `syntax`、`name`、`raw`、`arguments` 和 source location 字段。
- Host Schema 参数 `idKind` 继续推导 `requiredIds`，例如 `has_item("silver_key")` 生成 `item:silver_key`。
- 老的文本插值扫描器会跳过条件行开头的 `[...]`，避免把 `- [debug_mode] ...` 误报为 `query-interpolation`。
- LanguageServer diagnostics 继续消费 Compiler diagnostics；Internal test 和 VSCode / SelfHostedEditor parity smoke 均覆盖 `INS061`。
- VSCode semantic parity 静态断言确认 ExternalSupport editor runtime 未新增条件表达式 parser。

未完成且后置：

- 未实现 Runtime 条件求值。
- 未实现条件 query completion / hover 的专门 UI。
- 未过滤 Preview / Runtime 选项可见性。
- 未设计 query provider、query receipt、Runtime State 或 Save / Load。

## Debug 自检

本轮先出现一次 Internal test 失败：LanguageServer 条件诊断测试使用了不存在的条件跳转目标，额外产生第二个 `INS020` 并覆盖坐标断言。已通过补齐真实目标节点并只记录第一条 missing-target 诊断修复。

最终验证结果：

```powershell
dotnet build Inscape.slnx --no-restore
# PASS，0 warning，0 error

dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
# PASS

node --check src\ExternalSupport\VSCode\DevScripts\VSCodeSemanticParityContractCheck.js
# PASS

node --check src\ExternalSupport\SelfHostedEditor\DevScripts\SelfHostedEditorSemanticParityHttpSmoke.js
# PASS

npm --prefix src\ExternalSupport\VSCode run check:structure
# PASS

npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
# PASS

npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
# PASS；保留现有 feature CSS color 提示，不是失败

npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
# PASS
```

## 架构自检

- Compiler 仍是条件语法真相；Tooling 只遍历 Compiler IR，不重写表达式 parser。
- Usage Manifest 仍是剧本需求清单，不执行 query，不判断条件真假。
- Host Schema 只用于参数 metadata 和 `requiredIds` 推导，未进入 Compiler。
- CLI 只负责项目读取、调用 Tooling、JSON 输出和 exit code。
- LanguageServer / VSCode / SelfHostedEditor 继续消费 Compiler / LanguageServer / Tooling payload；ExternalSupport 没有独立 condition expression parser。
- 本轮未引入 Unity、Bird、Addressables、项目内部 ID 或宿主资源 truth 到 `Internal`。

## 下一轮入口

P3 Round 10 优先完成：

1. 定义 Runtime query provider contract：delegate、mock、recorded 的职责和边界。
2. 定义内部叙事事实最小模型，例如 visited / seen / last_choice / log。
3. 明确 query receipt 与正式宿主状态的分工，不把业务玩法状态托管给 Inscape。

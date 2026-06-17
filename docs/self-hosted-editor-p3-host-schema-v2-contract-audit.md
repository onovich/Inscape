# SelfHostedEditor P3 Host Schema v2 Contract Audit

日期：2026-06-18

结论：P3 Round 2 Host Schema v2 minimum contract 已收口，P3 未完成。

## 本轮目标

按 [P3 Goal 模式执行指南](self-hosted-editor-p3-goal-mode-execution-guide.md) 的 Round 2 要求，先把 Host Schema 统一能力清单从设计口径落到可验证 contract：

- `queries[]` 表达只读宿主查询。
- `actions[]` 表达宿主动作，并使用 `mode: fire | wait | handoff` 描述控制权模式。
- `parameters`、`returnType`、`mode`、`idKind`、`description` 进入文档、模板、JSON Schema 和测试可见范围。
- 旧 `events[]` 不删除，作为 migration input 保留；新模板和新能力优先使用 `actions[]`。

## 完成内容

- 更新 Host Schema 文档，明确 Host Schema 是 `queries[]` / `actions[]` 的统一能力清单，Action Schema 不是独立系统。
- 更新 `export-host-schema-template`：模板现在输出 `queries[]` 与 `actions[]` 示例，不再生成 legacy `events[]`。
- 更新 VSCode bundled JSON Schema：新增 `actions[]`、`$defs.action`、`parameters[].idKind`、`query.idKind` 与 `number` 类型；legacy `events[]` 保留并标记 `deprecated`。
- 更新 CLI、VSCode、Host Bridge 相关文档，明确当前 reader / capability endpoint 仍消费 legacy `events[]`，Round 3 再迁移 action consumption。
- 新增 Internal contract test，防止 JSON Schema 丢失 `actions[]`、legacy `events[]`、action mode enum、`idKind` 或宿主边界禁词。

## 兼容策略

`events[]` 在 P3 Round 2 后只作为 legacy 输入保留：

- 新模板不再生成 `events[]`。
- JSON Schema 仍接受 `events[]`，并通过 `deprecated: true` 标记迁移状态。
- 当前 `HostSchemaEventReaderDomain`、`inspect-host-schema-project`、LanguageServer Host Schema capability endpoint、VSCode / SelfHostedEditor Host capability UI 可以继续读取 legacy event。
- Round 3 的目标是补 action reader / capability catalog consumption，并保持 legacy `events[]` 兼容路径。

迁移映射口径：

- `delivery: fire-and-forget` 或 `queued` 对应 `mode: fire`。
- `delivery: blocking` 对应 `mode: wait`。
- 旧 `events[]` 没有 `handoff` 等价语义，需要宿主在迁移时显式选择。
- 旧 `sideEffects` 只作为作者提示保留；P3 action 默认可有副作用，不再需要同名字段。

## 架构自检

- Compiler 未改动，Host Schema 不进入 `Inscape.Compiler`。
- Tooling 仍是 Host Schema 读取与模板生成的共享边界；VSCode / SelfHostedEditor 不复制 parser 或 schema reader 语义。
- JSON Schema 与模板只包含宿主中立字段；未引入 Unity GUID、asset path、Addressables key、Bird ID 或具体项目 ID。
- 本轮不实现完整 Runtime、完整 Save / Load、Rollback、Trace Replay、Flashback Playback、Presentation IR 或通用 Unity package。

## 验证结果

已通过：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-schema-template
node -e "JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json','utf8')); console.log('host schema json ok')"
node -e "const fs=require('fs'); const Ajv2020=require('ajv/dist/2020'); const schema=JSON.parse(fs.readFileSync('src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json','utf8')); const ajv=new Ajv2020({strict:false}); const validate=ajv.compile(schema); const current={format:'inscape.host-schema',formatVersion:1,queries:[{name:'has_item',parameters:[{name:'itemId',type:'string',idKind:'item'}],returnType:'bool'}],actions:[{name:'open_window',parameters:[{name:'windowId',type:'string',idKind:'ui-window'}],mode:'fire'}]}; const legacy={format:'inscape.host-schema',formatVersion:1,events:[{name:'open_window',delivery:'blocking',sideEffects:true,parameters:[{name:'windowId',type:'string'}]}]}; if(!validate(current)){console.error(validate.errors); process.exit(1);} if(!validate(legacy)){console.error(validate.errors); process.exit(1);} console.log('host schema ajv validation ok');"
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
```

## 下一轮

P3 Round 3：Host Schema Tooling / CLI / LanguageServer compatibility。

优先事项：

- 新增 `HostSchemaActionReaderDomain` 或等价共享 reader。
- 让 CLI capability output 能同时表达 `actions[]` 与 legacy `events[]`。
- 让 LanguageServer、VSCode 与 SelfHostedEditor 消费共享 action capability，而不是复制 schema 读取逻辑。
- 保留 legacy `events[]` 输入路径，并用测试覆盖迁移期行为。

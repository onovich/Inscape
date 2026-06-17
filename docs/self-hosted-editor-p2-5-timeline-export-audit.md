# SelfHostedEditor P2.5 Timeline Export Audit

日期：2026-06-17

状态：P2.5 Round 3 完成

## 目标

本轮准备真实 Timeline 绑定导出链路，产出可供 Bird Unity Importer Dry Run 使用的 manifest。只写 ignored `artifacts/bird-trial/**`，不修改 Bird 项目，不执行真实 Import。

## 命令入口口径

P2.5 指南中的历史命令仍写作 `export-bird-*`，但当前仓库已经把 Bird 风格导出原型迁到 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`，命令名为 `export-unity-sample-*`。这符合现有边界：实验 adapter 不进入 Internal CLI，也不污染 Compiler。

本轮实际使用：

```powershell
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-binding-template samples --unity-sample-existing-timeline-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Timeline -o artifacts\bird-trial\bird-bindings.csv
```

自动模板识别到 `court_intro`，但 Bird 当前 Timeline 资源名是 `SO_Timeline_0001.asset`、`SO_Timeline_0002.asset`、`SO_Timeline_0003.asset`，无法从文件名自动推断 `court_intro`。因此本轮在 ignored trial binding map 中人工确认最小真实绑定：

```text
kind,alias,unitySampleId,unityGuid,addressableKey,assetPath
timeline,court_intro,,b07842ff2fa161e459e024dc1a9fae7f,,Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset
```

该 GUID 来自 Bird 真实文件：

```text
D:\UnityProjects\Bird\Assets\Resources_Runtime\Timeline\SO_Timeline_0001.asset.meta
```

## 主样例导出

命令：

```powershell
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-project samples --unity-sample-existing-talking-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Talking --unity-sample-binding-map artifacts\bird-trial\bird-bindings.csv -o artifacts\bird-trial\export
```

输出：

- `artifacts/bird-trial/export/unity-sample-manifest.json`
- `artifacts/bird-trial/export/bird-manifest-p2-5.json`
- `artifacts/bird-trial/export/unity-sample-export-report.txt`
- `artifacts/bird-trial/export/L10N_Talking.csv`
- `artifacts/bird-trial/export/inscape-unity-sample-l10n-map.csv`

主样例验证结果：

```text
format: inscape.unity-sample-manifest
nodes: 18
talkings: 123
hostBindings: 1
hostHooks: 1
warnings: 0
```

关键 hook：

```json
{
  "kind": "timeline",
  "alias": "court_intro",
  "phase": "talking.exit",
  "targetTalkingId": 100000,
  "unityGuid": "b07842ff2fa161e459e024dc1a9fae7f",
  "assetPath": "Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset",
  "source": "samples/court-loop.inscape:4:1"
}
```

## Phase fixture 导出

为了让 Round 4 同时验证 unsupported phase warning，本轮新增 ignored 临时 fixture：

```text
artifacts/bird-trial/timeline-phase-fixture/phase-fixture.inscape
```

该 fixture 不进入仓库提交，不修改主样例。它包含：

- `@timeline.node.enter court_intro`
- `@timeline.talking.exit court_intro`
- `@timeline.talking.enter court_intro`
- `@timeline.node.exit court_intro`

输出：

- `artifacts/bird-trial/phase-export/unity-sample-manifest.json`
- `artifacts/bird-trial/phase-export/bird-manifest-p2-5-phases.json`
- `artifacts/bird-trial/phase-export/unity-sample-export-report.txt`

Phase fixture 验证结果：

```text
hostHooks: 4
warnings: 0
```

关键 hook：

```text
node.enter     -> targetTalkingId 100000
talking.exit   -> targetTalkingId 100000
talking.enter  -> targetTalkingId 100002
node.exit      -> targetTalkingId 100003
```

四个 hook 均绑定到同一个真实 Bird Timeline GUID `b07842ff2fa161e459e024dc1a9fae7f` 和 asset path `Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset`。

## Debug 自检

- 最小 phase fixture 已生成，并能导出 4 个 hostHooks。
- 主样例 `samples/court-loop.inscape` 已导出 1 个真实 `talking.exit` hostHook。
- Binding map 使用真实 Bird `.meta` GUID，不伪造 timeline ID。
- 本轮只写 ignored artifacts，不修改 Bird 工作树。
- UnitySample adapter 与 UnitySample CLI build 均通过。

## 架构自检

- 当前命令入口保留在 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`，不回灌 Internal CLI。
- `bird-manifest-p2-5*.json` 是 ignored trial artifact，用于当前 Bird Importer 兼容输入；不把 `birdId` / Unity GUID / asset path 提升为 Host Schema 或 Compiler contract。
- Host Schema / Host Bridge 分工未改变：Schema 仍描述能力，Bridge / adapter artifact 才携带项目资源坐标。

## 下一轮

进入 Round 4：临时复制 Bird importer 到 `D:\UnityProjects\Bird\Assets\Editor\`，执行 Unity batchmode Dry Run，确认：

- `talking.exit` 解析为真实 TimelineSO 并可生成 `TalkingEffectTM.PlayTimeline`。
- `node.enter`、`talking.enter`、`node.exit` 输出 `UNSUPPORTED_PHASE` warning。
- Dry Run 后 Bird 工作树不留下 importer、`.meta`、generated TalkingSO、Addressables 或 L10N 改动。

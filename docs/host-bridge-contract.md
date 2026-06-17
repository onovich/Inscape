# Host Bridge Contract

状态：草案

Host Bridge 是 Inscape 与具体宿主项目之间的映射契约。它位于 [Host Schema](host-schema.md) 和具体 adapter / importer 之间：

- Host Schema 回答“剧本可以引用哪些查询、动作和宿主能力”。
- Host Bridge 回答“这些 Inscape 侧可读 ID 在项目内部对应什么 ID、资源、动作处理器或查询实现”。
- Adapter / Generator 负责把 schema + bridge + Compiler IR 转成 Unity、Godot、服务端或项目自定义格式。

Compiler 不读取 Host Bridge，也不依赖任何宿主字段。

P2.5 收口结论：Unity GUID、asset path、Addressables key、Bird `talkingId` / `birdId` 只能出现在 Host Bridge / adapter artifact / 外部项目配置中，不进入 Host Schema 或 Compiler contract。

## 文件命名

推荐默认文件名：

```text
inscape.host.bridge.json
*.host.bridge.json
```

项目配置示例：

```json
{
  "hostSchema": "config/inscape.host.schema.json",
  "hostBridge": "config/inscape.host.bridge.json"
}
```

VSCode 编辑器扩展作者体验只读取 `hostBridge`。ExternalSupport 的 `unitySample` 配置字段只属于样例命令，不作为 Internal fallback。

## 格式草案

```json
{
  "format": "inscape.host-bridge",
  "formatVersion": 1,
  "host": {
    "kind": "unity",
    "profile": "unity-sample",
    "schema": "config/inscape.host.schema.json"
  },
  "ids": [
    {
      "kind": "speaker",
      "name": "mayoi",
      "displayName": "真宵",
      "host": {
        "roleId": 1002
      }
    },
    {
      "kind": "timeline",
      "name": "court_intro",
      "host": {
        "assetId": 2001,
        "unityGuid": "00000000000000000000000000000000",
        "addressableKey": "timeline/court_intro",
        "assetPath": "Assets/Timelines/CourtIntro.playable"
      }
    }
  ],
  "actions": [
    {
      "name": "play_timeline",
      "handler": {
        "kind": "unity-method",
        "typeName": "Game.NarrativeTimelineBridge",
        "memberName": "PlayTimeline"
      },
      "parameters": {
        "timelineId": {
          "from": "id",
          "kind": "timeline"
        }
      }
    }
  ],
  "queries": [
    {
      "name": "player.gold",
      "handler": {
        "kind": "unity-method",
        "typeName": "Game.InventoryBridge",
        "memberName": "GetGold"
      }
    }
  ]
}
```

## 字段语义

- `format` / `formatVersion`：版本识别。
- `host.kind`：宿主类别，例如 `unity`、`godot`、`server`、`custom`。
- `host.profile`：项目或样例 profile。
- `host.schema`：当前 bridge 实现的 Host Schema 文件。
- `ids`：Inscape 可读 ID 到宿主坐标的映射。
- `actions`：Host Schema action name 到宿主处理器的映射。旧 `events` 可在迁移期作为 legacy 输入保留，但新 Host Bridge 口径优先使用 `actions`。
- `queries`：Host Schema query name 到宿主查询实现的映射。

`ids[].host` 是宿主自由对象，可以保存整数 ID、GUID、资源路径、Addressables key 或其它坐标，但这些字段不得进入 Compiler 通用概念。

## Timeline 示例

当前脚本写法：

```inscape
@timeline court_intro
@timeline.node.enter camera_push
```

映射方式：

```text
@timeline court_intro
  -> ids[kind="timeline", name="court_intro"]
  -> actions[name="play_timeline"]
```

旧 bracket 写法不再属于当前主路径。

## 分层边界

- Compiler：不读取 Host Bridge，不验证宿主 ID 是否存在。
- Tooling：可读取 Host Bridge，做配置归一化、模板生成、报告、通用审计和 capability catalog。
- LanguageServer：可通过 `--host-binding-capabilities-project` 输出 `inscape.host-binding.capabilities`，供编辑器宿主消费。
- VSCode / SelfHostedEditor：可消费 Host Binding capability，提供补全、Hover、跳转和提示；宿主前端不应各自重新解析 `.host.bridge.json`。
- Runtime：未来可通过 Host Bridge 模块消费已烘焙映射，但不反向解析 `.inscape`。
- ExternalSupport：把 Host Bridge 转成宿主导入格式，或由宿主扫描生成待确认 bridge。

## Capability 输出

`inscape.host-binding.capabilities` 是编辑器作者体验使用的只读视图。第一版包含：

- `hostBridge`：配置路径、解析路径、是否加载成功和错误信息。
- `speakers`：来自 Host Bridge `ids[kind="speaker"]` 的绑定角色，以及 workspace 编译结果中的对白 speaker 出现位置。
- `bindings`：来自 Host Bridge `ids[]` 的非 speaker 资源绑定，以及 workspace 编译结果中的 `@timeline...` 出现位置。
- `locations`：每个 speaker / binding 保留映射行与 workspace 出现位置。编辑器宿主用它做 definition / references / Ctrl+Click；若同名能力同时存在 Host Bridge 行和脚本出现位置，Host Bridge 行可作为定义位置，脚本出现位置作为引用位置。

这个输出只服务补全、Hover 和导航。Compiler 仍不读取 Host Bridge，也不会因为缺少绑定而报 DSL 语法错误。

## 自检结论

- Host Schema 与 Host Bridge 分工明确：Schema 是能力清单，Bridge 是项目映射。
- Host Bridge 能表达 UnitySample 当前 role map、binding map 和 timeline hook 需求，但不把 UnitySample 字段升级为通用模型。
- Host Binding capability 已落到 Tooling / LanguageServer；编辑器宿主只消费共享输出，不各自复制 Host Bridge JSON 解析。
- Goal 0 后，VSCode 编辑器扩展作者体验不再读取 UnitySample fallback；后续 UnitySample 迁移应走 ExternalSupport / Host Bridge 生成计划。

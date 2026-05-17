# 项目配置草案

状态：原型草案

最后更新：2026-05-01

Inscape CLI 会在项目根目录自动读取：

```text
inscape.config.json
```

也可以通过 `--config path` 显式指定配置文件。命令行参数优先级高于配置文件。

## Host Bridge 与 ExternalSupport UnitySample 配置

当前配置已经支持通用 `hostBridge` 路径，并保留 `unitySample` 作为 ExternalSupport 实验样例命令的配置入口。新项目应把 Inscape 可读 ID、资源坐标、事件处理器和查询实现放进 Host Bridge；Internal VSCode authoring 不再读取 `unitySample` 作为 fallback。

```json
{
  "hostSchema": "config/inscape.host.schema.json",
  "hostBridge": "config/inscape.host.bridge.json",
  "unitySample": {
    "talkingIdStart": 100000,
    "roleMap": "config/unity-sample-roles.csv",
    "bindingMap": "config/unity-sample-bindings.csv",
    "existingRoleNameCsv": "D:/UnityProjects/UnitySample/Assets/Resources_Runtime/Localization/L10N_RoleName.csv",
    "existingTimelineRoot": "D:/UnityProjects/UnitySample/Assets/Resources_Runtime/Timeline",
    "existingTalkingRoot": "D:/UnityProjects/UnitySample/Assets/Resources_Runtime/Talking"
  }
}
```

相对路径按配置文件所在目录解析。

当前读取这些字段的工具：

- `export-host-schema-template`：可生成 `hostSchema` 的起始模板，但不会自动写入配置。
- VSCode 扩展：优先读取 `hostBridge`，为 speaker 和宿主事件 / 时机 hook 提供补全、Hover 与 Ctrl+Click。
- `export-unity-sample-role-template`：读取 `existingRoleNameCsv`。
- `export-unity-sample-binding-template`：读取 `existingTimelineRoot`。
- `export-unity-sample-project`：读取 `talkingIdStart`、`roleMap`、`bindingMap`、`existingTalkingRoot`。
- VSCode 扩展：读取 `hostBridge`，为 speaker 和宿主事件 / 时机 hook 提供补全、Hover 与 Ctrl+Click；没有 Host Bridge 时只回退扫描工作区脚本文本。
- VSCode 扩展：读取 `hostSchema`，通过命令面板列出宿主 query / event，并为 `inscape.host.schema.json` / `*.host.schema.json` 提供 JSON Schema 校验。

仍未放进配置的内容：

- 输出目录：继续通过 `-o` 指定，避免误写。
- Unity Importer 输出目录：仍通过 Unity 菜单或 batchmode 参数指定。
- L10N merge 的 `--from` 路径：暂时仍显式传入，避免误覆盖正式表。

## 设计边界

`hostSchema` 和 `hostBridge` 是长期方向：前者描述查询 / 事件能力，后者描述 Inscape 可读 ID 到项目内部 ID、资源坐标、事件处理器和查询实现的映射。它们仍是草案，但已经是新配置口径。

`unitySample` 不是最终宿主 Schema，也不是最终 Host Bridge。它只是 ExternalSupport 样例 adapter 的“项目级默认值”，用于把当前 CSV 和样例路径稳定下来。详见 [UnitySample Adapter 实验样例](unity-sample-adapter.md)。

`unitySample.bindingMap` 目前只能视为 ExternalSupport UnitySample 命令的实验样例输入：它把 Inscape 侧可读别名映射到样例整数 ID、Unity guid、Addressables key 或 asset path。通用 Host Bridge 后续需要支持更多项目和引擎，不应假设所有项目都使用这套字段、Addressables 或 ScriptableObject。

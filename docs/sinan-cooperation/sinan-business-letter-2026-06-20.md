# Sinan Engine 给 Inscape 的合作沟通函

日期：2026-06-20
发件方：Sinan Engine 商务与生态合作评估
收件方：Inscape 项目负责人 / 维护者
关联 RFC：`rfc-005-sinan-inscape-narrative-bridge.md`

## 1. 来信目的

我们已将 `RFC-005：Sinan / Inscape Narrative Bridge` 放入本目录。该 RFC 是 Sinan 侧对叙事 authoring、Narrative Graph IR、Host Schema、Host Bridge、importer dry-run 和 runtime preview 边界的当前对齐草案。

说明：我在 Sinan 仓库与 `D:\LabProjects` 中没有找到现成的 RFC-005 原文件，因此本次投递稿依据 Sinan 已批准的外部基础设施合作战略决定、技术架构通知，以及 Inscape 现有 Host Schema / Host Bridge / Runtime authoring 文档整理生成，供双方对齐。

## 2. Sinan 当前定位

Sinan 已升级为 **Sinan Engine**，即 AI-native、data-first、Web 原生 3D 游戏引擎与编辑器。它不是 Unity 或 Godot clone，而是把引擎语义放在 JSON、schema、registry、adapter、validation 和 browser smoke 中，方便人类与 AI agent 共同维护。

原先的 Scene Director 范围现在是 Sinan Engine 内部的一等 Director System，负责 events、conditions、actions、timelines、camera shots、animation cues、material timeline 和 cinematic flow。

这次联系 Inscape 的目标不是把 Inscape 并入 Sinan engine core，而是建立 narrative authoring / importer / Host Schema Bridge 合作。

## 3. 我们为什么看重 Inscape

Inscape 的成熟度明显高于普通早期方案。我们看到它已经具备：

- `.inscape` 文本 DSL 与 Compiler。
- Narrative Graph IR。
- source location / source map。
- localization anchors。
- Host Schema / Host Bridge。
- Usage Manifest。
- Runtime-backed Preview。
- Mock Query、Runtime Actions、Log / Backlog、Branch Receipts、Substate 等 authoring surfaces。

这些能力与 Sinan 的长期路线高度互补：Sinan 专注 engine runtime、World、Director、Assets、Input、Runtime UI、Camera、Material 和 browser validation；Inscape 专注叙事源文本、作者体验、本地化、Host Bridge 和叙事运行时 authoring。

## 4. 合作建议

我们建议先做最低风险的一条线：

1. Inscape 提供一个小型 `.inscape` sample。
2. Inscape 导出 Narrative Graph IR、localization CSV / anchors、usage manifest。
3. Sinan 提供 resource/action/query/timeline/cameraShot catalog 草案。
4. 双方共同形成 Host Bridge candidate。
5. Sinan importer 只做 dry-run report，不改正式 data。

这一步可以回答：

- Inscape graph 能否自然映射到 Sinan narrative data draft？
- Sinan 的 action / query / timeline / cameraShot 是否能作为 Host Schema 能力暴露？
- localization anchors 是否能映射到 Sinan 后续本地化管线？
- 哪些 feature 需要停留在 bridge adapter，而不是进入双方 core？

## 5. 生态协同提示

Sinan 同期还在和几个 Web game infrastructure 项目对齐：

- Indirection：资源 catalog、asset report、fallback loader。
- InputFlow：input action、context routing、virtual replay。
- ViewRig：camera rig / pose solver。
- LudoWeave：Runtime UI ViewModel、Prompt、Subtitle、Objective、Pause。

Inscape 的位置和它们不同：它不是横向 runtime subsystem，而是 narrative authoring pipeline。它可以通过 Sinan catalog 使用 Indirection 的 asset ids，通过 Host Schema 引用 Sinan actions，通过 Runtime UI 展示 dialogue/prompt，并与 Director/Timeline 协调演出。

## 6. 商务边界

当前阶段不是收购、合并或排他合作要约。我们希望建立 first-party design partner 关系：

```txt
Sinan owns engine runtime semantics.
Inscape owns narrative authoring and compilation.
The bridge proves value through dry-run reports.
Validation protects both projects.
```

如果 POC 稳定、接口连续兼容、维护责任清晰，我们再讨论官方 bridge、兼容矩阵、Sinan Engine Infrastructure Kit 或更深层合作。

## 7. 希望 Inscape 回复的问题

请优先评估：

1. POC-1 是否可以只做静态 dry-run，不进入 live preview？
2. Inscape 当前最适合导出的 minimal graph / usage / localization artifact 是哪一组？
3. Sinan catalog 应优先对齐 Inscape Host Schema，还是先做独立 Sinan resource/action/query catalog？
4. Host Bridge candidate 的人工确认流程应放在 Inscape SelfHostedEditor、Sinan editor，还是独立 report？
5. `sinan-inscape-bridge` 更适合放在 Sinan、Inscape，还是独立仓库？

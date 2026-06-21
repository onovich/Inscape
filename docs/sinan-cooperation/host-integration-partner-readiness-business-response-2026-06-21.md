# Host Integration Partner Readiness 商务反馈口径

状态：可转述给商务 / 合作方

日期：2026-06-21

关联决策：

- [Host Integration Partner Readiness 决策简报](host-integration-partner-readiness-decision-brief-2026-06-21.md)
- [Post-P5 Next Direction Decision Brief](../post-p5-next-direction-decision-brief.md)

## 总判断

建议对商务表达：Inscape 接受 Sinan 提出的合作方向，并愿意启动 `Host Integration Partner Readiness` 作为下一步内部准备阶段。

但这个阶段的本质不是“接入 Sinan Runtime”，也不是“为 Sinan 定制 Inscape”，而是把 Inscape 已有的 Host Schema、Host Bridge、Usage Manifest、Narrative Graph IR、localization anchors 和 Host Integration Audit 整理成外部宿主可以消费、校验和对账的一组静态集成契约。

Sinan 可以成为第一批真实 partner profile / fixture，用来验证这套通用契约是否足够清楚。但 Sinan 不会成为 Inscape core dependency，也不会改变 Inscape engine-agnostic 的方向。

## 可以对外确认

- Inscape 对 Static Artifact POC planning 持开放态度。
- Inscape 愿意输出最小 integration package contract。
- Inscape 愿意明确 Narrative Graph IR 的外部稳定字段。
- Inscape 愿意明确 source location、diagnostics、localization anchor / CSV / anchor map 的对外契约。
- Inscape 愿意整理 Usage Manifest 与 Host Integration Audit 在集成包里的职责。
- Inscape 愿意设计 Host Bridge candidate、manual review、generated candidate 的边界。
- Inscape 愿意准备 minimal dialogue、branching、localization、missing speaker、unknown action、unsupported feature、source diagnostic 等 fixtures。
- Inscape 愿意以 Sinan 作为真实 partner profile 验证 POC planning。

## 需要明确保留边界

- 不做 Sinan Runtime 接入。
- 不做 Runtime Preview Bridge。
- 不引入 hard dependency。
- 不做 Sinan 专用 DSL 语法。
- 不让 `Inscape.Compiler` 依赖 Sinan。
- 不让 `Internal/Runtime` 依赖 Sinan TypeScript runtime。
- 不把 Sinan Director / World / Timeline / Camera / Runtime UI 语义写进 Inscape core。
- 不直接写 Sinan `data/**/*.json`。
- 不做 bidirectional edit。
- 不承诺 Sinan 是唯一 visual host。

## 建议商务口径

可以这样回复：

```txt
Inscape 接受 Sinan / Inscape Static Artifact POC planning 的方向。

我们会在 Inscape 项目内启动 Host Integration Partner Readiness 作为内部准备阶段。第一阶段重点不是 runtime integration，而是把 Inscape 的 integration package、Narrative Graph IR external contract、source location、localization anchors、usage/audit report、Host Bridge candidate 和 fixtures 整理到外部宿主可消费、可 dry-run、可对账的程度。

Sinan 可以作为第一批真实 partner profile / fixture，帮助验证这套通用契约是否足够清楚。但 Inscape 会继续保持 engine-agnostic，不把 Sinan runtime、Director、World、Timeline、Camera、Runtime UI 或 data directory layout 写进 Inscape core。

因此当前阶段：

- Host Integration Partner Readiness: GO
- Static Artifact POC planning: GO
- Sinan Runtime Integration: HOLD
- Runtime Preview Bridge: HOLD
- Hard Dependency: NO
- Sinan-specific Core Semantics: NO

如果 POC-1 / POC-2 的 static artifact、catalog projection、dry-run report、diagnostics 和 Host Bridge candidate 都稳定，双方再讨论 one-way generated candidate。Live preview、runtime state sync、bidirectional edit 和 hard dependency 不进入当前阶段。
```

## 建议下一次合作讨论议程

建议商务推进下一次技术对齐时，只约以下五件事：

1. Sinan 是否能给出 resource / action / query / timeline / cameraShot catalog 的最小样例。
2. Sinan dry-run importer 第一版只输出 report、不改正式 data 的验收格式。
3. Inscape integration package 第一版应包含哪些 artifact。
4. Host Bridge candidate 的人工确认放在独立 report、Inscape editor，还是 Sinan editor 的后续版本。
5. POC-1 的 acceptance checklist：deterministic、diffable、diagnostics 能回到 Inscape source、不引入 hard dependency。

## 我方底线

这次合作应该被包装成“first-party design partner / integration readiness”，而不是“平台绑定”或“runtime 接入项目”。

对 Inscape 来说，这条线的价值在于用 Sinan 的真实需求检验通用 Host Integration contract，而不是把 Sinan 变成唯一宿主。只要守住 static artifact / dry-run / report-first，合作风险可控，且能反过来让 Inscape 的对外宿主接入能力更成熟。

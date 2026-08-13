# 无人值守循环手册

这套系统不使用第几天或第几周作为调度条件。宿主 Goal 负责在有 credit 时重复执行单轮命令，每一轮都先恢复状态，再依据当前证据领取工作。

## 单轮入口

```bash
pnpm ops watch
pnpm ops:cycle
```

`watch` 只读扫描 `ops/sources.json` 中的官方来源和已登记生态来源。首次运行建立游标，revision 变化时标记关联 EvidencePack 与 Asset 为 `STALE`，取消尚未发送的旧渠道任务，并生成带有 `official`/`ecosystem`/`community` 来源类型的复测机会。`cycle` 会先恢复状态，再把已确认的 `DRAFT_ONLY` 队列写入渠道 outbox，随后同步已经有真实回执的发布任务的互动数据；它不会自动触发真实渠道发布。

生态来源只用于发现和排序线索；正式发布前仍需由 Research / Verify 建立一手来源或本地复现的 EvidencePack，不能把仓库 HEAD 变化直接写成兼容性结论。

扫描错误会保留在 `doctor`/`status` 的 `sourceHealth.errors` 中；部分源失败不会抹掉本轮成功观察，也不会被解释成“上游没有变化”。下一轮恢复后错误自动清除。

如果宿主连接器已经核对到公开源，但本地运行时无法访问该源，可以使用只含公开 revision 的 attestation 文件：

```bash
pnpm ops source-attest evidence/source-attestations/2026-08-13-github.json
```

文件只能包含 `id`、`revision` 和可选的 `observedAt`，不能带正文、凭据或私人内容。`source-attest` 只清除本次被 attested 的 source ID 错误，未核对的源仍保持降级，并沿用普通扫描的变化检测、资产失效和复测机会生成逻辑。

不带 worker 的 `cycle` 只执行租约恢复、渠道恢复、未知远端状态协调和反馈分析，然后说明下一项工作，不认领任务。

```bash
pnpm ops cycle --worker <role-instance>
```

带 worker 时，系统使用独占租约和 fencing token 原子领取最高分机会。系统最多允许 4 个活跃工作线程，单个 worker 不能同时持有两项租约。工作 Agent 必须在每次写回时携带返回的 token 与最新 aggregate revision，旧线程即使稍后恢复也不能覆盖新线程结果。

如果只需要生成草稿 outbox，可以单独运行：

```bash
pnpm ops dispatch-queued --limit 10
```

该命令只接受 `DRAFT_ONLY`，会跳过 `MOCK`、未授权和其他模式。`OUTBOX` 仍然不是公开发布，必须由渠道 Agent 完成真实操作后写回远端回执。

知乎是强制人工批准渠道。即使它处于 `DRAFT_ONLY`，`dispatch-queued` 和 `cycle` 也会跳过知乎任务；只有主理人明确同意后，才可以运行：

```bash
pnpm ops approve <publish-job-id> --by "主理人" --note "本次明确同意知乎发布"
pnpm ops dispatch <publish-job-id>
```

批准只针对指定 PublishJob，不代表后续知乎任务自动获得授权。没有批准记录时，任何 Agent 不得打开知乎发布流程或把任务当作已发布。

## 工作者写回

```bash
pnpm ops verify <opportunity-id> \
  --worker <worker> --token <lease-token> --revision <revision> \
  --file evidence/drafts/<pack>.json

pnpm ops asset-register <opportunity-id> \
  --worker <worker> --token <lease-token> --revision <revision> \
  --type tutorial --title <title> --path content/canonical/<file>.md

pnpm ops asset-ready <asset-id> \
  --worker <worker> --token <lease-token> --revision <revision> \
  --validation-file evidence/validations/<asset>.json

```

例行维护机会只复测已有 READY/PUBLISHED 资产，不重新创建内容资产。完成后使用：

```bash
pnpm ops maintenance-complete <opportunity-id> \
  --worker <worker> --token <lease-token> --revision <revision> \
  --validation-file evidence/validations/<asset>.json
```

渠道连接器获得真实回执后，可以单独同步互动，或让 `cycle` 自动同步：

```bash
pnpm ops collect-interactions <publish-job-id>
pnpm ops sync-interactions
```

当同一资产和渠道累计出现至少两条评论或提及时，系统会保留经脱敏检查的公开互动正文，并自动生成一个去重的 `feedback` Opportunity，建议方向为 FAQ 或教程修订。它只是待验证线索，不会把评论直接当成事实证据，也不会自动发布。

EvidencePack 只有一手官方来源或成功的本地复现才可进入 `VERIFIED`。Asset 验证回执必须说明检查方式、结果和备注，并与当前内容哈希绑定；实验、工具和插件还必须记录实际通过的命令。对同一事实补充更强的本地证据时使用 `evidence-augment`；普通增强不能改基线，`STALE` 证据则必须升级基线后才能恢复。

## 失败恢复

工作者不能完成任务时应主动写回失败，不要等租约自然过期。

```bash
pnpm ops fail <opportunity-id> \
  --worker <worker> --token <lease-token> --revision <revision> \
  --reason <sanitized-reason>
```

第一次失败把任务放回队列，由另一线程重试。第二次相同工作机会失败后进入 `ARCHIVED`，总控继续处理下一项。租约过期执行同一规则。

渠道发布任务最多进行 2 次外部尝试。达到上限后，`retry` 会将任务记为 `CANCELLED`；如果仍需发布，必须基于当前资产 revision 创建新的 PublishJob，不得无限重试同一远端动作。

## 空队列行为

系统不会为了显得忙而制造任务。存在尚未处理的上游变化或 `STALE` 资产时，优先生成复测机会；READY/PUBLISHED 资产超过 7 天没有验证时，按最旧验证时间生成一次例行复测。例行复测完成后会刷新验证时间，失败两次后归档，避免同一资产形成忙循环。没有新机会、老化资产、失效资产或待协调发布时，`cycle` 返回 `WAIT`，由宿主 Goal 等待下一个外部事件或 credit 续轮。

## 不可自动越过的边界

删除、撤稿、付费、凭据处理、安全漏洞公开披露、法律或商标争议、个人承诺和私人经历都不能由本循环自行执行。渠道失败只影响对应 PublishJob，不改变其他渠道与总机会状态。

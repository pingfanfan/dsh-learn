# 发布、回执与纠错手册

## 状态含义

- `DRAFT_ONLY` 只会生成宿主 Agent outbox，不算公开发布。
- `MOCK` 只用于完整链路测试，不改变 Asset 和 Opportunity 的公开状态。
- `BLOCKED_CHANNEL` 表示文案已经排队，但渠道能力未授权或不可用，不影响其他渠道。
- `OUTBOX` 表示宿主 Agent 尚未回写远端结果。
- 只有 `remoteId`、远端 `url` 和 `publishedAt` 三项齐全，任务才能成为 `SUCCEEDED`。
- `UNKNOWN_REMOTE_STATE` 禁止盲目重试，必须先读取远端判断是否已经发出。

## 生成干净渠道稿

规范长文保留标题候选、推荐理由和可选口述区标记，不能原样送到平台。使用 renderer 生成不含编辑脚手架的渠道稿。

```bash
pnpm ops render content/canonical/<article>.md \
  --channel zhihu --output content/channels/zhihu/<article>.md

pnpm ops render content/canonical/<article>.md \
  --channel wechat --output content/channels/wechat/<article>.md
```

renderer 会保留口述区内可直接发布的正文，删除开始、方向、结束标记以及标题候选和备用标题，并附上验证范围与一手来源。

## 排队与发送

```bash
pnpm ops publish <asset-id> \
  --channel github=content/channels/github/<file>.md \
  --channel weibo=content/channels/weibo/<file>.md \
  --channel zhihu=content/channels/zhihu/<file>.md \
  --channel wechat=content/channels/wechat/<file>.md
```

同一资产 revision、同一渠道出现新文案时，旧的未发送任务自动取消，避免渠道恢复后连续发出两版。处于 `SENDING`、`OUTBOX` 或 `UNKNOWN_REMOTE_STATE` 的任务不会被覆盖。

宿主渠道 Agent 成功后写回回执。

对于已确认只生成草稿的渠道，可以让总控批量生成 outbox：

```bash
pnpm ops dispatch-queued --limit 10
```

这个命令只处理 `DRAFT_ONLY`，不会处理 `MOCK` 或真实渠道；`pnpm ops cycle` 也会自动调用同一安全门。生成 outbox 仍不等于公开发布，渠道 Agent 必须在真实操作后写回回执。

```bash
pnpm ops receipt <job-id> \
  --remote-id <remote-id> --url <public-url> --published-at <ISO-time>
```

只有已经进入 `OUTBOX`、`SENDING` 或 `UNKNOWN_REMOTE_STATE` 的任务能补录回执。非本地渠道只接受 HTTPS，且 URL 域名必须与渠道匹配；`QUEUED` 任务不能靠手工回执跳过发送。

回执写入后，渠道连接器可以读取评论、引用、提及和反应。相同 `remoteId` 在同一 PublishJob 下只会记账一次，并转成累计指标供排序分析：

```bash
pnpm ops collect-interactions <publish-job-id>
```

`pnpm ops cycle` 会对所有已成功任务执行同样的同步；没有真实连接器或没有新增互动时不会制造指标事件。

## 渠道恢复

更新 `ops/channels.json` 的已确认能力以后运行 `pnpm ops reconcile`。绑定的资产和证据仍有效时，`BLOCKED_CHANNEL` 自动恢复为 `QUEUED`；已经失效的旧任务不会复活。`UNKNOWN_REMOTE_STATE` 只有在适配器明确返回 `NOT_FOUND`，或渠道 Agent 已经实际查远端后显式确认，才可以继续处理：

```bash
pnpm ops confirm-not-found <job-id> \
  --reason "渠道查询结果、远端 URL 或 HTTP 404 证据"
```

当前绑定仍有效时任务进入 `RETRYABLE_FAILED`，随后使用 `pnpm ops retry <job-id>`；如果资产或证据已经换代，旧任务会被安全归档为 `CANCELLED`，再用当前资产 revision 重新 `publish`，不能按过期版本重试。这个命令只改变本地状态，不删除远端内容。

## 修订与公开更正

规范资产修改后执行 `asset-revise`，同时提交新一轮验证回执；旧的未发送任务会被取消。

```bash
pnpm ops asset-revise <asset-id> --validation-file evidence/validations/<asset>.json
```

已经有真实远端回执的内容需要公开更正时，以原 PublishJob 为起点建立更正关系。

```bash
pnpm ops correct <published-job-id> --path content/channels/<channel>/<corrected-file>.md
pnpm ops dispatch <correction-job-id>
```

更正任务保留 `correctionOf`，不会覆盖或删除原始回执。适配器不提供删除接口，大范围撤稿必须升级给主理人。

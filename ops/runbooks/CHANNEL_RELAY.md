# 渠道中继：从 Agent outbox 到真实回执

本手册描述浏览器渠道尚未接入实时 API 时的安全中继流程。它适用于微博、知乎等已经确认登录、但适配器仍声明 `DRAFT_ONLY` 的渠道。

`DRAFT_ONLY` 不是发布成功。只有在远端页面确认正文已出现，并且能够读出规范 URL、remote ID 和发布时间后，才可以运行 `receipt`。

## 1. 领取一项 outbox

先读取 outbox JSON，核对四个字段：

- `jobId`：必须与本地 `QUEUED` 或 `OUTBOX` PublishJob 相同；
- `channel`：必须与实际打开的平台一致；
- `dedupeKey`：用于防止同一版本重复发送；
- `content`：实际粘贴的正文必须与文件完全一致。

不要从 `state/snapshot.json` 或日志中复制凭据、个人私密内容或完整私有日志。outbox 只允许包含公开候选正文。

## 2. 微博浏览器中继

1. 打开已经登录的目标账号主页，先检查最近内容中是否已有相同正文或相同 `dedupeKey` 对应的链接。
2. 进入首页发微博输入框，粘贴 `outbox/weibo/<dedupeKey>.json` 的 `content`，不要改写版本号、命令、来源和边界说明。
3. 发送前再次读取页面上的文本框和发送按钮状态；发送后必须在时间线中看到正文首句。
4. 打开刚刚发布的内容，读取完整 URL。微博常见 URL 形态为 `https://weibo.com/<uid>/<status-id>`。
5. 用该 URL 的最后一段作为 `remoteId`，用页面显示的真实发布时间作为 `publishedAt`：

```bash
pnpm ops receipt <job-id> \
  --remote-id <status-id> \
  --url https://weibo.com/<uid>/<status-id> \
  --published-at <ISO-time>
```

6. 发布后读取阅读、转发、评论和赞，使用一次性 JSON 运行 `measure`。没有看到数字时记录为 0，不要把页面加载失败当成真实互动。

如果点击发送后页面状态不明确，先不要重发，也不要写 `receipt`。确认远端 URL 是否出现正文；若公开页面重定向、404 或仍只是编辑草稿，可把这次外部结果标记为不确定，再在核验远端不存在后安全转为可重试：

```bash
pnpm ops remote-unknown <publish-job-id> --reason "公开 URL 未出现正文，编辑器状态不确定"
pnpm ops confirm-not-found <publish-job-id> --reason "已核验公开 URL 不存在，未重复发送"
```

`remote-unknown` 只接受已经进入 `OUTBOX` 或 `SENDING` 的任务，并拦截凭据形态的原因文本；`confirm-not-found` 不删除任何记录，只把当前绑定任务变成 `RETRYABLE_FAILED`。如果远端后来找到了正文，应直接用真实 URL 和 remote ID 记录 `receipt`，不要先确认不存在。

## 3. 知乎或其他渠道

沿用相同的四步证据链：确认登录态、确认正文、确认远端 URL、记录真实指标。知乎文章/回答的 URL 和内容形态必须从当前页面读取，不能根据草稿标题猜 URL。

如果页面要求重新登录、出现风控验证、正文被截断、发布按钮状态不明确，停止在 `OUTBOX`，不要猜测成功，也不要补录回执。需要升级的情况包括删除、撤稿、付费、账号安全和代表主理人作个人承诺。

## 4. 重复与纠错

- `OUTBOX`、浏览器待提交页面和“发送按钮已点击”都不能当作成功；
- `UNKNOWN_REMOTE_STATE` 必须先查远端，禁止盲目重发；
- 已有真实回执的正文需要修改时，建立 `correct` 任务，不删除原始回执；
- 发现事实错误时，先修订规范资产，再重新生成渠道稿和纠错任务；
- 不提供自动删除接口，大范围撤稿始终升级给主理人。

本轮首条可复核示例：微博术语 FAQ 的真实回执为 [`RdgZThkIo`](https://weibo.com/7621278794/RdgZThkIo)，新手入口为 [`Rdh0Bwdy`](https://weibo.com/7621278794/Rdh0Bwdy)。两条内容的阅读数据已回流到本地 Asset 指标，不能据此推断知乎、GitHub 或公众号已经发布。

## 5. 互动回传桥

渠道 Agent 不能直接访问平台 API 时，可以把公开互动快照写入本机私有目录，再运行已有的 `collect-interactions`。文件路径固定为：

```text
state/private/interactions/<channel>/<publish-job-id>.json
```

文件只允许包含下面的结构，不要写入凭据、Cookie、私信或完整个人资料：

```json
{
  "schemaVersion": 1,
  "jobId": "pub_example",
  "channel": "weibo",
  "interactions": [
    {
      "remoteId": "comment-example",
      "kind": "comment",
      "observedAt": "2026-08-13T19:30:00.000Z",
      "body": "可选的公开正文；不需要分析时留空"
    }
  ]
}
```

总控会校验 job、渠道、类型、时间和潜在凭据，再沿用 remote ID 去重、指标生成和事件账本。缺少文件代表“本轮没有可核验互动”，不是“平台互动为零”；文件不进入 Git，互动正文也不会被写回公开内容。

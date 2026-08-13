# DSH Discussions 当前复核：从 Web 排障到第一个社区插件

截至 2026-08-13T23:44:07Z，DeepSeek Harness 官方 Discussions 分页复核得到 6 页、535 条公开讨论，编号从 `#12` 到 `#549`，中间存在编号空缺。

这不是 DSH 发布了新版本，而是早期生态开始同时暴露几类真实需求：新手遇到工作区和历史加载问题，Windows 用户遇到路径边界，Web 用户需要更完整的错误信息，开发者开始发布可以安装的社区插件。

## 新增信号

### Web 和 Windows 排障

Discussion #541 记录了 Web UI “打开文件”时的主机边界和错误被静默吞掉的问题；#542 报告 Windows 工作区路径可能出现 `C:\\a/b` 这样的混合分隔符；#543 报告 Web transport 失败时只显示 HTTP 状态而缺少服务端错误正文。

官方固定 commit `47f9438` 中，`resolveWorkspacePath` 确实用字符串拼接 `/` 连接工作区和相对路径，Web RPC 也确实在非 2xx 时只抛出状态码错误。这支持“值得排查和向上游反馈”，但不等于所有 Windows 用户都会复现，也不等于官方已经接受或修复。

### 工作区、历史和输入体验

Discussion #540 说长文本粘贴到对话框时会卡顿，#547 以截图报告无法添加工作区，#548 报告历史加载失败并出现 `RangeError: Maximum call stack size exceeded`。这些目前仍是社区报告，不能合并成一个根因，也没有本地复现。

### 一个社区 DSH 插件

Discussion #544 展示了 [`dsh-agent-messaging`](https://github.com/happyren/dsh-agent-messaging)，目标是让不同 session 通过 `peer_list`、`peer_send` 和 `peer_inbox` 传递消息。

静态审查发现它具备当前 DSH bundle 路线的关键形状：`package.json` 声明 `dsh.bundle.patch`，patch 把插件层插入 profile，入口依赖 `tools`、`agents` 和 `sessionQuery`，并通过 `ctx.effect()` 注册清理动作。它还包含 `prepare` 构建脚本，README 建议 pin commit。

这不是官方插件，也不是已经验证过的推荐方案。安装前应阅读源码、确认构建脚本和权限，并在隔离 profile 中分开验证安装、加载、消息投递和模型行为。

## 对新手的直接建议

- `Web UI`、`host`、工作区路径和 transport 错误不是同一个层次；先记录系统、版本、路径和完整日志。
- 第一个插件仍建议使用 dsh-learn 的无 Key `hello-plugin` 实验，不要让陌生社区包成为入门单点故障。
- 社区插件索引至少记录来源、固定 commit、bundle 声明、构建脚本、能力范围和验证状态。

## 验证边界

本卡没有调用模型 API，没有复现 Windows、远程 Web、工作区或历史加载问题，没有下载或运行第三方插件。官方仓库代码基线仍记录为 `47f943859bef60e4160492346772ded9b24f765a`。

来源：

- [DeepSeek Harness Discussions 第 1 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=1) 至 [第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [#541](https://github.com/deepseek-ai/deepseek-harness/discussions/541)、[#542](https://github.com/deepseek-ai/deepseek-harness/discussions/542)、[#543](https://github.com/deepseek-ai/deepseek-harness/discussions/543)、[#544](https://github.com/deepseek-ai/deepseek-harness/discussions/544)、[#547](https://github.com/deepseek-ai/deepseek-harness/discussions/547)、[#548](https://github.com/deepseek-ai/deepseek-harness/discussions/548)、[#549](https://github.com/deepseek-ai/deepseek-harness/discussions/549)
- [官方 `resolveWorkspacePath` 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/runtime/src/client/workspaces/path.ts)
- [官方 Web RPC 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/connection/src/client/rpc.ts)
- [dsh-agent-messaging](https://github.com/happyren/dsh-agent-messaging)，静态审查固定 commit `d6fc3abfde2467aa5b6b5598fea2f0e1ece2fdac`

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

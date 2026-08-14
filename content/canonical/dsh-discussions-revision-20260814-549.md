# DSH Discussions 当前复核：从 Web 排障到第一个社区插件

## 一句话结论

截至 2026-08-13T23:44:07Z，DeepSeek Harness 官方 Discussions 分页复核得到 6 页、535 条公开讨论，编号从 `#12` 到 `#549`，中间存在编号空缺。

这不是 DSH 发布了新版本，而是早期生态开始同时暴露几类真实需求：新手遇到工作区和历史加载问题，Windows 用户遇到路径边界，Web 用户需要更完整的错误信息，开发者开始发布可以安装的社区插件。

## 新增信号怎么分层

### 1. Web 和 Windows 排障：有代码线索，但不是官方修复

Discussion #541 记录了 Web UI “打开文件”时的主机边界和错误被静默吞掉的问题；#542 报告 Windows 工作区路径可能出现 `C:\\a/b` 这样的混合分隔符；#543 报告 Web transport 失败时只显示 HTTP 状态而缺少服务端错误正文。

其中 #542 和 #543 不只是用户描述。官方固定 commit `47f9438` 中，`resolveWorkspacePath` 确实用字符串拼接 `/` 连接工作区和相对路径，Web RPC 也确实在非 2xx 时只抛出状态码错误。它们支持“值得排查和向上游反馈”的判断，但不等于所有 Windows 用户都会复现，也不等于官方已经接受或修复。

对新手来说，三个问题应该分开处理：

- 点击文件没有反应，先区分本机 Web、远程 Web 和“文件在 host 上打开”的差异；
- Windows 路径报错时，记录系统、工作区路径、DSH 版本、原始路径和完整输出，不要只截最后一行；
- 看到 `HTTP 500` 时保留浏览器、DSH 进程和 host 端日志，因为状态码本身通常不够定位原因。

### 2. 工作区、历史和输入体验：当前只能记录报告

Discussion #540 说长文本粘贴到对话框时会卡顿，#547 以截图报告无法添加工作区，#548 报告历史加载失败并出现 `RangeError: Maximum call stack size exceeded`。这些都是值得进入 FAQ 和复现队列的信号，但目前没有足够信息把它们合并成一个根因，也没有本地复现。

所以新手遇到类似情况时，应该补齐：浏览器、操作系统、DSH/npm 版本、工作区路径长度、文本长度、session 标识、重现步骤和是否刷新后仍然存在。截图可以帮助定位，但不能替代这些字段。

### 3. #544：一个值得观察的社区 DSH 插件

Discussion #544 展示了 [`dsh-agent-messaging`](https://github.com/happyren/dsh-agent-messaging)，它的目标是让不同 session 之间通过 `peer_list`、`peer_send` 和 `peer_inbox` 传递消息。

这不是官方插件，也不是我已经替你安装过的推荐方案。对它做静态审查，可以确认它具备当前 DSH bundle 路线的几个关键形状：

- `package.json` 声明了 `dsh.bundle.patch`；
- `cordis.patch.yml` 把插件层插入 profile；
- `src/index.ts` 依赖 `tools`、`agents` 和 `sessionQuery`，并通过 `ctx.effect()` 注册清理动作；
- 包含 `prepare` 构建脚本，Git 依赖安装时可能需要在 profile 中允许构建脚本；
- README 建议 pin commit，而不是直接跟随浮动分支。

这正好可以作为新手理解“插件不只是一个 JS 文件”的例子：manifest 决定它能否作为 bundle 被发现，patch 决定它如何进入配置树，运行时代码决定它注册什么能力，构建脚本和依赖则决定安装时会在本机执行什么。

## 安装这个社区插件前，至少做四件事

1. 阅读固定 commit 的 `package.json`、README、patch 和入口源码。
2. 确认它的 `prepare`、依赖和 `allowBuilds` 要求；安装构建脚本不等于 DSH 沙箱。
3. 把 Git 依赖锁到 commit，先在隔离 profile 里做 `--dump-config` 和加载检查。
4. 把“包能安装”“插件能加载”“消息能投递”“模型真的按预期调用”分成四个验证点。

本次 dsh-learn 只完成了静态审查，没有下载或安装该插件，没有启动它，也没有调用模型。因此，当前最准确的标签是“社区插件观察对象”，不是“已验证兼容插件”。

## 对 dsh-learn 新手入口的直接影响

- 新手排障页需要加入“Web UI、host、工作区路径和 transport 错误不是同一个层次”的提示。
- 插件教程可以增加一个真实社区包的阅读案例，但仍然把 `labs/hello-plugin` 作为第一个无 Key 实验，避免陌生安装脚本成为入门单点故障。
- 社区插件索引应同时记录来源、固定 commit、bundle 声明、构建脚本、能力范围和验证状态，不应该只贴一个 GitHub 链接。

## 事实边界

本卡没有调用模型 API，没有复现 Windows、远程 Web、工作区或历史加载问题，没有下载或运行第三方插件，也没有把社区报告写成官方修复。官方仓库代码基线仍记录为 `47f943859bef60e4160492346772ded9b24f765a`；本卡记录的是 Discussions 和生态仓库的变化。

维护基线（2026-08-14）：官方 Discussions 当前已复核到 6 页、600 条公开讨论，编号从 `#12` 到 `#614`；这个新分页只用于确认上游仍在增长，不改写本卡对 #539–#549 的历史观察，也不把 #550–#614 的其他报告混入本卡结论。

来源：

- [DeepSeek Harness Discussions 第 1 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=1) 至 [第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [#541](https://github.com/deepseek-ai/deepseek-harness/discussions/541)、[#542](https://github.com/deepseek-ai/deepseek-harness/discussions/542)、[#543](https://github.com/deepseek-ai/deepseek-harness/discussions/543)、[#544](https://github.com/deepseek-ai/deepseek-harness/discussions/544)、[#547](https://github.com/deepseek-ai/deepseek-harness/discussions/547)、[#548](https://github.com/deepseek-ai/deepseek-harness/discussions/548)、[#549](https://github.com/deepseek-ai/deepseek-harness/discussions/549)
- [官方 `resolveWorkspacePath` 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/runtime/src/client/workspaces/path.ts)
- [官方 Web RPC 源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/connection/src/client/rpc.ts)
- [dsh-agent-messaging](https://github.com/happyren/dsh-agent-messaging)，静态审查固定 commit `d6fc3abfde2467aa5b6b5598fea2f0e1ece2fdac`

# DSH Discussions #711–#720：先看懂工具调用和启动问题，再碰社区插件

截至 2026 年 8 月 14 日这次维护复核，DeepSeek Harness 官方 Discussions 第 7 页覆盖 #619 到 #720，最近十条 #711–#720 集中出现了工具调用、Python SDK、Windows、存储、流式重试和 Web 启动等信号。

先说结论：这些帖子是用户报告、Ideas、Q&A 或 Show and tell，不等于官方已经修复，也不等于 dsh-learn 已经动态验证。尤其是帖子里出现的补丁建议、第三方插件安装命令和模型调用现象，都要和“官方文档”“本地复现”“社区展示”分开记录。

## 这十条分别在说什么

### #711：工具描述里的 `{{...}}` 可能破坏 code-mode prompt

作者报告，第三方工具的描述如果包含字面 `{{...}}`，生成 SDK 文本时可能被当成 prompt 变量，导致模型请求前就失败。帖子提出在 TypeScript/Python 文档渲染阶段拆开大括号，并声称补了回归测试。

这可以作为“工具描述也会进入提示词组装链路”的排障线索，但帖子里的修改和测试不是官方合并回执。dsh-learn 没有修改或动态复现这个问题，不能把它写成所有第三方工具都会触发的确定性结论。

### #712：Python SDK 跨进程恢复持久化会话的报告

作者报告，同一个 `session_id` 在新进程中继续运行时出现 id collision，第一次运行成功，新的进程恢复失败；帖子还提到直接调用 `session/load` 或 `session/resume` 时得到 unknown runtime method。

它提醒新手：内存中连续运行成功，不代表把进程关闭后还能恢复同一个持久会话。这个帖子使用了具体 SDK、runtime 和 Python 版本，但 dsh-learn 没有安装或运行该 SDK，也没有把它推广成当前所有 Python 项目的行为。

### #713：多选菜单跳转报告

这条帖子的正文只有“同上”，目前只能确认它在官方列表中存在，不能从标题推导根因、系统范围或修复方式。遇到类似 UI 问题，保留操作系统、版本、最小步骤和截图，比直接复制别人的猜测更有用。

### #714：两个社区插件的 Show and tell

作者展示了 `dsh-plugin-hello` 和 `dsh-plugin-browser` 两个独立仓库，并在帖子中给出 `dsh plugin --profile demo add github:...` 的安装形式；浏览器插件还提到 Playwright 和 Chromium。

这对插件作者很有参考价值，但它首先是社区展示，不是官方插件目录，也不是 dsh-learn 的兼容性回执。dsh-learn 本轮没有下载、安装或运行这两个插件，不能把帖子里的命令改写成“新手直接执行”的安全教程。完全新手仍先使用本仓库的本地 `hello-plugin`，在临时 `DSH_HOME` 中验证安装、配置导出、加载和移除。

### #715 与 #716：带参数工具调用的两个相邻信号

`#715` 报告带参数工具调用生成 `{"input": ""}`，导致真实参数名缺失；`#716` 是一个缺少 `command` 参数的具体问答报告。两条帖子相邻，现象也有交集，但不能仅凭相邻编号就断言它们是同一个根因，更不能把“无参数工具正常”推广到所有模型、provider 或版本。

新手排障时，先把“工具是否注册”“schema 是否出现在配置”“模型是否生成了参数”“执行器是否接受参数”拆成四层；不要用一次模型回答替代这四层验证。

### #717：Windows 子进程和 shell 的多项 Ideas

帖子提出 Windows 下进程终止、后台孙进程输出、spill 文件权限、持久 bash 超时和默认 shell 路径等问题，并给出源码位置和复现方向。这是很有价值的跨平台排障线索，但帖子分类是 Ideas，dsh-learn 没有在 Windows 上复现，也没有把建议写成官方修复。

### #718：存储与持久化并发容错的 Ideas

帖子讨论 SQLite `busy_timeout`、JSONL 回滚、coordinator 重试和 write-behind 失败后的滞留。它涉及并发、文件写入和恢复语义，不能用一次普通本地启动证明或否定。没有明确复现环境和版本时，不要把它转成“数据一定会丢”的宣传式结论。

### #719：流式超时和重试记录的 Ideas

帖子认为 DeepSeek 流式适配器在空闲超时后可能继续写入已缓冲分片，取消重试退避后可能留下幽灵 retry 记录。它提出了与另一个适配器对比的源码位置，但 dsh-learn 没有动态制造网络黑洞或取消竞态，因此这里只记录为待验证的代码审查线索。

### #720：Web 连接、端口和 Windows 退出信号

帖子讨论 WebSocket 半开连接、`--port` 范围校验和 Windows 下 SIGTERM 处理。它对新手最直接的价值是提醒：网页卡住、端口写错和进程无法优雅退出可能属于不同层次的问题。当前教程仍使用固定 rc.6 命令和本机 `127.0.0.1:3080`，没有把帖子里的建议写成已验证补丁。

## 完全新手现在应该怎么做

第一层不要从这些社区报告开始，也不要直接安装 #714 里的第三方插件：

1. 按[完全新手教程：从安装到第一个插件](dsh-zero-to-first-plugin-rc6.md)准备 Node.js。
2. 用固定版本启动 Web UI，先确认网页能打开；不填 API Key 时，只记录“页面层可用”。
3. 用 `node scripts/plugin-doctor.mjs` 检查插件实验前置条件。
4. 在临时 `DSH_HOME` 中运行本仓库的 `node labs/hello-plugin/verify.mjs`，分开看安装、配置、加载和移除结果。
5. 只有本地基线稳定后，再阅读社区插件的 bundle、构建脚本、外部服务和权限范围。

## 证据边界

- 本卡基于官方 Discussions 列表和 #711–#720 详情页，版本基线为官方 commit `47f9438` 与 `@deepseek-ai/dsh@0.1.0-rc.6`。
- 本卡没有在 Windows 或 Linux 上动态复现 #717–#720，没有安装 #714 的两个社区插件，也没有调用模型 API。
- 帖子中的补丁、环境、安装命令和模型现象仍属于帖子作者的报告，除非另有一手官方修复或本地复现，不写成 dsh-learn 已验证事实。
- 本卡不使用、不保存、不展示 API Key；知乎发布必须经过主理人明确同意。

## 来源

- [官方 Discussions 第 7 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=7)
- [#711](https://github.com/deepseek-ai/deepseek-harness/discussions/711) · [#712](https://github.com/deepseek-ai/deepseek-harness/discussions/712) · [#713](https://github.com/deepseek-ai/deepseek-harness/discussions/713) · [#714](https://github.com/deepseek-ai/deepseek-harness/discussions/714)
- [#715](https://github.com/deepseek-ai/deepseek-harness/discussions/715) · [#716](https://github.com/deepseek-ai/deepseek-harness/discussions/716) · [#717](https://github.com/deepseek-ai/deepseek-harness/discussions/717) · [#718](https://github.com/deepseek-ai/deepseek-harness/discussions/718)
- [#719](https://github.com/deepseek-ai/deepseek-harness/discussions/719) · [#720](https://github.com/deepseek-ai/deepseek-harness/discussions/720)
- [官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

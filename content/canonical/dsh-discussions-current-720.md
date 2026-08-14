# DSH 当前 Discussions 复核：新手先分清首次配置、插件生命周期和启动问题

截至 2026 年 8 月 14 日这次维护复核，DeepSeek Harness 官方 Discussions 公开列表从此前的 7 页、696 条、最后编号 `#714` 变化到 7 页、700 条、最后编号 `#720`。编号中间存在空缺；列表变长本身不等于 DSH 发布了新功能，也不等于某个用户报告已经修复。

这次新增条目里，最值得新手先知道的是几类容易混淆的边界：

- [#619](https://github.com/deepseek-ai/deepseek-harness/discussions/619) 报告首次打开 Web UI 时，API Key 和工作区都没有配置，页面虽然能打开，但输入区域仍然不可用。这是用户报告，不是 dsh-learn 的动态复现；它也解释了为什么“网页打开了”不等于“模型可以回答”。
- [#620](https://github.com/deepseek-ai/deepseek-harness/discussions/620) 讨论动态 Cordis 插件被 `undefine` 后无法恢复，属于插件生命周期与持久化提案。新手第一次实验应该优先使用 dsh-learn 的临时 `DSH_HOME`，并把 `stop`、`remove` 和不可恢复的删除动作分开理解。
- [#623](https://github.com/deepseek-ai/deepseek-harness/discussions/623) 报告从源码构建时缺少 `unrun`。普通用户使用 npm 发布包时不需要先走源码构建；不要把源码开发链路的问题混进第一条安装命令。
- [#720](https://github.com/deepseek-ai/deepseek-harness/discussions/720) 讨论 WebSocket 半开连接、`--port` 范围校验和 Windows 退出信号。这些是用户对连接与启动行为的分析，不能直接当成所有系统都适用的修复命令。

因此，完全新手仍按下面的顺序做：

1. 安装满足当前官方要求的 Node.js。
2. 用固定版本命令启动本机 Web UI：

   ```bash
   npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
   ```

3. 浏览器打开 `http://127.0.0.1:3080`，确认终端进程仍在运行。
4. 第一次看到 API Key 提示时，可以先选择稍后配置；这只验证 Web UI，不代表模型已经可用。
5. 先运行 dsh-learn 的无 Key、临时 profile 插件实验，确认安装、配置导出、加载和移除四个结果，再进入 provider、模型和凭据设置。

完整操作请从[完全新手教程：从安装到第一个插件](dsh-zero-to-first-plugin-rc6.md)开始。教程包含 Node.js 下载页、终端命令、首次 API Key 提示、跳过 Key 后的 Web UI、GitHub 下载 ZIP、插件目录和无 Key 插件实验截图。截图只负责带路，当前机器的版本、终端输出和加载结果才是验收依据。

本卡的版本基线是官方 commit `47f9438` 和 `@deepseek-ai/dsh@0.1.0-rc.6`。本次没有在 Windows 或 Linux 上复现这些用户环境，没有安装第三方插件，没有调用模型 API，没有使用或保存 API Key，也没有发布知乎。

## 来源

- [DeepSeek Harness Discussions 当前分页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=7)
- [官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

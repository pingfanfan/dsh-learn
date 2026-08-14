# DSH Discussions 当前复核：从 #721 到 #822

截至 2026 年 8 月 14 日，DeepSeek Harness 官方 Discussions 的公开分页已经推进到第 8 页，最后编号为 `#822`。编号连续性并不稳定，分页变长也不等于 DSH 发布了新功能；下面把用户报告、功能建议、社区插件展示和高风险安全信息分开处理。

## 先给完全新手的结论

第一次安装和制作插件，仍然从[完全新手快速上手卡](dsh-beginner-quickstart-rc6.md)开始。当前最值得记住的不是某一个零散报错，而是这四层不要混在一起：

1. Node.js、`npx`、pnpm 和工作区路径，属于环境与启动层。
2. API Key、provider、模型和 workspace，属于模型使用层。
3. 插件包安装、配置组合、加载和移除，属于插件生命周期层。
4. 工具参数、会话事件和沙箱权限，属于插件作者或高级排障层。

网页能够打开，只能证明 Web UI 进程和页面层有响应；它不等于模型已经可用。插件包安装返回成功，也不等于插件已经加载，更不等于插件安全。

## 对新手最有用的几条信号

### 1. Windows 工作区路径仍要留意

官方 Discussions [#727](https://github.com/deepseek-ai/deepseek-harness/discussions/727)、[#800](https://github.com/deepseek-ai/deepseek-harness/discussions/800) 和 [#821](https://github.com/deepseek-ai/deepseek-harness/discussions/821) 都围绕 Windows 原生目录选择器、中文路径或工作区路径展开。它们是不同用户的报告，不是 dsh-learn 对所有 Windows 版本的动态复现，也不是官方已经合并的修复。

第一次排查时，可以先把练习项目放在较短、只含英文和数字的路径中，再单独测试中文目录；这是一条低风险的定位建议，不是永久解决方案。遇到问题时，把操作系统、DSH 版本、选中的完整路径和原始错误分开记录，不要先修改插件代码。

### 2. pnpm 提示是源码开发路径的门槛

[Discussion #822](https://github.com/deepseek-ai/deepseek-harness/discussions/822) 建议在源码运行说明前补充 pnpm 的全局安装提示。它是社区建议，不应写成官方已经接受的改动。dsh-learn 的新手卡已经把下面的命令放在源码路径的前面：

```bash
npm install --global pnpm
```

不过，完全新手第一次使用不需要从源码启动。先走固定版本的 `npx` 路径，只有准备修改 DSH 本体或复现源码构建问题时，才进入 `pnpm install`、`pnpm run build` 这条支线。

### 3. 社区插件不等于官方插件

[Discussion #738](https://github.com/deepseek-ai/deepseek-harness/discussions/738) 展示了 Windows 诊断插件，[Discussion #812](https://github.com/deepseek-ai/deepseek-harness/discussions/812) 展示了一个面向来源核验的社区插件。它们可以作为生态观察对象，但不是官方推荐，也没有因为出现在 Discussions 就自动获得兼容性或安全背书。

新手安装任何第三方插件前，至少要看清楚：包的来源、版本、许可证、安装脚本、需要注入的服务、读写范围和移除方式。第一次练习优先使用 dsh-learn 的临时 `DSH_HOME` 和无 Key 示例；不要把未经审计的社区插件装进日常 profile。

## 对插件作者最有价值的信号

- [#802](https://github.com/deepseek-ai/deepseek-harness/discussions/802) 讨论下游插件自定义 Session 事件的持久化问题。它提醒插件作者：能在 TypeScript 中声明一个事件，不代表标准恢复流程已经认识它。没有明确的上游支持前，不要把自定义事件当成可恢复数据协议。
- [#805](https://github.com/deepseek-ai/deepseek-harness/discussions/805) 报告 Web GUI 工具参数可能被统一成 `{"input":""}`。这是用户报告，不能直接推广成所有模型、所有工具和所有版本都会发生的问题；应先记录模型、DSH commit、工具最终 schema 和实际调用 JSON。
- [#725](https://github.com/deepseek-ai/deepseek-harness/discussions/725) 与 [#739](https://github.com/deepseek-ai/deepseek-harness/discussions/739) 分别涉及流式工具调用解析和 reasoning 内容回传。它们属于 provider/模型适配层，不应和插件包安装失败混为一谈。

这也是 dsh-learn 继续维护工具 schema doctor、最小复现模板和版本绑定教程的原因：先把“工具定义错误”“模型适配错误”“网络阻塞”和“插件代码错误”分开，才有可能给上游提交可复用的报告。

## 高风险条目如何处理

[Discussion #817](https://github.com/deepseek-ai/deepseek-harness/discussions/817) 是安全审计报告，涉及沙箱、审批边界和本地 RPC 等高风险主题。dsh-learn 不复现、不扩写利用细节，也不把它制作成面向新手的教程；这类内容应遵循上游的私密披露路径。看到“安全问题”时，不要把完整 PoC、凭据、私有路径或可直接利用的步骤粘贴进公开 Issue、文章或插件 README。

## 这次复核没有证明什么

- 没有在本轮调用模型 API。
- 没有安装或运行 #738、#812 的社区插件。
- 没有把任何用户报告写成官方修复、官方功能或 dsh-learn 动态复现。
- 没有把 Discussions 的热度写成插件市场需求，也没有据此自动建立插件商店。
- 知乎仍然是草稿状态，发布必须经过主理人明确同意。

## 来源与版本边界

- [DeepSeek Harness Discussions 第 8 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=8)
- [官方 README 固定 commit](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- 本卡基线：`@deepseek-ai/dsh@0.1.0-rc.6`，commit `47f9438`。

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

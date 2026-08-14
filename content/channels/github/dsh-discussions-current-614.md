# DSH Discussions #592–#614：新手先分清路径、端口、浏览器和模型设置

截至 2026 年 8 月 14 日这次复核，DeepSeek Harness 官方 Discussions 已经有 6 页、600 条公开讨论，编号从 `#12` 到 `#614`，中间存在编号空缺。#592–#614 里既有使用问题，也有功能提案、社区项目和插件作者的实验结果，它们可以帮助新手判断自己卡在哪一层，但不能直接当成 DSH 已经合并的功能。

版本基线仍固定为 `@deepseek-ai/dsh@0.1.0-rc.6` 和官方 commit `47f9438`。本卡没有在 Windows 或 Linux 上动态复现这些报告，没有安装第三方插件、没有调用模型 API，也没有使用或保存 API Key。

## 先看启动：端口和原生依赖是两类问题

第一次使用 DSH，仍然从完全新手教程里的固定命令开始：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

官方 README 说明它默认把 Web UI 开在本机 `127.0.0.1:3080`，所以浏览器打不开时，先看终端里的启动结果，不要一上来重装 Node.js 或修改模型设置。

Discussion #602 给出的是典型的端口冲突报告，错误里出现 `EADDRINUSE`，意思是 3080 已经被另一个进程占用。评论里有人建议手动加 `--port <端口号>`，但这条回复不是官方修复，也不是 dsh-learn 在本机做出的动态验证；新手可以先检查占用 3080 的进程，再查看当前命令的帮助，确认端口参数后再换端口。

Discussion #600 是另一种情况，作者报告 `dsh web` 在终端会话收到 `SIGHUP` 后静默退出，和“端口被占用”不是同一个故障。它更接近服务托管方式的问题，不能靠换 API Key 或重新安装插件解决。

Linux 用户还要留意 #605。作者报告 `node-pty` 在 Linux x64 环境没有找到 `pty.node`，导致 subprocess 插件加载失败，整个 plugin tree 没能启动，文中还写了手动 `node-gyp rebuild` 的 workaround。这仍然是单个社区环境的报告，没有经过 dsh-learn 复现，不能把修改 npx 缓存目录写成通用安装步骤。

## 网页打开以后，工作区和浏览器仍可能单独出问题

有些问题发生在 Web UI 已经启动之后。#592 只报告带空格的工作区路径无法读取，#595 说选择工作目录的弹窗可能停留在后台，#606 则是初始工作区窗口无法通过下拉选择目录；这些报告都还缺少足够的跨系统复现信息，先记录操作系统、路径形式、浏览器、工作区目录和第一段错误，比直接改目录名更有价值。

#609 是 Firefox 打开 DSH 时的 WebGL 报告，错误指向浏览器无法创建 WebGL context。它不等于 DSH 的模型接口坏了，也不等于所有 Firefox 用户都会遇到，应该把浏览器渲染问题和 Node.js 启动问题分开记录。

#601 的问题更基础：提问者发现 DSH 是 Web UI，不是已经打包好的桌面应用。评论里有人提到 Electron 或浏览器壳，这些是社区想法，不是官方桌面版路线。新手先把它理解成本机运行的 Web 服务就够了，终端进程还在运行，浏览器才有页面可访问。

## 切换模型和接入外部工具，先看它属于哪一种证据

#611 直接问“怎么接入其他大模型”，评论建议从设置里的 provider 入口查看，也有人提到 `opencode-go`。这能说明用户确实在寻找多 provider 用法，但评论没有形成一份经过官方确认的通用配置教程，不能把某个 provider 名称写成所有账户都能直接使用的答案。对于新手，先完成 Web UI 启动，再在 Settings → Models 里记录 provider、模型名、端点和凭据引用，模型请求失败时不要倒推成 DSH 没有启动。

#599 讨论第三方网关如何按会话归属用量，#593、#594、#597 则分别提出 ACP steer、流式文本和会话级 MCP 的扩展方案。这些帖子都在讨论接口边界，其中包含作者自己的代码分析和测试声明，但它们仍是 Ideas 或社区提案，不是已经进入 rc.6 的标准能力。#598 提到 Docker 部署和外部仓库，也应该先按社区建议看待，不能因为帖子里有链接就把它列为官方安装方式。

#614 关于 `supportsDeveloperRole: false` 的格式问题同样没有给出可直接复制的官方答案。遇到这类配置问题，最小复现里应带上 DSH 版本、provider、配置字段所在位置和完整错误，不要只截一行设置项。

## 给新手的实际顺序

先用固定 rc.6 命令确认 DSH 进程能启动，再确认浏览器能打开本机页面，接着创建一个最简单的工作区，最后才进入 provider、模型和插件。如果第一步就是端口或原生模块错误，就先保留启动日志；如果页面能打开但目录选择、WebGL 或工作区出错，就把它作为 UI/浏览器问题记录；如果界面正常而模型请求失败，再单独检查 provider、端点和凭据引用。

提交 Discussion 时，写清精确版本、操作系统、Node.js、包管理器、profile、最小命令、实际结果和预期结果，删除 API Key、Cookie、Authorization header、私有路径和完整内部日志。#592–#614 最值得新手学会的不是某一条神奇修复命令，而是先判断错误发生在启动、工作区、浏览器、模型还是外部插件这一层。

## 来源

- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [当前分页快照（复核至 #614）](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [#592：带空格的工作区路径](https://github.com/deepseek-ai/deepseek-harness/discussions/592)
- [#593：ACP steer 提案](https://github.com/deepseek-ai/deepseek-harness/discussions/593)
- [#594：ACP 流式文本提案](https://github.com/deepseek-ai/deepseek-harness/discussions/594)
- [#597：会话级 MCP 提案](https://github.com/deepseek-ai/deepseek-harness/discussions/597)
- [#598：Docker 部署建议](https://github.com/deepseek-ai/deepseek-harness/discussions/598)
- [#599：第三方网关会话用量信号](https://github.com/deepseek-ai/deepseek-harness/discussions/599)
- [#600：SIGHUP 静默退出报告](https://github.com/deepseek-ai/deepseek-harness/discussions/600)
- [#601：Web UI 与桌面端问答](https://github.com/deepseek-ai/deepseek-harness/discussions/601)
- [#602：3080 端口占用报告](https://github.com/deepseek-ai/deepseek-harness/discussions/602)
- [#605：Linux node-pty 报告](https://github.com/deepseek-ai/deepseek-harness/discussions/605)
- [#606：工作区创建报告](https://github.com/deepseek-ai/deepseek-harness/discussions/606)
- [#609：Firefox WebGL 报告](https://github.com/deepseek-ai/deepseek-harness/discussions/609)
- [#611：接入其他大模型问答](https://github.com/deepseek-ai/deepseek-harness/discussions/611)
- [#614：developer role 配置问题](https://github.com/deepseek-ai/deepseek-harness/discussions/614)
- [DeepSeek Harness README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

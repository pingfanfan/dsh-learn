# DSH 新手排障，先分清路径、端口、浏览器和模型设置

截至 2026 年 8 月 14 日这次维护复核，官方 Discussions 当前来源已复核到第 12 页、观察到的最后编号为 `#1159`，中间存在编号空缺。此前分页维护到 7 页、700 条、#720，后续分页只用于确认上游增长，不改写本文对 `#592–#614` 这组历史讨论的观察，也不把 `#615–#1159` 的其他报告混入本文结论。本文其中既有使用问题，也有功能提案、社区项目和插件作者的实验结果，它们可以帮助新手判断自己卡在哪一层，但不能视为 DSH 已经合并的功能。


如果你第一次用 DSH，看到端口、工作区、provider 这些词，不用先把它们全部学会，我们先判断问题发生在哪一层，再决定下一步看终端、浏览器还是设置页面。


版本基线仍固定为 `@deepseek-ai/dsh@0.1.0-rc.6` 和官方 commit `47f9438`，本卡没有在 Windows 或 Linux 上动态复现这些报告，没有安装第三方插件、没有调用模型 API，也没有使用或保存 API Key。


先把 DSH 当成本机里的一个网页服务，终端负责让它运行，浏览器负责显示页面，模型和插件属于后面的层次，这样遇到报错时，就不会把所有问题都归到 API Key 上。


## 启动故障先看端口和原生依赖

第一次使用 DSH，仍然从[完全新手教程](dsh-zero-to-first-plugin-rc6.md)里的固定命令开始。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

官方 README 说明它默认把 Web UI 开在本机 `127.0.0.1` 的 3080 端口，所以浏览器打不开时，先看终端里的启动结果，不要一上来重装 Node.js 或修改模型设置。

Discussion #602 给出的是典型的端口冲突报告，错误里出现 `EADDRINUSE`，意思是 3080 已经被另一个进程占用，评论里有人建议手动加 `--port <端口号>`，但这条回复不是官方修复，也不是 dsh-learn 在本机做出的动态验证。新手可以检查占用 3080 的进程，再查看当前命令的帮助，确认端口参数后换端口。

Discussion #600 是另一种情况，作者报告 `dsh web` 在终端会话收到 `SIGHUP` 后静默退出，和端口被占用不是同一个故障，它更接近服务托管方式的问题，不能靠换 API Key 或重新安装插件解决。

Linux 用户还要留意 #605。作者报告 `node-pty` 在 Linux x64 环境没有找到 `pty.node`，导致 subprocess 插件加载失败，整个 plugin tree 没能启动，文中还写了手动 `node-gyp rebuild` 的 workaround，这仍然是单个社区环境的报告，没有经过 dsh-learn 复现，不能把修改 npx 缓存目录写成通用安装步骤。

这类启动问题适合留下完整的终端截图，截图里应该包含命令、版本、错误第一段和终端提示符。只截一行红色报错，别人无法判断它发生在下载、原生依赖还是服务启动阶段，路径中可能包含用户名，公开前要先遮掉私有路径。

端口问题还要和进程问题分开，`EADDRINUSE` 说明目标端口已经被占用，`SIGHUP` 静默退出说明进程收到了会话信号，`node-pty` 缺少 `pty.node` 则发生在原生依赖加载层。这三个现象都可能让浏览器打不开，但处理方向并不相同。

## Web UI 启动后还要检查工作区与浏览器

有些问题发生在 Web UI 已经启动之后，#592 只报告带空格的工作区路径无法读取，#595 说选择工作目录的弹窗可能停留在后台，#606 则是初始工作区窗口无法通过下拉选择目录。这些报告都还缺少足够的跨系统复现信息，先记录操作系统、路径形式、浏览器、工作区目录和第一段错误，比贸然改目录名更有价值。

#609 是 Firefox 打开 DSH 时的 WebGL 报告，错误指向浏览器无法创建 WebGL context，它不等于 DSH 的模型接口坏了，也不等于所有 Firefox 用户都会遇到，应该把浏览器渲染问题和 Node.js 启动问题分开记录。

#601 的问题更基础，提问者发现 DSH 是 Web UI，不是已经打包好的桌面应用，评论里有人提到 Electron 或浏览器壳，这些是社区想法，不是官方桌面版路线。新手先把它理解成本机运行的 Web 服务就够了，终端进程还在运行，浏览器才有页面可访问。

页面打开以后，浏览器地址栏也属于排障证据，先确认地址是本机的 `127.0.0.1` 和正确端口，再确认启动 DSH 的终端仍然没有退出。工作区弹窗停在后台时，可以检查窗口切换和浏览器权限，但不要因此判断模型设置错误，Firefox 的 WebGL 报告也应先按浏览器渲染问题处理。

如果要附截图，建议至少保留两张，第一张展示终端启动命令和端口，第二张展示浏览器地址栏和页面现象，两张图配上操作系统、浏览器和 DSH 版本，通常比一张裁掉地址栏的页面截图更有复查价值。

## 模型与外部工具需要单独判断

#611 询问 `怎么接入其他大模型`，评论建议从设置里的 provider 入口查看，也有人提到 `opencode-go`。这能说明用户确实在寻找多 provider 用法，但评论没有形成一份经过官方确认的通用配置教程，不能把某个 provider 名称写成所有账户都能使用的答案。对于新手，先完成 Web UI 启动，再在 Settings → Models 里记录 provider、模型名、端点和凭据引用，模型请求失败时不要倒推成 DSH 没有启动。

#599 讨论第三方网关如何按会话归属用量，#593、#594、#597 则分别提出 ACP steer、流式文本和会话级 MCP 的扩展方案，这些帖子都在讨论接口边界，其中包含作者自己的代码分析和测试声明，但它们仍是 Ideas 或社区提案，不是已经进入 rc.6 的标准能力。#598 提到 Docker 部署和外部仓库，也应该先按社区建议看待，不能因为帖子里有链接就把它列为官方安装方式。

#614 关于 `supportsDeveloperRole` 字段设为 false 的格式问题同样没有给出可照搬的官方答案。遇到这类配置问题，最小复现里应带上 DSH 版本、provider、配置字段所在位置和完整错误，不要只截一行设置项。

模型设置属于另一层，页面能打开只能证明 Web UI 有响应，不能证明 provider、模型名、端点和凭据引用都正确。新手可以先在设置页面记录字段名称，再用不含凭据的配置片段描述问题，不要把完整环境变量、请求头或账户信息放进截图。

外部工具和插件也不要与 provider 一起排查，ACP、MCP、Docker 和第三方网关在这些讨论里更多是提案或社区建议，看到仓库链接不代表它已经是官方安装方式，看到工具名称也不代表当前 profile 已经加载它。先完成无 Key 的 DSH 启动和本地插件基线，再增加一个变量，结果才容易解释。

## 新手可以按这个顺序记录

新手可按四个检查点推进，先用固定 rc.6 命令确认 DSH 进程，再确认浏览器能打开本机页面，然后创建一个最简单的工作区，之后才进入 provider、模型和插件。最初遇到端口或原生模块错误时保留启动日志，页面能打开但目录选择、WebGL 或工作区出错时，把它作为 UI/浏览器问题记录，界面正常而模型请求失败时，再单独检查 provider、端点和凭据引用。

提交 Discussion 时，写清精确版本、操作系统、Node.js、包管理器、profile、最小命令、实际结果和预期结果，删除 API Key、Cookie、Authorization header、私有路径和完整内部日志，对新手而言，#592–#614 的价值在于先判断错误发生在启动、工作区、浏览器、模型还是外部插件这一层，而不在于寻找某一条神奇修复命令。

你可以把第一次排障记录成一张小卡片，第一行写操作系统和 DSH 精确版本，第二行写启动命令和 profile，第三行写浏览器地址与端口，第四行写最先出现的完整错误，第五行写你原本期待看到的结果，末尾标明这次是否填写了 provider、是否安装了插件，以及问题能否在新建 profile 中重复出现。

这样做还有一个好处，别人可以按启动层、页面层和模型或插件层分别复查，你也能知道下一次只应该改变哪一个变量。对早期项目来说，一张不带凭据、能够复现的排障卡，比一句启动不了更容易变成修复、文档或测试。

对第一次发帖的新手来说，不需要先给问题起一个准确的根因名称，只要把看到的现象、执行过的命令、版本信息和预期结果放在一起，维护者就能先判断它属于启动、浏览器、工作区还是模型层，这比把一次报错包装成确定结论更有用。

如果问题涉及第三方插件或外部网关，还要另起一份记录，写清它的仓库、固定版本、安装方式、profile 和加载结果，插件没有安装就标记为未运行，配置出现不等于入口已经加载，入口加载也不等于模型已经调用工具，这几层都应该各自留下回执。

截图里的示例输出只负责帮助你找到位置，真实回执仍以自己的终端为准，不能把教程里的绿色 PASS 当成已经替你完成的安装。如果某一步没有发生，就把状态写成未运行或待复测，等版本、网络和权限条件具备后再补证据，不要用推测填空。

证据要跟着版本走。

## 验证范围与来源

- 事实边界：历史内容只覆盖 #592–#614，当前分页只作为维护基线更新到第 12 页/#1159。
- 验证边界：没有动态复现 Windows/Linux，没有安装第三方插件，没有调用模型 API。
- 来源：[DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- 当前分页快照（维护复核至 #1159）：[GitHub API](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=12)
- 历史讨论：[#592](https://github.com/deepseek-ai/deepseek-harness/discussions/592)、[#593](https://github.com/deepseek-ai/deepseek-harness/discussions/593)、[#594](https://github.com/deepseek-ai/deepseek-harness/discussions/594)、[#597](https://github.com/deepseek-ai/deepseek-harness/discussions/597)、[#598](https://github.com/deepseek-ai/deepseek-harness/discussions/598)、[#599](https://github.com/deepseek-ai/deepseek-harness/discussions/599)、[#600](https://github.com/deepseek-ai/deepseek-harness/discussions/600)、[#601](https://github.com/deepseek-ai/deepseek-harness/discussions/601)、[#602](https://github.com/deepseek-ai/deepseek-harness/discussions/602)、[#605](https://github.com/deepseek-ai/deepseek-harness/discussions/605)、[#606](https://github.com/deepseek-ai/deepseek-harness/discussions/606)、[#609](https://github.com/deepseek-ai/deepseek-harness/discussions/609)、[#611](https://github.com/deepseek-ai/deepseek-harness/discussions/611)、[#614](https://github.com/deepseek-ai/deepseek-harness/discussions/614)。
- 官方 README（固定 commit）：[47f9438](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

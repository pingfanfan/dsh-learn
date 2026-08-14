# DeepSeek Harness Discussions 新问题分流卡：先分清报告、复现和解决方案

> 事实基线：2026-08-14；DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`；npm `@deepseek-ai/dsh@0.1.0-rc.6`。DSH 仍处于 Developer Preview。本文整理的是官方 Discussions 中的用户报告，不是官方修复公告，也没有调用模型 API。

截至这次复核，官方 Discussions 的公开列表已经到 #614，共 6 页、600 条，编号中间有空缺。下面这张卡专门保留 #37、#38、#40 这三个适合做排障训练的早期案例，当前新增问题则放在[新手启动与问题分流卡](https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-discussions-current-614.md)里，两个入口不要混成一篇“万能修复清单”。

如果你还没有启动过 DSH，先从[完全新手教程：从安装到第一个插件](https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-zero-to-first-plugin-rc6.md)开始，确认 Node.js、Web UI 和本机端口都正常，再拿这张卡整理 Windows、浏览器或会话问题。

## 这一轮新增了哪些可复用线索

### 1. Windows 11 + Firefox 的目录选择窗口层级问题

Discussion [#37](https://github.com/deepseek-ai/deepseek-harness/discussions/37) 的报告环境是 Windows 11、Firefox 153.0esr、`dsh 0.1.0-rc.6`，通过 `dsh web` 打开 Web UI。用户点击“添加工作区”后，原生目录选择对话框出现在浏览器窗口后面；同一报告称 Brave 中没有这个现象。

这只能说明一个待复核的浏览器/桌面窗口交互问题。它不等于“Firefox 一定不兼容”，也不等于“换成 Brave 就是官方解决方案”。

### 2. Windows 目录选择器的 `koffi` 模块加载失败

Discussion [#38](https://github.com/deepseek-ai/deepseek-harness/discussions/38) 报告 `directory picker failed`，错误指向 `@deepseek-ai/dsh-host-directory-picker-native` 尝试加载 `koffi` 但找不到模块。讨论中的后续回复把它初步判断为 Node.js 模块加载失败，但截至本卡基线，没有可写成官方修复的结论。

不要把未经脱敏的错误堆栈贴到公开帖子里。先记录 DSH 精确版本、Node.js 版本、操作系统、包管理器、安装方式和最小复现步骤；错误中的本地路径、用户名和私有目录需要脱敏。

### 3. 会话归档后的查看与恢复入口

Discussion [#40](https://github.com/deepseek-ai/deepseek-harness/discussions/40) 讨论“会话归档后无法查看或恢复”。它说明用户已经遇到归档后的信息架构问题，但不代表当前版本已经提供了恢复入口，也不代表删除 Workspace 注册记录可以恢复 Session。

## 第一次排障时，建议按这个顺序整理

1. 先写清楚你要解决的是窗口层级、目录选择器报错，还是归档会话查看；不要把三个问题混成一篇。
2. 记录 DSH 精确版本、Node.js 版本、系统版本、浏览器和包管理器。
3. 用最短步骤重跑一次，保留第一条错误、退出码和预期结果。
4. 如果是安装或模块加载问题，记录实际安装方式和依赖树；不要只写“装过了”。
5. 如果是 `dsh web` 的 UI 问题，分别记录浏览器、窗口行为和是否能在另一个浏览器复现；对照结果是线索，不是结论。
6. 发到官方 Discussions 前，删除 API Key、Cookie、Authorization header、用户名、私有路径、内部域名和整段私有日志。

## 这张卡明确没有证明什么

- 没有证明 Firefox、Windows 或某个浏览器与 DSH 存在官方兼容性结论。
- 没有证明重新安装、补装某个依赖或复制文件就能解决 `koffi` 错误。
- 没有证明归档 Session 已经可以通过某个隐藏入口恢复。
- 没有进行模型请求，也没有把用户评论当作维护者确认。

如果你要提交新问题，优先把环境和最小复现写完整；如果你要提出功能建议，则单独说明期望行为和不接受的替代方案。这样比贴一整屏未经脱敏的日志更容易得到可复用的反馈。

## 官方来源

- [Discussion #37：Windows 11 下 Firefox 的目录选择对话框](https://github.com/deepseek-ai/deepseek-harness/discussions/37)
- [Discussion #38：无法打开文件夹](https://github.com/deepseek-ai/deepseek-harness/discussions/38)
- [Discussion #40：会话归档后无法查看或恢复](https://github.com/deepseek-ai/deepseek-harness/discussions/40)
- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)

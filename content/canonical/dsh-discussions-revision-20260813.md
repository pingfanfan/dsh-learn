# DSH Discussions 当前复核：列表更新，不等于新增功能

## 一句话结论

截至 2026-08-13，DeepSeek Harness 官方 Discussions 公共列表的 revision 更新为 `ee3d03969f2c4df521d24b3b24e42d8ccc97e94f0449bc06440f88247b3031e5`。当前接口仍返回 30 条公开讨论，编号范围为 `#12` 至 `#41`，没有发现 `#42` 之后的新条目。

这次变化本身不代表 DSH 发布了新功能，也不代表某个用户报告已经被官方修复。现有的社区入口卡、最小复现工具包和问题分流卡继续有效，但涉及具体问题时仍应回到讨论原文核对最新评论。

## 目前能确认什么

- `#12` 仍是维护者的社区欢迎公告，讨论区继续包含 Announcements、Q&A、Ideas、Show and tell 和 General 等入口。
- `#14` 仍是关于 memory 迁移的用户讨论；它可以作为需求信号，不能当成官方已经提供迁移方案的证明。
- `#37`、`#38` 和 `#40` 仍分别涉及 Windows/Firefox 目录选择窗口、Windows 目录选择器依赖加载失败、归档会话查看或恢复问题。
- 这些条目可以帮助用户准备版本、系统、复现步骤和预期结果，但不能据此宣称浏览器兼容性、`koffi` 修复或归档恢复方案已经得到官方确认。

## 新手和排障用户应该怎么做

如果你遇到类似问题，先固定 DSH 版本，例如 `@deepseek-ai/dsh@0.1.0-rc.6`，再记录操作系统、Node.js 版本、浏览器、完整错误边界和最小复现步骤。不要只贴一张截图，也不要把未经验证的解决命令写成结论。

可以继续使用：

- [中文最小复现工具包](./discussion-minimal-repro-kit.md)
- [官方社区入口卡](./discussion-community-entry-47f9438.md)
- [新问题分流卡](./discussion-triage-41.md)

## 事实边界

这张卡只记录官方公开 Discussions 列表的当前复核结果。它没有调用模型 API，没有复现 Windows 问题，也没有把任何讨论回复解释成官方兼容性承诺。DSH 的版本和讨论内容仍在快速变化；下次 revision 变化时，应重新核对具体条目，而不是直接沿用这张卡。

来源：

- [DeepSeek Harness Discussions API](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=30)
- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [Discussion #37](https://github.com/deepseek-ai/deepseek-harness/discussions/37)
- [Discussion #38](https://github.com/deepseek-ai/deepseek-harness/discussions/38)
- [Discussion #40](https://github.com/deepseek-ai/deepseek-harness/discussions/40)

验证基线：DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`；`@deepseek-ai/dsh@0.1.0-rc.6`。

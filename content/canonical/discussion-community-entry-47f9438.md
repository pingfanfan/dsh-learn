# DeepSeek Harness 官方社区入口：先选对板块，再提交最小信息

> 事实基线：2026-08-14；DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`；npm `@deepseek-ai/dsh@0.1.0-rc.6`。本次复核时，官方 Discussions 分页为 6 页、600 条公开讨论，编号从 `#12` 到 `#614`，中间存在编号空缺。DSH 仍处于 Developer Preview，下面的入口和讨论内容可能随官方仓库变化。

## 现在发生了什么

DeepSeek Harness 的官方 GitHub Discussions 已经出现维护者欢迎公告和多个可用板块。欢迎公告说明：真实使用、插件开发、Agent 工作流分享，以及遇到问题时的反馈，都可以放到对应板块中。

当前能直接看到的入口包括：Announcements（维护者公告）、Q&A（使用问题和排障）、Ideas（功能建议）、Show and tell（插件、工作流和实践展示）以及 General（不适合其他板块的讨论）。具体入口以 [官方 Discussions 首页](https://github.com/deepseek-ai/deepseek-harness/discussions) 当前显示为准。

早期讨论已经出现了中文问题，例如把 Codex/Claude Code 的 memory 迁移到 Harness、企微无法添加，以及飞书调查问卷的昵称限制。它们说明社区入口已经不只是一个空页面，但不代表这些问题已经有统一官方解决方案；后续讨论数量还在快速增加，发帖前应以当前首页和板块状态为准。

## 新手应该怎么选

先按“你希望社区给出什么结果”选板块：

1. 想确认当前版本能不能这样用，先发到 **Q&A**。
2. 想请求一个还不存在的能力，发到 **Ideas**。
3. 想展示自己的插件或工作流，发到 **Show and tell**。
4. 想看维护者公告，关注 **Announcements**。
5. 只是补充经验或讨论方向，再考虑 **General**。

不要把“功能建议”“当前报错”和“项目展示”混在一篇帖子里。板块选对，维护者和其他用户更容易给出可复用的回答。

## 发帖前至少准备这些信息

- DSH 的精确版本，而不是只写 `latest`。
- 操作系统、Node.js 和包管理器版本。
- 从干净目录开始的最小命令。
- 实际输出、退出码和你期待的结果。
- 是否在隔离的 `DSH_HOME` 中重试。
- 已经排除的版本、profile 或网络差异。

可以直接复制 [中文 Discussions 最小复现模板](discussion-minimal-repro-kit.md)。发帖前删除 API Key、Cookie、Authorization header、私有路径、内部域名和完整私有日志；需要保留的是错误类型、字段名、退出码和调用顺序。

## 这张入口卡没有证明什么

官方 Discussions 的出现，只能证明社区入口和首批公开讨论已经存在。它不能证明：

- 某个 memory 迁移方案已经被官方支持；
- 某个插件或教程与当前版本兼容；
- 某个中文问题已经得到维护者确认；
- 任何模型 API 调用已经成功。

这些结论仍需分别绑定官方文档、固定版本或本地无 Key 复现结果。

## 官方来源

- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [维护者欢迎公告（Discussion #12）](https://github.com/deepseek-ai/deepseek-harness/discussions/12)
- [关于 memory 迁移的讨论（Discussion #14）](https://github.com/deepseek-ai/deepseek-harness/discussions/14)
- [官方 Discussions 当前分页快照（复核至 #614）](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [DeepSeek Harness README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)

# 第一次上手 DSH，先别急着接模型

第一次跑 DeepSeek Harness，建议先做一件不需要 API Key 的事：把 DSH_HOME 指向临时目录，运行 rc.6 的隔离 profile 探针。

```bash
node labs/cordis-no-key/probe.mjs
```

这次实验能看到 CLI 版本、demo profile、package.json、cordis.patch.yml、pnpm-workspace.yaml，以及 dsh-base 的组合配置树，不能据此宣称模型请求、Web UI、provider 或第三方插件已经通过。

对新手来说，profile 是工作区边界，bundle 是能力组合边界，Cordis 负责上下文、服务、事件和生命周期。想写插件时，先按需求找 ctx.tools、ctx.llm、ctx.commands 或 ctx.jobs，不要一开始复制核心循环。

DSH 还在 Developer Preview，教程要绑定 commit 或 npm 版本。当前这份实验基线是官方 commit 47f9438 和 @deepseek-ai/dsh@0.1.0-rc.6，版本变化后要重跑，网络失败也不能写成 DSH 失败。

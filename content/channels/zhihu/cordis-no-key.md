# 用 0 个 API Key 看懂 DeepSeek Harness 的 Cordis

## 先说结论

第一次接触 DSH，不必一上来申请模型 Key。先把一个隔离 profile 的配置树打印出来，反而更容易理解它的核心：profile 选择能力组合，bundle 复用能力组合，Cordis 负责上下文、服务、事件和生命周期。

## 怎么做

在 dsh-learn 中运行：

```bash
node labs/cordis-no-key/probe.mjs
```

这个 mini-lab 固定在 `@deepseek-ai/dsh@0.1.0-rc.6`，会创建临时 `DSH_HOME`，检查版本、demo profile 初始化和 `--dump-config`。预期能看到 `@deepseek-ai/dsh-base` 以及 timer、LLM、session、sandbox 等基础插件标记。

## 它能帮助你做什么

当你想加模型、工具、命令或后台任务时，可以先回到扩展点地图：模型适配看 `ctx.llm`，工具看 `ctx.tools`，无模型 CLI 命令看 `ctx.commands`，可停止后台任务看 `ctx.jobs`。不要因为文档列出了某个 seam，就把它当成任意 profile 下都已兼容；每个实际插件仍要做注册、teardown 和目标 profile 测试。

## 边界

这个实验没有发起模型请求、没有安装第三方插件、没有验证具体 provider，也没有证明任何运行时 seam 已经兼容。DSH 处于 Developer Preview，升级版本后应重新运行并复核官方文档。

完整实验：[Cordis 无 Key mini-lab](../../labs/cordis-no-key/README.md)。


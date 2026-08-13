# 无 Key 工具插件注册实验

这个实验在 `hello-plugin` 的安装闭环之上增加一层 `ctx.tools`。它把官方 `greet` 工具教程缩成一个可重复的检查，验证插件安装以后能否声明 `inject = ["tools"]`、注册 `greet` schema，并在 profile 启动时从工具注册表读到这个名字。

固定基线：DeepSeek Harness 官方 commit `47f943859bef60e4160492346772ded9b24f765a`，`@deepseek-ai/dsh@0.1.0-rc.6`。

## 直接运行

在 `dsh-learn` 根目录执行：

```bash
node labs/tool-plugin/verify.mjs
```

探针会在临时 `DSH_HOME` 中完成：

1. 版本检查；
2. `dsh plugin --profile demo add ./labs/tool-plugin`；
3. profile manifest 和 `--dump-config` 检查；
4. 启动 profile，等待 `[greet-tool] registered greet`；
5. 移除 bundle，并确认 profile 不再保留它。

## 这个工具做了什么

`index.js` 使用 `inject = ["tools"]` 等待工具注册表，然后调用 `ctx.tools.register()` 注册一个 `greet` 定义。参数 schema 要求 `name` 字段，输出 schema 声明字符串，`render` 把规范值转换成模型可见内容。

这个实验使用原始 JSON Schema 直接注册，目的是减少首次安装时的额外依赖。生产插件应优先参考官方 `defineTool` DSL，它会从参数 schema 推导类型并在执行前校验参数。两者都属于工具注册层，但本实验没有把原始注册示例包装成生产级安全结论。

看到 `[greet-tool] registered greet`，只证明工具已经进入当前 profile 的注册表。实验没有 API Key，没有启动 Web UI，也没有请求模型，所以工具执行结果和模型是否会正确选择 `greet` 仍然是 `NOT_RUN`。

## 官方依据

- [开发一个工具](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/tool.zh.md)
- [工具编写参考](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cookbook/adding-a-tool.zh.md)
- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)

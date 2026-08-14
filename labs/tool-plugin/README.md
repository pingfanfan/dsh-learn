# 无 Key 工具插件注册实验

这个实验在 `hello-plugin` 的安装闭环之上增加一层 `ctx.tools`。它把官方 `greet` 工具教程缩成一个可重复的检查，验证插件安装以后能否声明 `inject = ["tools"]`、注册 `greet` schema，并在 profile 启动时从工具注册表读到这个名字。

固定基线：DeepSeek Harness 官方 commit `47f943859bef60e4160492346772ded9b24f765a`，`@deepseek-ai/dsh@0.1.0-rc.6`。

## 直接运行

在 `dsh-learn` 根目录执行：

```bash
node labs/tool-plugin/verify.mjs
```

如果 npm registry 暂时不可达，先运行离线契约检查：

```bash
node labs/tool-plugin/verify-offline.mjs
```

如果你在改自己的工具插件，可以在真实安装前检查本地入口的最终参数根：

```bash
node scripts/tool-schema-doctor.mjs ./my-tool/index.js
```

它只在本地导入插件，检查传给 `ctx.tools.register()` 的最终定义中 `parameters.type` 是否为 `object`、工具名和 `execute` 是否存在，不访问 npm，也不调用模型。导入陌生插件前仍要阅读其入口文件和构建脚本，因为插件自身可能执行副作用。

这里有一个容易混淆的地方：官方 `defineTool()` 示例里的 `parameters` 是字段映射，例如 `{ name: { type: "string" } }`，它属于作者使用的 DSL，`defineTool()` 会先把它编译成对象根，再交给 `ctx.tools.register()`。如果绕过 `defineTool()` 直接注册，才需要自己写出 `{ type: "object", properties: ... }` 这样的最终 JSON Schema。`tool-schema-doctor` 检查的是后一层，也就是注册表实际收到的工具定义。

离线检查用一个最小的本地工具注册表调用插件入口，验证 `greet` 注册、参数对象根、参数 schema、返回值、执行函数和渲染器。它不证明 DSH runtime 已加载插件，也不证明模型会发起工具调用。

探针会在临时 `DSH_HOME` 中完成：

1. 版本检查；
2. `dsh plugin --profile demo add ./labs/tool-plugin`；
3. profile manifest 和 `--dump-config` 检查；
4. 启动 profile，等待 `[greet-tool] registered greet`；
5. 移除 bundle，并确认 profile 不再保留它。

## 这个工具做了什么

`index.js` 使用 `inject = ["tools"]` 等待工具注册表，然后调用 `ctx.tools.register()` 注册一个 `greet` 定义。这个实验为了减少依赖，直接写最终 JSON Schema 对象根，参数 schema 要求 `name` 字段，输出 schema 声明字符串，`render` 把规范值转换成模型可见内容。

这个实验使用原始 JSON Schema 直接注册，目的是减少首次安装时的额外依赖。生产插件应优先参考官方 `defineTool` DSL，它会从参数 schema 推导类型并在执行前校验参数。两者都属于工具注册层，但本实验没有把原始注册示例包装成生产级安全结论。

看到 `[greet-tool] registered greet`，只证明工具已经进入当前 profile 的注册表。离线检查可以进一步验证执行函数和渲染器，但真实 DSH 实验没有 API Key，没有启动 Web UI，也没有请求模型，所以 DSH runtime 兼容和模型是否会正确选择 `greet` 仍然是 `NOT_RUN`。

## 官方依据

- [开发一个工具](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/tool.zh.md)
- [工具编写参考](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cookbook/adding-a-tool.zh.md)
- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)

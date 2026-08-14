# DSH rc.6 新手排障：启动失败、headless profile 和工具 schema 怎么分

如果你是第一次接触 DSH，终端里出现 `ERR_MODULE_NOT_FOUND` 时，很容易怀疑 Node.js、命令或插件代码。官方 Discussions 最近的几条报告提醒我们，问题有时在包分发和依赖组合本身。

这张卡把新手最容易混淆的三层分开：DSH 启动包、profile/插件依赖、工具 schema。文中明确区分官方文档、社区报告和 dsh-learn 尚未动态复现的内容。

## 先从固定版本启动

如果你还没有安装过 DSH，先看[dsh-learn 完全新手快速上手卡](../../canonical/dsh-beginner-quickstart-rc6.md)和[从安装到第一个插件的完整教程](../../canonical/dsh-zero-to-first-plugin-rc6.md)。两篇已经包含 Node.js、终端、`npx`、浏览器页面、第一次跳过 API Key，以及无 Key 插件安装、加载和移除的截图步骤。

当前教程基线是 `@deepseek-ai/dsh@0.1.0-rc.6`：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

`npx` 会按指定版本运行 DSH，不要求先全局安装 `dsh`。第一次没有输出时，先检查网络、npm registry 和 Node.js 版本，不要立刻改插件文件。

官方 Discussions #1030 和 #1032 都出现了“干净环境运行 `npx @deepseek-ai/dsh web` 启动失败”的报告。#1032 的发帖者还给出了基于静态源码和依赖关系的分析，认为 `@deepseek-ai/cordis-plugin-group` 可能没有随主包进入可用依赖。这个线索值得记录，但本轮 dsh-learn 没有动态复现，不能写成官方已确认的根因或修复。

遇到类似错误时，先保存操作系统、Node.js 版本、DSH 版本、完整命令和原始终端输出，区分干净 npm 缓存与已有缓存的机器，不要随手全局安装不明来源的同名包。可以先运行：

```bash
node scripts/beginner-doctor.mjs --report
```

这只检查本地环境、练习文件和截图，不读取 API Key，也不会安装未知依赖。

## `headless` 不等于同一条安装路径

Discussion #1068 报告的是新 profile 中执行类似下面的安装时，`@deepseek-ai/dsh-code-runtime-worker` 不在 npm registry，导致 `@deepseek-ai/dsh-headless` 安装失败：

```bash
dsh plugin --profile report add @deepseek-ai/dsh-headless
```

“官方生成的默认 headless profile”与“自己创建 profile 后手动添加 dsh-headless”是两种组合路径。#1068 提到的本地 patch workaround 只是作者报告的线索，dsh-learn 本轮没有安装或验证，不应当作通用修复步骤。

学习插件机制时，优先使用 dsh-learn 的隔离 `hello-plugin` 实验：临时 `DSH_HOME`、临时 `demo` profile、安装本地 bundle、检查 `--dump-config`、观察加载日志，最后移除插件。先理解“安装成功”和“插件真正加载”的区别，再研究 headless 组合。

## 工具插件先检查 schema

Discussion #1040 报告 rc.6 的工具 schema 有两个容易漏掉的限制：每个 object 节点都要明确写 `additionalProperties`，`type` 不接受联合类型数组；需要多种形状时使用 `oneOf`。

结构示意如下，具体 API 仍以当前 DSH 版本为准：

```js
parameters: {
  type: "object",
  additionalProperties: false,
  properties: {
    query: { type: "string" }
  }
},
output: {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      result: { type: "string" }
    }
  }
}
```

内部嵌套 object 也要继续声明 `additionalProperties`。不要直接写 `type: ["string", "null"]`；如果需要表达多种类型，应使用当前校验器接受的 `oneOf` 结构。

新手排查工具插件时，先用一个只有字符串字段的最小工具，确认插件能加载；再增加一个嵌套 object；最后才加入可空值、数组或复杂返回值。每次只改一层，错误信息才有意义。

## 其他讨论不要直接当成新功能

Discussion #1025 的 `terminal_search` 是功能提案和社区 fork，不是 rc.6 已内置的命令。#1043/#1047 关于损坏 session log 的报告涉及本地会话文件，不要为了复现而直接改写或删除数据。社区插件目录出现在官方 Discussions 中，也不等于 DeepSeek 官方推荐或安全审计通过。

本卡没有证明 dsh-learn 已动态复现这些报告，没有证明相关依赖已经修复，也没有安装未知插件、修改 session 文件或调用模型 API。版本基线为 `@deepseek-ai/dsh@0.1.0-rc.6`，官方 commit `47f9438`。

## 来源

- [官方 Discussions 第 11 页：当前分页至 #1068](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=11)
- [#1030](https://github.com/deepseek-ai/deepseek-harness/discussions/1030) · [#1032](https://github.com/deepseek-ai/deepseek-harness/discussions/1032) · [#1040](https://github.com/deepseek-ai/deepseek-harness/discussions/1040) · [#1068](https://github.com/deepseek-ai/deepseek-harness/discussions/1068)
- [官方插件打包与安装文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

# 第一次把 DSH 插件装进 profile，从启动 CLI 到卸载验证

DeepSeek Harness 的第一步，很多人会停在 `--help` 和 `--dump-config`，命令能返回，profile 目录也生成了，但插件到底有没有被装进去，往往还没有一条可以照着复现的记录。

这篇教程把范围压在一件小事上，做一个只打印加载状态的插件，把它装进一个隔离 profile，让 DSH 读到它，再把它移除。整个过程不需要 API Key，也不需要先启动 Web UI，适合用来区分 CLI、profile、bundle 和模型请求各自出了什么问题。

## 先启动一个干净的 DSH profile

本次固定使用 `@deepseek-ai/dsh@0.1.0-rc.6`，官方代码依据是 `47f943859bef60e4160492346772ded9b24f765a`。这两个版本信息要一起写在实验记录里，因为 DSH 仍处于 Developer Preview，仓库文档和 npm 包可能不在同一个发布节奏上。

如果只想确认命令行入口，命令如下。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --help
```

官方的 Web UI 入口是 `npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web`，默认监听本机的 3080 端口。模型配置要在 Web UI 的 Settings → Models 中完成，插件加载实验则可以先和这一步分开，免得凭据、浏览器和插件代码同时出现在一个故障里。

实验最好使用临时的 `DSH_HOME`，这样 profile、缓存和设置不会碰到日常环境，`labs/hello-plugin/verify.mjs` 已经替你创建临时目录、传给每个 DSH 子进程，并在结束时清理，手动执行时也要遵守同样的范围，不要把用户的 `~/.dsh` 当成练习目录。

## 插件代码和 bundle 各管一层

这个例子放在 `labs/hello-plugin`。插件代码导出 `name` 和 `apply`，`apply` 收到 Cordis 的 `ctx` 后，用 `ctx.effect` 登记一个加载动作，并返回卸载时要执行的清理函数。加载时终端会出现 `[hello-plugin] loaded`，插件释放时会出现对应的卸载信息。

这里的打印并没有调用模型，也没有访问文件系统，它只是给安装过程留下一条可观察的信号，对刚开始写插件的人来说，这个信号比一上来注册工具更容易定位，因为工具还会牵涉 schema、权限、模型选择和调用结果。

插件要作为 DSH 的可安装组合包，还需要在 `package.json` 的 `dsh` 字段里声明 `bundle.patch`，告诉 DSH 这份包提供哪一个配置层。`cordis.patch.yml` 再用安装后的包名插入插件行，profile 读取这个配置层以后，才会把普通 Cordis 模块放进运行时树。

这两个层次不要混在一起看。`index.js` 决定插件加载以后做什么，`cordis.patch.yml` 决定它能不能进入目标 profile，`dsh.profile.bundles` 则记录用户选择了哪些组合包。只给 GitHub 仓库加 `dsh-plugin` topic，只能帮助别人找到仓库，不会修改 profile，也不会触发插件加载。

## 用一条探针完成安装和移除

在 `dsh-learn` 根目录执行，命令如下。

```bash
node labs/hello-plugin/verify.mjs
```

探针会使用一个全新的 `demo` profile，调用 `dsh plugin --profile demo add ./labs/hello-plugin`，首次使用时，DSH 会初始化 profile，并把基础组合包放在 bundle 列表中，本地包的名称随后进入这个列表。

安装完成以后，探针读取 profile 的 `package.json`，确认 `dsh-hello-plugin` 已经登记，它还会运行 `--profile demo --dump-config`，检查组合配置中出现对应的层和插件行，这一步不启动应用，只检查拼装结果。

随后探针启动 `--profile demo`，等待终端输出 `[hello-plugin] loaded`。看到这条信息，说明包已经从 profile 的依赖位置被解析，patch 也找到了包里的插件入口，Cordis 调用了它的 `apply`。这比仅仅看到安装命令返回成功多了一层证据。

最后，探针运行 `dsh plugin --profile demo remove dsh-hello-plugin`，再次读取 profile manifest，确认依赖和 bundle 层都已经消失。移除动作只针对探针自己创建的临时 profile，不会删除用户现有缓存，也不会改动日常 DSH 设置。

如果你想逐条观察，下面四个动作构成实验主线。

手动运行时需要自己把 `DSH_HOME` 绑定到临时目录，完整命令和清理逻辑以实验 README 为准。`pnpm` 是 profile 插件管理需要的工具，npm registry 不可达时，错误发生在依赖获取阶段，不能据此判断插件代码不兼容。

本地目录之所以能够被安装，是因为它自己带有一份 npm 包 manifest，`name` 决定 profile 里记录的包名，`main` 指向 loader 要读取的入口，`files` 决定打包或链接时哪些文件会被带上，`dsh.bundle.patch` 则把这个普通包和 DSH 的组合机制接起来。少掉其中任何一项，故障表现都不一样，不能只看终端最后一行。

`dsh plugin` 会在 profile 目录里运行包管理操作，用户不需要手动编辑 `dsh.profile.bundles`，这个列表的顺序也有含义，基础组合包先提供通用能力，外部 bundle 随后插入自己的行，profile patch 和 home patch 还可以继续覆盖前面已经存在的行。patch 按 id 替换时是整行替换，配置里原本需要保留的字段要重新写出。

如果一个 npm 包没有 `dsh.bundle` 声明，它仍然可能被安装，但 DSH 会把它当成普通依赖，不会自动激活配置层。这样的包适合被另一个插件 import，不能拿安装成功推断用户已经启用了它。反过来，带 bundle 声明的包也只说明它提供了一层配置，能否在某个 profile 上工作，还要看它引用的服务和插件依赖。

在练习阶段使用预构建 JavaScript 有一个好处，安装过程只涉及包路径和 loader，不会把 TypeScript 编译、项目引用和构建权限一起带进来。等插件代码稳定以后，再把 `index.js` 换成编译输出，并为 npm 或 GitHub 分发补上独立的构建检查，问题会更容易定位。

## 四种结果要分开记录

安装命令失败，问题通常在 Node、pnpm、registry 或本地路径。依赖已经写入，但 `--dump-config` 没有出现插件，要检查 `dsh.bundle.patch`、patch 是否被打包，以及包名是否和 patch 中的 `name` 一致。组合树里出现了插件，启动却没有加载日志，要继续看入口导出和 loader 能否解析包。

插件能够加载，只能说明这段代码进入了目标 profile，并完成了这次最小生命周期测试。它没有说明模型 provider 可用，也没有说明工具调用、Web UI、沙箱或权限策略已经通过，这些都要在单独的实验里验证。

从 GitHub 安装 TypeScript 插件时，多一层构建问题。Git 依赖拿到的通常是源码，作者需要用自包含的 `prepare` 生成运行文件，用户可能还要在 profile 的 `pnpm-workspace.yaml` 里允许构建脚本。这个许可会让第三方代码在安装阶段于本机执行，和 DSH 的运行时权限不是一回事，因此要阅读源码、锁定 commit，并把安装授权单独记录。

对新手来说，最容易忽略的是版本边界。今天能加载的 patch，升级后可能因为包名、配置字段或 profile 组合改变而失效，教程必须写明 DSH commit、npm 版本、Node 版本、操作系统、包来源和实际命令。没有这些信息，下一位读者遇到错误时，只能把安装问题、网络问题和 API 配置问题混在一起猜。

## 这条路径先做到哪里

`node labs/hello-plugin/verify.mjs` 已经覆盖无 Key 的版本检查、临时 home、profile 初始化、本地 bundle 安装、配置导出、插件加载和移除，配套静态验证器还会检查 manifest、patch、生命周期示例和秘密模式。

这条路径把第一次实践的变量控制在一个插件和一个 profile 里，后面再加配置 schema、工具注册、事件监听或模型 provider，每一次变化都能回到同一个安装基线。官方教程里关于 Web UI、工具调用、配置校验和 GitHub 安装的内容，可以在这条实验通过以后继续接上。

如果下一步要做一个面向用户的工具插件，建议保留这份 hello 插件作为安装基线，再单独替换 `apply` 里面的行为。工具注册还要验证参数 schema、返回值、取消信号和权限拦截，测试失败时先回到加载日志和 `--dump-config`，确认新增问题确实来自工具层，而不是 bundle 没有进入 profile。

如果下一步要做一个带配置的插件，配置 schema 应该跟代码一起记录默认值和错误范围，配置变更还要观察旧实例卸载与新实例加载。只在启动时看到一次打印，无法说明 HMR 或 teardown 没有残留，至少要安排一次修改配置、重复加载或主动停止的检查。

本实验没有启动 Web UI，没有发起模型请求，没有安装未知第三方包，也没有把一个本地 demo 写成生产环境安全结论。它只回答一个很窄但很重要的问题，自己写的 DSH bundle 能否在固定版本下被安装、发现、加载和移除。

## 验证范围与来源

- 插件包：[labs/hello-plugin/package.json](../../labs/hello-plugin/package.json)
- 插件入口：[labs/hello-plugin/index.js](../../labs/hello-plugin/index.js)
- Bundle patch：[labs/hello-plugin/cordis.patch.yml](../../labs/hello-plugin/cordis.patch.yml)
- 自动探针：[labs/hello-plugin/verify.mjs](../../labs/hello-plugin/verify.mjs)
- 实验说明：[labs/hello-plugin/README.md](../../labs/hello-plugin/README.md)
- 兼容性记录：[labs/hello-plugin/compatibility.json](../../labs/hello-plugin/compatibility.json)
- 证据草稿：[evidence/drafts/dsh-first-plugin-rc6.json](../../evidence/drafts/dsh-first-plugin-rc6.json)
- 验证回执：[evidence/validations/dsh-first-plugin-rc6.json](../../evidence/validations/dsh-first-plugin-rc6.json)
- 验证命令：`node labs/hello-plugin/verify.mjs`、`pnpm validate:plugin-lab`
- 本地范围：macOS、Node.js v25.8.2、临时 `DSH_HOME`、无 API Key
- [DeepSeek Harness README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#run)
- [第一个插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.zh.md)
- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)
- [Cordis 入门](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-primer.zh.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

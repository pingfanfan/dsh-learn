# 标题候选

| 标题 | 点击欲 | 信息量 | 跟我有关 | 可信 | 差异化 | 总分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 推荐标题：DSH 启动失败先别急着配模型：从 CLI 到第一个插件的排障路径 | 10 | 10 | 10 | 10 | 10 | 50 |

# 正文

DeepSeek Harness 目前最容易让人误判的一件事，是把`命令启动了`、`网页打开了`、`模型能回答`和`插件装好了`当成同一件事。它们总共是四个不同的检查点，某一步失败不应该马上归结为 DSH 不行，也不该把 API Key、第三方插件和自己的代码混在一起。

这篇只做一件事，下面给出一条从启动到安装第一个插件的排障路径，基线固定为 `@deepseek-ai/dsh@0.1.0-rc.6`，官方仓库依据固定到 commit `47f943859bef60e4160492346772ded9b24f765a`。这是 Developer Preview，官方明确提醒会有破坏性变化，所以命令、Node 版本和实际结果都要一起记录。

## 先确认你启动的是哪一层

官方 README 给了两条正常入口。

如果只是想启动 Web UI，可以运行下面的命令。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

默认地址是本机 127.0.0.1 的 3080 端口，如果你只想确认 CLI 本身能否被解析，不要一上来打开 Web UI。下面两条命令可以完成这一步。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --help
```

如果你是从源码运行，请保持另一条路径独立。

```bash
git clone <DeepSeek Harness 官方仓库地址>
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

源码路径的启动命令也要保持独立。

这两条路径不要交叉排障，`npx` 运行的是发布包，`pnpm dsh` 运行的是源码 checkout。一个路径能启动，不代表另一个路径的依赖、构建产物和 Node 条件也满足。

当前官方仓库的根 `package.json` 声明 Node.js 为 `^22.19.0 || >=24.0.0`，源码路径还声明了 pnpm 11.7.0，发布包和仓库当前 HEAD 的版本号也可能不在同一个节奏上。仓库根元数据显示 `0.1.0-rc.5`，npm 实际使用的 DSH 包是 `0.1.0-rc.6`。排障记录至少要留下 DSH 包版本、官方 commit、Node、包管理器和操作系统。

## `无法启动`先按错误出现的位置分层

社区刚开放后已经出现几类不同问题。有人在 `npx` 阶段就失败，有人全局安装后 profile 加载失败，也有人遇到 Windows 原生目录选择器或中文路径问题。还有一些只是模型或工作区层面的故障，它们看起来都像`dsh 启动不了`，但修法完全不同。

可以按下面的顺序判断。

| 看到的现象 | 先检查什么 | 不要先做什么 |
| --- | --- | --- |
| 下载失败 | 检查 registry、网络、版本和 Node | 先别改插件。 |
| CLI 失败 | 检查 Node、入口和 PATH | 先别配模型。 |
| Web 失败 | 检查端口、runtime 和错误栈 | 先别换 Key |
| 工作区失败 | 检查系统、路径和原生模块 | 先看环境 |
| 模型失败 | 检查 provider、model 和 Key | 别怪插件。 |
| 插件无效果 | 检查 bundle、patch 和入口 | 别只看 add。 |

例如，官方 Discussions 中的`无法启动 dsh`记录包含了 `npx @deepseek-ai/dsh web` 的完整环境信息。另一些帖子明确写了全局安装后的 `cordis-plugin-timer` 缺失、Node 版本不满足、Windows 中文路径截断和原生目录选择器问题，这些都需要各自最小复现，不能合并成一个`重新安装 DSH`的答案。

一个安全的第一轮命令是下面两条。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --help
```

两条都能返回以后，再启动 Web UI。这样即使 Web UI 或 provider 失败，你也已经确认发布包的 CLI 入口没有问题。

## 第一个插件，先不要接模型

官方的插件教程把插件拆成三个部分。插件模块导出 `apply`，Cordis 在加载时传入 `ctx`，patch 文件把模块插入配置树，需要分发和安装时，再由组合包的 `dsh.bundle.patch` 把这一层登记给 profile。

下面三个文件分别回答三个问题。

- `index.js` 或 `index.ts`，描述插件被加载以后做什么，`cordis.patch.yml` 描述这个插件怎样进入一棵配置树。
- `package.json` 里的 `dsh.bundle.patch`，描述这个包怎样成为可安装的组合包。

只把仓库发布出去，或只给仓库加 `dsh-plugin` topic，都不会自动让它进入你的 profile。

dsh-learn 放了一份不需要 API Key 的最小实验。它使用临时 `DSH_HOME`，创建隔离的 `demo` profile，安装本地 bundle，导出配置，启动 profile 等待加载日志，然后移除 bundle，实验入口如下。

```bash
node labs/hello-plugin/verify.mjs
```

这条探针会检查下面的顺序。

```text
版本检查
  → 隔离 profile
  → bundle add
  → dump-config
  → profile load
  → bundle remove
```

本次实验的成功标准，是安装、发现、加载和移除四件事都留下证据。它不启动 Web UI，不调用模型，不安装未知第三方包，也不读取你原来的 DSH 配置，这样后面接模型或换插件时，出现问题可以知道新增变量究竟在哪一层。

如果你想手动拆开看，核心命令如下。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo add ./labs/hello-plugin
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo --dump-config
```

这两条命令检查安装结果和组合配置。

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo remove dsh-hello-plugin
```

上面两条命令完成启动和移除。

手动运行时，建议把 `DSH_HOME` 指向一次性临时目录，并在结束后删除这个目录，不要把日常 profile 当作插件练习场，也不要让探针里的临时路径变成教程中的固定路径。

## 安装成功以后，为什么插件仍然可能没加载

`dsh plugin add` 成功，只能说明包管理器接受了这个包，接下来还要检查下面这些项目。

1. `package.json` 的 `name` 是否就是 patch 中引用的包名，`main` 或 `exports` 是否指向真实存在的 JavaScript 入口。
2. `files` 是否把入口和 patch 一起带进了包，`dsh.bundle.patch` 是否指向正确的 patch 文件。
3. patch 中的插件行是否引用了正确模块，插件需要的服务是否写进 `inject`
4. `apply` 是否注册了可观察的行为，并且卸载时能清理资源。

如果 `--dump-config` 里没有组合层，先检查 manifest 和 patch，组合层出现了但没有加载日志，再检查入口导出和模块解析，插件加载了但工具不能调用，再进入工具 schema、权限、模型和执行结果这条链路。

官方的 `greet` 工具教程就是后一种情况，插件需要 `inject = ['tools']`，通过 `defineTool` 注册参数 schema、返回值 schema 和渲染器，之后才让模型发起调用，它不是第一个插件安装实验的必要步骤，没有 API Key 时可以验证插件是否进入 profile，但不能把`工具代码已注册`写成`模型已经成功调用工具`。

## GitHub 插件还有一道安装授权

从 GitHub 安装 TypeScript 插件时，还要考虑构建脚本。官方文档提醒，git 依赖拿到的通常是源码，作者需要用自包含的 `prepare` 生成运行入口，pnpm 10 以后用户还可能需要在 profile 的 `pnpm-workspace.yaml` 中显式允许对应包的构建脚本。

它属于安装阶段的本机执行授权，不是 DSH 的运行时权限。对不熟悉的包，至少先看源码、`package.json`、`prepare`、锁定的 commit 和它实际读写的目录，如果不希望安装时执行构建脚本，可以考虑发布预构建 npm 包或 tarball，两者都需要单独做兼容性测试。

dsh-learn 当前的 hello-plugin 使用本地预构建 JavaScript，只验证了可信的本地实验包，**没有**把 GitHub 第三方插件、未知安装脚本或构建授权标成已通过，这条边界必须保留，否则`我写的 demo 能装`很容易被误读成`所有社区插件都能安全安装`。

## 最后才接模型和真实工具

一条比较稳的上手顺序如下。

```text
CLI 版本/帮助
  → 隔离 profile
  → --dump-config
  → 本地 hello bundle 安装与移除
  → 无模型插件加载
  → Web UI
  → provider / 模型
  → 工具注册
  → 真实工具调用
```

每向后走一步，都只增加一个变量。模型调用要单独记录 provider、模型名、凭据来源和请求结果，工具调用还要记录参数 schema、返回值、取消信号和权限策略，不要用一次成功的 `--version` 或插件加载日志，替代后面没有做过的验证。

如果你只是想判断自己现在卡在哪里，可以先回答下面四个问题。

- `--version` 是否返回精确版本
- `--dump-config` 是否看到目标 bundle 或插件行
- 启动 profile 时是否看到插件自己的加载信号
- 失败发生在依赖获取、配置组合、插件加载、Web UI、模型还是工具调用

这四个答案通常比`重装一次`更接近问题根因。

如果你准备把这条路径分享给别人，最好把版本、操作系统、Node、完整命令、退出码和关键错误一起贴出，私有路径与凭据要删掉，讨论帖也要说明自己已经走到哪一个检查点，这样维护者能快速判断问题属于包获取、配置组合还是运行时。

这份记录也适合以后维护教程。DSH 发布新版本后，先重跑 CLI、profile 和插件加载三项，再决定哪些段落需要改写，旧版本的成功结果则保留为历史基线。

# 备用标题

1. DeepSeek Harness 怎么启动和装插件：一条无 API Key 的排障路径
2. 从 `npx dsh web` 到 `dsh plugin add`，第一次上手 DSH 不要混淆这四层
3. DSH 插件装不上，先看 profile、bundle 和 `--dump-config`

# 编辑附录（不随正文发布）

## 本地实验

- 插件包：[labs/hello-plugin/package.json](../../labs/hello-plugin/package.json)
- 插件入口：[labs/hello-plugin/index.js](../../labs/hello-plugin/index.js)
- Bundle patch：[labs/hello-plugin/cordis.patch.yml](../../labs/hello-plugin/cordis.patch.yml)
- 自动探针：[labs/hello-plugin/verify.mjs](../../labs/hello-plugin/verify.mjs)
- 实验说明：[labs/hello-plugin/README.md](../../labs/hello-plugin/README.md)
- 验证命令：`node labs/hello-plugin/verify.mjs`、`pnpm validate:plugin-lab`

## 证据边界

- 已验证：macOS、Node.js v25.8.2、临时 `DSH_HOME`、`@deepseek-ai/dsh@0.1.0-rc.6`、本地预构建 bundle 的安装、配置导出、profile 加载和移除。
- 未验证：Web UI、模型请求、provider 兼容、真实模型工具调用、未知第三方插件、GitHub 安装脚本和 pnpm 构建授权。
- 这篇文章不使用或保存任何 API Key；无 Key 实验会主动从子进程环境中删除 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_API_KEY_ENV`。

## 官方依据

- [DeepSeek Harness README：Run](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#run)
- [官方教程：第一个插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.zh.md)
- [官方教程：打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)
- [官方教程：开发一个工具](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/tool.zh.md)
- [官方工具编写参考](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cookbook/adding-a-tool.zh.md)
- [官方 Discussions：无法启动 dsh](https://github.com/deepseek-ai/deepseek-harness/discussions/46)
- [官方 Discussions：全局安装后缺少 cordis-plugin-timer](https://github.com/deepseek-ai/deepseek-harness/discussions/55)
- [官方 Discussions：Windows 中文路径截断](https://github.com/deepseek-ai/deepseek-harness/discussions/107)
- [官方 Discussions：Node 版本与 Arch Linux 安装](https://github.com/deepseek-ai/deepseek-harness/discussions/49)

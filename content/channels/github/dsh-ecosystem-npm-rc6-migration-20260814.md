# DSH 生态插件开始转向 npm rc.6，新手该怎么读安装说明

2026 年 8 月 14 日，`omdsh-dev/dsh-plugin-check` 和 `omdsh-dev/dsh-plugin-dev` 的 README 同时做了一次方向很明确的更新。旧的源码快照和本机 junction 不再是主要入口，文档开始围绕 npm `@deepseek-ai/dsh@0.1.0-rc.6`、profile bundle 和独立构建来写。

这不是 DeepSeek Harness 官方仓库发布的新功能，也不是官方公布的插件兼容名单，它记录的是两个生态项目怎样跟着 DSH 的公开 npm 路线调整自己的说明。对第一次接触 DSH 的人来说，价值在于终于能看出插件已经写出来和插件可以按当前 DSH 的方式被安装之间，还隔着哪些步骤。

## 两个生态项目把旧快照路线放到了后面

`dsh-plugin-check` 的最新 README 现在把 GitHub 仓库规格放进 profile bundle 安装示例，分别展示 `web` 和 `headless` 两个 profile，它还补了 `npm pack` 后从 tarball 安装的办法。README 里写到，包中的 `dsh.bundle.patch` 会把插件插入 profile 的 layer stack，工具行的 id 是 `tool-plugin-check`。

这里有一个新手很容易漏掉的细节，`web` 和 `headless` 不是同一份配置，插件装进 `web` profile，不会自动出现在 `dsh run` 默认使用的 headless profile 里。你如果只在网页里看到插件，又用 `dsh run` 去调用它，两个结果不一致并不一定是插件坏了，先检查自己到底给哪一个 profile 安装了 bundle。

`dsh-plugin-dev` 的变化更像一份开发环境迁移记录。它把每个独立 checkout 自己安装 `typescript`、`vitest` 和 `@types/node`，然后按 `npm install`、`npm run typecheck`、`npm test`、`npm run build`、`npm pack` 的顺序构建，旧的 snapshot junction 和 wrapper 被放到历史说明里。这个变化告诉插件作者，发布包时需要让依赖和构建产物跟着项目走，不能假设用户机器旁边正好有一份 DSH monorepo。

## 官方文档里的 bundle 到底负责什么

DeepSeek Harness 官方插件发布文档把两个对象分得很清楚，组合包是附带配置层的 npm 包，profile 是一份可启动的组合目录。组合包的 `package.json` 声明 `dsh.bundle`，再通过 `cordis.patch.yml` 把插件行插进组合配置，profile 的 manifest 记录自己安装了哪些 bundle。

所以安装第三方插件时，命令不是把某个 JavaScript 文件复制到 DSH 目录里，而是让 DSH 在指定 profile 里添加一个包依赖，再把这个包贡献的 patch 层接进配置。常见入口如下。

```bash
dsh plugin --profile web add <github-repository-spec>
dsh --profile web --dump-config
```

如果使用本地 tarball，可以在插件仓库执行 `npm pack`，把生成的 `.tgz` 路径交给 `dsh plugin --profile web add`。tarball 路线的好处是来源和文件比较明确，缺点是每次改代码都要重新构建、重新打包，不能把工作目录里的修改当成已经安装进去的内容。

从 GitHub 安装还要多看一层。官方文档提醒，git 安装拿到的是源码，作者需要提供自包含的 `prepare` 构建脚本，pnpm 10 以上还可能要求用户显式允许该包的构建脚本。这个授权意味着安装阶段会在本机执行第三方代码，它不等于 DSH 沙箱，陌生仓库不能因为 README 写着兼容 DSH 就交给拥有本机权限的 Agent。

## 这两份 README 还不能替你完成一次安装

`dsh-plugin-check` 的提交说明和 README 都写了 rc.6 consumer、工具注册和执行通过，但这属于该项目自己的验证记录，dsh-learn 当前没有克隆、安装、构建或运行它。`dsh-plugin-dev` 也一样，它的 Windows 环境、Node 版本和构建经验是作者的环境记录，不等于每台电脑都能复制。

本轮记录了公开提交改动的内容、安装命令指向的来源、两个 profile 需要分开的原因，以及官方 bundle 文档对组合包和 profile 的定义。npm registry 当前在本机仍然不可达，因此没有把第三方包的 README 声明写成已经动态安装成功，也没有调用模型 API。

对新手来说，比较稳的顺序仍然是先跑 dsh-learn 自带的无 Key 练习，确认 Node.js、固定版本 DSH、隔离 profile 和最小 bundle 都能理解，再去尝试第三方仓库。

```bash
node scripts/beginner-doctor.mjs
node scripts/beginner-start.mjs
```

这两条命令处理本机环境和 DSH Web UI，页面打开以后，仍然要把凭据、模型和插件当成后面的独立步骤。

```bash
node scripts/plugin-doctor.mjs
node scripts/create-beginner-plugin.mjs my-first-plugin
node labs/hello-plugin/verify.mjs ./my-first-plugin
```

这三条命令处理 pnpm、最小 bundle 以及隔离 profile 中的插件回执。

这些步骤不会把插件写进你平时的 DSH profile，也不要求先配置模型凭据。第三方插件则要另外记录 DSH 版本、插件 commit、profile 名称、安装来源、构建脚本和实际加载日志，`--dump-config` 出现一行配置，只能证明它进入了组合层，不能单独证明工具注册、模型调用和权限范围都正常。

`beginner-doctor.mjs` 只看本机的 Node.js、npm、npx 和练习文件，它通过以后，读者知道自己已经具备运行入口的条件，但这一步不会替 DSH 下载 npm 包。`beginner-start.mjs` 把版本固定在 rc.6，负责把网络错误、Node.js 版本错误和端口占用分开说清楚，浏览器出现页面以后，也不能把页面打开写成模型已经可用。

`plugin-doctor.mjs` 处理的是插件子命令会用到的 pnpm，脚手架则生成一个没有模型请求的最小 bundle。验证器会把安装、组合配置、插件加载和移除分别检查，任何一步没有回执，都不把整条路径写成通过。这样安排的好处是，读者遇到 npm 网络问题时知道该查网络，遇到 profile 配置问题时知道该看 manifest，不会一上来修改插件源码。

这套分层还方便新手求助。把固定版本、操作系统、Node.js 版本、profile 名称和最后一条错误放在一起，维护者可以判断问题发生在下载包、初始化 profile、合并 patch 还是启动模块。只说插件不能用，或者只贴一张没有地址和版本的截图，通常无法知道应该重做哪一步。

截图可以帮助读者认出按钮和终端位置，能够复查的仍是命令、版本和输出。教程里的示意图只负责降低第一次操作的紧张感，不能替代当前电脑上的安装回执，尤其不能把一张旧版本截图当成第三方插件已经兼容的证据。

安装记录最好把 profile 名称写在命令旁边，而不是只保存一张终端截图。比如 `web` 记录网页启动和 `--dump-config`，`headless` 记录 `dsh run` 使用的组合，两个记录都带上插件 commit，这样以后换了插件版本，读者能看出变化发生在包来源、profile manifest 还是运行时加载。

包里的 `dsh.bundle.patch` 也值得单独看一眼。它负责把插件行放进组合层，普通的 `index.js` 或编译后的入口负责注册行为，package.json 则负责告诉 DSH 这个包提供哪一个 patch。三个文件缺一时，错误表面上可能都像插件没加载，实际上可能分别落在包清单、配置层或模块入口，排查时要把它们分开。

## 插件作者现在最该补的不是更多宣传语

如果你准备做自己的 DSH 插件，这两个仓库给出的共同方向很具体，把包做成独立可构建的项目，声明清楚 peer dependency，用 `dsh.bundle.patch` 进入 profile，给出从 GitHub 或 tarball 安装的命令，同时告诉用户 `web` 和 `headless` 是否需要分别安装。

README 里还应该把已在什么环境通过与用户现在可以照着做什么分开写。类型检查、单元测试、构建成功、tarball 能生成、profile 能看到 patch、插件运行时完成注册，这些不是同一项测试，混成一句兼容 DSH 以后，读者遇到问题就不知道该从包管理器、profile、Cordis 依赖还是运行时日志开始查。

这也是 dsh-learn 目前把插件教程拆成安装、配置、加载、移除几层的原因，先让人知道一条命令到底改变了哪一个目录，再谈工具和模型。等 npm 网络恢复，下一次复测会固定两份插件的 commit、Node.js、pnpm、DSH 版本和临时 `DSH_HOME`，把动态回执补回这张卡，在那之前，它只是一张基于公开仓库变更的生态迁移卡。

这类记录还有一个实际用途。插件作者可以拿它对照自己的 README，用户可以拿它判断教程是否仍然对应当前 npm 包，维护者则可以在上游 commit 变化后定位需要重测的那一段。比起把一条安装命令写得很长，把包名、版本、profile 和验证结果各自写清楚，后面更新时更省力。

## 验证范围与来源

- 事实基线：官方 DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`；npm 入口为 `@deepseek-ai/dsh@0.1.0-rc.6`。
- 生态变更：`dsh-plugin-check` commit `397aa26df241aca530aa65a08484a664f7d555ad`；`dsh-plugin-dev` commit `6cfe42593769b412a236b1dd97137d370233ce2c`。
- 官方组合包文档：[publish.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)。
- [dsh-plugin-check 变更](https://github.com/omdsh-dev/dsh-plugin-check/commit/397aa26df241aca530aa65a08484a664f7d555ad)。
- [dsh-plugin-dev 变更](https://github.com/omdsh-dev/dsh-plugin-dev/commit/6cfe42593769b412a236b1dd97137d370233ce2c)。
- 验证边界：没有安装、构建或运行第三方插件，没有调用模型 API，没有使用或保存 API Key，知乎不自动发布。

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

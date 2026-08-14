# DSH 新手安装遇到的坑，先判断 Web UI、Node、插件和模型是哪一层

DeepSeek Harness 官方 Discussions 从 #614 增长到 #714 的这段时间里，出现了不少很像安装失败的问题，有人打开网页以后发现输入框不能用，有人把插件装进去了却没有加载，还有人卡在 Node.js、MCP 和 Linux 编译工具链的版本关系上。

这些帖子包含用户报告、功能提议和社区项目，不能当成官方修复公告，也不能当成 dsh-learn 已经在所有系统上复现过的结果。它们更适合拿来整理新手的排错顺序，因为 DSH 的安装、网页首次配置、插件进入 profile 和模型请求，本来就是几层不同的事情。

本文使用的命令基线是 `@deepseek-ai/dsh@0.1.0-rc.6`，官方仓库基线是 commit `47f9438`，遇到问题时，先把版本和终端输出记下来。

## 先把 DSH 启动起来，不要一开始做源码构建

完全不会写代码的读者，第一条命令可以写成下面这样

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

这条命令会从 npm 下载指定版本并启动本机 Web UI，浏览器通常访问 `127.0.0.1` 的 3080 端口。启动时终端窗口要保持打开，关掉它，本机网页服务也会停止。

官方根目录的 package manifest 给出的 Node.js 条件是 `^22.19.0 || >=24.0.0`，所以不要为了迁就某个旧插件，把 DSH 退回 Node 20。运行下面三条命令，把结果留在自己的排错记录里

```bash
node --version
npm --version
npx --version
```

如果只是想学会使用 DSH，不必从源码克隆仓库，也不用先运行 `pnpm install` 和 `pnpm run build`。Discussion #623 记录过一种源码构建情况，tsdown 加载配置时找不到可选依赖 `unrun`，这属于源码开发链路，和普通用户使用 npm 发布包的路径不同。

Linux 用户还可能遇到原生模块编译问题。#700 的作者把缺少 `build-essential` 作为自己的解决办法，#650 则记录了 Node、GCC 和 `node-pty` 之间的组合风险，这些内容来自社区环境报告，不能代替你自己的系统检查。它们适合在安装日志出现 g++、make 或 node-pty 时提供方向，在 dsh-learn 目录里，可以运行一条不联网的环境检查

```bash
node scripts/beginner-doctor.mjs
```

它只读取本机 Node、npm、npx 和教程文件，不读取 API Key。看到环境检查通过的示意输出以后，继续看自己的终端结果。插件实验前，再检查 pnpm 和练习文件

```bash
node scripts/plugin-doctor.mjs
```

这一步确认的是包管理器和练习文件。

网络预检可以按需要运行

```bash
node scripts/plugin-doctor.mjs --network
```

它只在你要求时访问 npm registry。

如果预检说 npm registry 不可达，先处理网络、DNS、代理或防火墙，下载没有完成时，插件代码还没有进入验证阶段。

## 网页打开了，输入框不能用也有可能是正常的首次配置状态

Discussion #619 记录了一个很容易让新手误判的首次启动状态。Web UI 能返回页面和静态资源，但 API Key 没有配置，工作区列表也是空的，输入框因此保持禁用。

第一次打开页面时，模型凭据和工作区是两个独立的准备条件。只想确认页面能否打开，可以在 API Key 弹窗中选择 `Configure later`，但跳过凭据以后不要期待模型马上回答，尚未添加或选中工作区时，输入框也可能不能使用。

第一次启动可以按照这个顺序观察，终端进程没有退出，浏览器能够打开本机页面，API Key 弹窗可以关闭，工作区可以创建或选择，模型请求再单独验证。网页能打开，只能说明 Web 层已经启动，provider、模型名、网络和凭据仍然要分别检查。

教程里的无 Key 插件实验仍然有用，因为它把模型请求排除在外。真实 Key 不要放进终端截图、Issue、Discussion 或聊天记录，也不要写进插件的 `package.json`。

## 插件安装完成后，还要看它有没有进入 profile

DSH 插件最容易被误判的地方，是安装命令返回成功，并不表示插件已经进入组合配置，也不表示启动时入口文件已经被加载。

第一次实验建议使用隔离的 `demo` profile 和本地练习插件，按下面的顺序观察。先把插件加入 profile

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo add ./my-first-plugin
```

这一步只记录安装结果。

再导出 profile 配置

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo --dump-config
```

这一步检查 profile 组合层。

确认配置里有 bundle 以后，启动这个 profile

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo
```

这一步观察启动日志。

实验完成后移除插件

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo remove dsh-hello-plugin
```

这一步完成清理。

`package.json` 里出现依赖，只是安装记录，`--dump-config` 还要能看到对应的 `dsh.bundle` 层，启动日志要能看到插件入口被加载，移除以后 profile 里也不能继续残留它。dsh-learn 的 `labs/hello-plugin/verify.mjs` 会使用临时 `DSH_HOME`，适合第一次练习。

Discussion #656 记录过另一种风险，使用 GitHub 规格安装第三方插件时，pnpm 记录了包依赖，`dsh.profile.bundles` 却没有追加，安装命令看上去成功，插件没有激活。这个报告还没有经过 dsh-learn 动态复现，所以不能把它扩展成所有 GitHub 插件都会失败，但新手第一轮没有必要增加这个变量，优先使用本地路径或已经提供预构建 tarball 的插件，每次都查看 `--dump-config`。

Discussion #708 记录了让 DSH 自己安装插件，重启 Web 后现有环境无法继续工作的经历。修改平时使用的 profile 前，先复制 profile，或者使用临时 `DSH_HOME`，不要让模型自行改动日常配置。第三方插件如果包含原生依赖、浏览器进程或更大的权限范围，先阅读 manifest，再在没有模型请求的环境里测试安装、加载和移除。

## Node 版本冲突时，让两个运行环境各自工作

#707 有用户询问某个 MCP 只支持 Node 20，而 DSH 需要 Node 22 的处理方式。更稳妥的做法是让两个进程使用各自的 Node 环境，不要为了一个 MCP 降低 DSH 的运行时版本。

使用 nvm 或 fnm 管理版本时，运行 DSH 的终端保持官方要求的 Node 22.19 或更高 22.x，或者 Node 24，需要 Node 20 的外部 MCP 则在另一个终端或独立进程中使用 Node 20。两个进程通过 MCP 协议通信，不要求 DSH 本身运行在 Node 20 上。

看到 engine 警告、原生模块错误或 Node API 不存在时，先记录 `node --version`、包版本和启动命令，再判断是切换运行时，还是补充 Linux 编译工具链。这个问题属于运行环境隔离，和插件入口文件是否正确是两件事。

## 先看最小插件，再尝试浏览器和复杂权限

Discussion #714 分享了两个社区插件，`dsh-plugin-hello` 用来展示 `name`、`inject`、`Config`、`apply` 和 `dsh.bundle` 的组合，`dsh-plugin-browser` 则增加了 Playwright 浏览器控制、截图和多步操作。它们都是第三方项目，不是 DeepSeek 官方维护的插件。

完全新手先从 hello 类型插件开始更合适，确认一个工具能进入 profile，启动日志能看见它，移除后配置恢复干净，再考虑浏览器、文件系统、MCP 或模型调用。浏览器插件还可能需要额外安装 Chromium，插件包安装成功，不等于运行时依赖已经准备好。

第一次成功可以定义得小一点，固定版本 DSH 能启动，Web UI 能打开，一个无 Key 插件能加载，最后能从临时 profile 移除。模型回答、第三方插件权限和浏览器自动化，等前面的层分别稳定以后再加。

## 截图负责带路，终端输出负责定案

dsh-learn 的新手入口已经配了 Node.js 官方下载页、Node 版本检查、DSH 首次 API Key 提示、跳过 Key 后的 Web UI、插件目录和无 Key 实验终端图。它们分别告诉你按钮在哪里、窗口长什么样、命令应该放在哪个目录，截图里的示例版本和输出不能替代你自己的终端结果。

Node.js 下载页的截图当前以 macOS 为例，Windows 和 Linux 需要在同一官方页面切换系统后选择安装方式。Web UI 截图只能证明页面这一层已经出现，API Key 提示图也不代表模型已经回答，插件终端图则要结合安装记录、`--dump-config`、启动日志和移除结果一起看。

看到 Node 版本截图时，重点是命令能够打印版本号，版本号是否满足当前 DSH 的要求，不能拿图片里的数字替代自己的版本。看到 API Key 弹窗截图时，重点是知道跳过配置的按钮在哪里，跳过以后输入框是否可用还要回到工作区设置观察。

看到插件目录截图时，先找到 `package.json`、patch 文件和入口文件，再看练习命令使用的路径是否和自己的终端位置一致。终端示例图里出现的 PASS 只表示这条检查应该观察什么，安装是否完成要以本机输出为准。

截图的作用是减少第一次寻找按钮和文件的成本，版本、路径、配置和日志才决定一次操作有没有完成。页面更新以后，截图和实际界面出现小差异很正常，别为了追求图上的布局去改动 profile。

对于完全新手，最容易混在一起的是图片里的按钮、终端里的命令和浏览器里的页面，按钮能找到只说明你知道下一步在哪里，命令返回结果以后，还要看它对应的是启动、配置、加载还是清理，四种结果不要互相代替。

如果自己的截图和示例不一样，先确认操作系统、DSH 版本、profile 名称和当前目录，再判断页面是否有功能变化，旧截图可以帮助找到位置，不能用来证明当前版本已经完成同样的动作。

看到浏览器页面以后，先确认终端窗口仍在运行，再看地址栏、工作区列表和输入框状态，页面出现但服务已经退出时，刷新只能得到一个表面相似的结果。

如果要把操作过程发给别人，保留版本检查、启动命令、错误第一段和 profile 名称，截图只截必要的区域，API Key、Cookie、Authorization header 和私有目录都要从图片与文字里删掉。

后续每次更新教程时，dsh-learn 会把截图的来源、拍摄环境和证据边界一起写在入口地图里，官方页面截图随网站变化，终端卡片里的输出只作为观察样式，动态安装记录仍然要等网络和本机实验完成。

新手遇到截图和自己的页面不完全一样时，先比对版本、profile 和命令，不要为了追求画面一致去修改配置。页面布局会更新，命令输出才是这一次操作的结果。

### 可复制的排错记录字段

```text
DSH=0.1.0-rc.6
NODE=22.19
PROFILE=demo
CMD=install_dump_start_remove
WEB=opened
PLUGIN=loaded
KEY=absent
PATHS=removed
```

这组字段用于整理事实。

## 遇到问题时，把错误放回它所属的层

- `node`、`npm`、`npx` 找不到，处理 Node.js 安装和终端环境。
- npm 下载超时，检查 registry、DNS、代理和防火墙。
- 3080 端口被占用或 Web 服务退出，查看端口和终端日志。
- 页面能打开但输入框禁用，检查 API Key 弹窗和工作区。
- 安装命令成功但配置里没有 bundle，检查 `--dump-config`、包名和 `dsh.bundle.patch`。
- 插件启动后 Web 重启失败，回到干净 profile，保留 manifest 和完整错误。
- 模型请求失败，单独记录 provider、模型名、端点和凭据引用。

向官方 Discussions 提问时，带上 DSH 精确版本、操作系统、Node.js、npm 或 pnpm 版本、profile、最小命令、实际输出和预期结果，删除 API Key、Cookie、Authorization header、私有路径和整段私有日志。新手需要的是知道自己卡在 Node、网络、Web UI、profile、插件还是模型这一层，然后只处理这一层的问题。


> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

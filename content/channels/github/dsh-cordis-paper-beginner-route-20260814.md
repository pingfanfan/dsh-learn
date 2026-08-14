# 读懂 Cordis 论文，不必先啃完 88 页：DSH 新手从三个实验开始

第一次看到 DeepSeek Harness 的官方 README，最容易记住的是一句架构描述，所有东西都是插件，底层由 Cordis 驱动，对熟悉框架的人，这句话已经指向了依赖、生命周期和动态加载，对完全新手，它还没有告诉你下一步该打开哪个文件、运行什么命令。

我建议把 Cordis 论文当成一张地图，不要把它当成 DSH 的安装手册。论文目前仍是持续修订中的预印本，适合新手的读法，是先抓住两个问题，再用三个无 Key 实验去看它们在 DSH 里落在哪里，插件卸载以后留下的影响能不能撤回，一个插件依赖的能力出现或消失时，谁负责让它启动或停止。

## 论文解决的是插件卸载和依赖变化

插件系统最麻烦的时刻，通常发生在`改完以后`和`卸载以后`。一个插件可能注册事件、创建定时器、打开文件、增加工具或启动子进程，只要清理动作漏掉一个，第一次运行看起来正常，第二次加载就可能出现重复监听、旧配置残留或两个插件同时响应。

Cordis 把这类问题拆成两个方向，时间可组合性关心一个组件在运行期间做过什么，以及它被移除时能否按照记录撤回，空间可组合性关心一个组件依赖哪些能力，以及依赖变化时它应不应该继续运行。论文用 `revertible effects` 描述带有逆操作的影响，用 `reactive coeffects` 描述对上下文变化的依赖反应。

这两个词暂时不用背，新手先做两个观察动作，加载一个插件以后看它增加了什么，移除它以后看这些东西是否消失，让一个依赖先不存在、再出现，观察组件何时进入运行状态，后面的实验都围绕这两件事安排。


我更愿意先教这两个动作，再教论文里的名词。因为`卸载以后有没有留下东西`是每个插件作者都会遇到的问题，读者先看见结果，再回头认识 `effect` 和 `coeffect`，会比一开始背定义轻松很多。


## 先用无 Key profile 看运行时地图

先运行 dsh-learn 的 Cordis 无 Key mini-lab

```bash
node labs/cordis-no-key/probe.mjs
```

它会在临时 `DSH_HOME` 中运行固定版本的 `@deepseek-ai/dsh@0.1.0-rc.6`，检查版本、demo profile 初始化和 `--dump-config`。这一步选择无 Key 实验，是为了先排除 provider、模型和账户配置，实验通过以后，读者知道自己看到的是 DSH 的 CLI/profile/config 入口，不会把`页面打开了`误认为`模型已经可用`。

你应该关注三个结果，临时 profile 是否生成，配置树是否能导出，命令结束后临时目录是否可以清理。输出中会看到 `@deepseek-ai/dsh-base` 以及 timer、HMR、LLM、session、sandbox、permission 等组合项，它们更像一张运行时地图，说明当前 profile 组合了哪些能力，不代表每个能力都已经在本轮真实模型请求中运行。

这一步和论文的关系在于`上下文`。Cordis 把服务、事件和其他能力放在一个可以变化的上下文里，组件根据自己声明的需求决定是否工作。对新手来说，先看到 profile 和 bundle 的结构，再去读组件怎样依赖上下文，顺序会清楚许多。

## 两个插件实验把论文接到 DSH

接着运行第一个插件实验

```bash
node labs/hello-plugin/verify.mjs
```

这个实验使用本地 bundle，在临时 `DSH_HOME` 中完成安装、读取 profile manifest、导出组合配置、启动 profile 观察加载日志，然后移除 bundle。它没有 API Key，也没有安装未知的第三方包，所以第一次学习时可以把变量压在`插件怎样进入 profile、怎样离开 profile`这件事上。

打开插件入口文件，你会看到 `ctx.effect()` 里同时写了加载动作和返回的清理函数。加载时打印 `[hello-plugin] loaded`，卸载时打印 `[hello-plugin] unloaded`，这就是论文里`影响和逆操作放在一起`的工程直觉，创建资源的代码附近，应该能找到撤销资源的代码。

实验中的 `cordis.patch.yml` 还会让人看到另一个层次。JavaScript 文件负责注册行为，bundle patch 负责把这个行为接进 profile。包能被安装，不等于它已经被当前 profile 加载，配置出现，也不等于模型已经调用了它，把安装、组合、加载和模型请求分开记录，排错时才知道自己正在查哪一层。


对第一次写插件的人，我会先看安装和移除这一对动作，因为它们能把 bundle、profile 和插件模块的关系摆在同一份回执里，等这条路径稳定以后，再去追模型是否会调用工具。


如果你想学习 DSH 插件如何增加一个工具，可以先运行离线契约检查。

```bash
node labs/tool-plugin/verify-offline.mjs
```

这个实验用一个最小的本地注册表检查 `ctx.tools.register()`、工具名、参数 schema、返回值、执行函数和渲染器，它让读者看见`插件向哪个能力点注册什么`，同时避开 npm 下载和模型请求。

看到 `greet` 注册成功，只能说明工具定义进入了这份本地注册表，它不证明 DSH runtime 已经动态加载这个插件，也不证明模型会在真实对话里选择它。要做更接近运行时的检查，可以再看 `node labs/tool-plugin/verify.mjs`，但它会受到 npm registry、Node.js 和 pnpm 环境影响，结果应当和离线契约检查分开保存。

到这里，论文里的空间可组合性有了一个具体入口，工具插件声明自己需要 `tools`，运行时在这个能力可用时才有机会完成注册。完整的依赖调度还需要进一步读 Cordis 源码和做生命周期测试，不能靠一个 `greet` 字样就宣称已经复现完整理论。


工具注册这一层很适合用来判断实验边界，离线检查通过以后，你知道 schema 和执行函数长什么样，真实 runtime 和模型调用仍然要另外验证，少走一步就少混进一个变量。


## 论文读到哪里，以及新手什么时候接模型

完全新手不需要先读完论文里的形式化 calculus、preservation、progress 和 confluence 证明，它们解释的是为什么这套动态组合模型在更严格的条件下成立，适合在已经跑过实验、准备研究框架实现时再读。

第一轮读到以下四个位置就够了，论文开头关于时间与空间可组合性的定义，revertible effects，reactive coeffects，以及组件和配置加载的实现部分。读完以后回到三个实验，分别回答卸载时谁负责清理，依赖满足时谁让组件启动，profile 改动时哪些实例需要重新协调。

还要保留一条安全边界。依赖声明和 interception 可以收紧插件通过框架代理能看到的能力，但它们不自动构成恶意代码沙箱。一个拥有宿主进程权限的插件，可能访问底层对象，不信任的代码仍需要独立进程、受限运行时或其他系统级隔离。论文也明确讨论了这条边界，教程不能把`插件能卸载`写成`插件安全`。

论文里的本地 cleanup 也有范围。临时 profile、课程状态和本地子进程可以清理，已经发出的网络请求、外部消息、付费调用和 GitHub 发布不能靠一个 `reset` 假装没有发生。以后 dsh-learn 如果加入自动化课程，外部动作必须单独提示和记录。

把顺序压缩成下面四步

1. 先看[完全新手快速上手卡](dsh-beginner-quickstart-rc6.md)，按截图确认 Node.js、固定版本启动和 Web UI 入口，这一步解决`电脑是否具备运行条件`。
2. 再跑 `labs/cordis-no-key/probe.mjs`，观察 profile 和组合配置，这一步解决`DSH 启动以后到底挂了什么`。
3. 再跑 `labs/hello-plugin/verify.mjs`，观察安装、加载和移除，这一步解决`插件怎样进入和离开 profile`。
4. 最后跑 `labs/tool-plugin/verify-offline.mjs`，观察工具 schema 和执行契约，这一步解决`插件怎样接入一个能力点`。

等这四步都有自己的回执，再配置 provider、API Key 和真实模型请求。这样遇到失败时，至少能区分 Node.js、npm、profile、bundle、插件加载、工具注册和模型响应，不会把所有问题都归结为`DSH 没装好`。

DSH 还处在快速迭代的 Developer Preview 阶段，命令和插件契约可能变化。每次复测都应该记录官方 commit、npm 版本、Node.js、系统、是否使用 Key 和没有覆盖的范围。Cordis 论文本身也注明仍在修订，读者应当以最新版本为准。

对 dsh-learn 来说，这条路线比先做一门大而全的课程更有用，它把论文里的抽象概念变成几个可以观察的动作，也保留了每个动作没有证明什么。以后上游改了 profile、bundle 或工具注册方式，只需要定位受影响的一层，重新验证对应实验，不必把整套教程推倒重写。

## 验证范围与来源

- [DeepSeek Harness 官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)，确认 DSH 的插件化定位、Cordis 论文入口、Developer Preview 和基础启动方式。
- [Cordis 论文仓库](https://github.com/cordiverse/paper)，提供论文摘要、PDF 和预印本仍在修订的说明。
- [dsh-learn Cordis 无 Key mini-lab](../../labs/cordis-no-key/README.md)，确认 profile/config 实验及无 Key 边界。
- [dsh-learn 第一个插件实验](../../labs/hello-plugin/README.md)，确认 bundle 安装、加载和移除路径。
- [dsh-learn 工具插件实验](../../labs/tool-plugin/README.md)，确认工具注册与离线契约检查范围。
- 论文：*A Programming Paradigm for Spatiotemporal Composability*，Cordis 论文仓库标注为 2026-08-13 draft，并声明预印本仍在主动修订。
- DSH 固定基线：官方 commit `47f943859bef60e4160492346772ded9b24f765a`；npm 包 `@deepseek-ai/dsh@0.1.0-rc.6`。
- 本地验证命令：`pnpm validate:cordis-lab`、`pnpm validate:plugin-lab`、`pnpm validate:tool-plugin-offline`。
- 本文引用的动态范围来自 dsh-learn 既有实验回执；本文新增的是面向新手的阅读顺序与概念映射。
- 凭据边界：不使用、不保存、不展示 API Key；知乎发布仍需主理人明确同意。

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

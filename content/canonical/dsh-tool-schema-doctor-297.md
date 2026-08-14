# 标题候选

| 标题 | 点击欲 | 信息量 | 跟我有关 | 可信 | 差异化 | 总分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 推荐标题：DSH 插件一装就报 400，先检查工具参数是不是 `type: object` | 10 | 10 | 10 | 10 | 10 | 50 |
| DSH 工具插件怎么自检：不用 API Key，先把 JSON Schema 根类型查清楚 | 9 | 10 | 10 | 10 | 9 | 48 |
| 一个插件为什么会拖垮整个 DSH 会话，问题可能只在一行 schema | 10 | 9 | 10 | 9 | 10 | 48 |
| 不会写复杂插件也要知道，`ctx.tools.register` 的参数根必须是 object | 8 | 10 | 9 | 10 | 9 | 46 |
| 从图片识别插件报错看 DSH 工具开发，先跑一遍本地 schema doctor | 9 | 9 | 9 | 9 | 10 | 46 |

# 正文

DeepSeek Harness 的插件不一定要写很多代码，常常是工具注册时的一小段结构没有符合 JSON Schema，结果把人卡在模型请求这一层。官方 Discussions #297 里，一位用户安装自己写的图片识别插件后，模型请求反复出现 `Invalid schema for function vision_query`，错误还指出收到的参数根类型是 `null`。

这条信息只对应一个插件和一次环境，不能扩展成所有 DSH 插件都会出错，也不能当作 dsh-learn 已经在本机重新调用模型复现了这个问题。帖子后续更新把原因指向工具的 `parameters` 根结构，插件传入的是一张属性表，最外层却没有声明 `type = object`，模型函数调用接口需要的则是一个对象参数入口。

## 让插件在请求模型以前暴露问题

如果插件注册了错误的工具 schema，问题未必出现在 `ctx.tools.register()` 这一行。等 DSH 把工具定义交给模型接口，整轮请求才可能返回 400，新手看到的就会是 `模型突然不能用了`，很难想到某个插件的参数契约出了问题。

第一次做工具插件时，安装记录、加载日志和 schema 检查要分开看。安装成功只代表包被写入某个位置，加载成功只代表入口执行过，工具参数能不能被模型接口接受，还需要自己的检查结果。

`parameters` 的根必须是对象，内部再放 `properties`、`required` 和其他 JSON Schema 字段。可以把它理解成一张表的外壳，`properties` 描述表里的列，外壳本身不能被省略，不能把里面那张字段表当成完整参数定义。

完全新手不需要在第一次实验里学完 JSON Schema，先记住 `parameters.type = object` 这一条就够了。后面再根据工具需要补充必填字段、额外字段限制和每个参数的类型，遇到错误时也有一个明确的回查位置。

## dsh-learn 现在可以先做本地体检

在 dsh-learn 根目录运行下面的命令

```bash
node scripts/tool-schema-doctor.mjs ./labs/tool-plugin/index.js
```

这条命令只读取本地入口，不会修改你的日常 profile。

这个检查器会在本地导入插件，提供隔离的 `ctx.tools.register()`，收集插件注册的工具，检查工具名称、`parameters.type` 和 `execute` 是否存在。检查器本身不访问 npm，不调用模型，也不需要 API Key。

你生成自己的工具插件以后，可以把路径换成自己的入口文件，也可以给插件目录

```bash
node scripts/tool-schema-doctor.mjs ./my-tool/index.js
node scripts/tool-schema-doctor.mjs ./my-tool
```

两种写法都指向本地插件，目录写法会寻找其中的 `index.js`。

看到 `PASS parameters.type = object`，只说明本地注册层通过了这一条契约，不能把它写成 DSH runtime、第三方依赖、模型工具调用或安全审计已经通过。检查器会执行插件的 `apply(ctx)`，陌生插件导入前要读 `package.json`、入口文件和构建脚本，确认它可能访问哪些文件、网络或进程。

如果工具写成了错误的形状，体检器会把问题指向 `parameters.type`，不用等模型接口返回一段很长的 400 错误以后才猜原因。修好以后，再运行 dsh-learn 的离线实验

```bash
node labs/tool-plugin/verify-offline.mjs
```

离线实验会检查工具注册、参数 schema、执行函数和渲染器，但不会请求模型。schema doctor 针对你自己的入口文件，离线实验针对仓库里的完整示例，两项结果放在一起，能把参数根、执行函数和渲染器分别看清楚。

如果离线检查通过，仍然要等 npm registry 可达以后，再用固定版本 DSH 做安装、`--dump-config`、启动和移除。真实安装会多出 profile、pnpm 和第三方依赖这些变量，模型调用还会多出 provider、接口地址和凭据，不能用一条本地 PASS 把它们合在一起。

对刚接触终端的人来说，`tool-schema-doctor` 的位置很靠前，它不要求你先把 DSH Web UI 跑起来，也不要求你先申请模型服务。你只需要有 Node.js、一个本地插件入口和 dsh-learn 文件，就能先判断插件有没有把工具注册成一个可以继续检查的对象。

这一步也适合用来检查自己改过的最小插件，比如你只改了工具名称，或者给 `properties` 增加了一个字段，先重新运行体检器，确认参数根没有被顺手改掉，再去看 profile 安装。每次只改一个地方，输出一旦变化，回查范围会小很多。

如果体检器报 `parameters.type`，先回到注册定义，不要急着换模型、改 provider 或重装 Node.js。错误发生在插件提供的参数描述，和模型额度、API Key、浏览器页面以及 3080 端口都不是同一层，前面的本地检查通过以后，再处理后面的运行环境。

如果体检器通过，但 DSH 启动时仍然报错，可以把两份结果放在一起看。体检器只执行本地 `apply(ctx)`，没有验证 bundle patch 是否把入口接入 profile，也没有验证第三方依赖是否能在当前 Node.js 和 pnpm 下安装，真实 DSH 的加载回执仍然需要单独保留。

工具返回值也有自己的检查位置。当前 schema doctor 只关注工具名称、参数根和 `execute`，不会替你判断输出内容是不是用户想要的格式，`labs/tool-plugin/verify-offline.mjs` 才会继续检查执行结果和渲染器，这样每个检查器负责的范围比较清楚。

## 社区修复状态仍然要单独看

Discussion #297 的后续回复里，作者提到自己准备了 Harness 侧的修复分支，也为插件侧修复提交了变更，帖子里的 fork 和 PR 状态不能等同于官方仓库已经发布修复。当前教程只提取一条可以独立检查的开发规则，工具参数需要合法的对象根，插件错误应当在加载或本地体检阶段尽早暴露。

完全新手可以从本地无 Key 工具示例起步，跑 schema doctor，接着做离线注册检查，等网络恢复后进行固定版本 DSH 的真实安装和加载，模型尝试调用工具放到后面。每一层都有自己的结果，启动日志不能替代 schema 检查，离线通过也不能替代模型调用。

排错时可以把一次失败写成几行很短的记录，工具入口是什么，注册了几个工具，`parameters.type` 输出什么，离线执行有没有返回值，DSH 的 profile 有没有出现 bundle，模型请求返回了哪个状态码。这样下一次换工具或换版本时，不需要把一大段终端日志重新贴出来，也能看出问题停在本地注册、DSH 加载还是模型接口。

如果你只是照着 dsh-learn 学习，不要一开始就修改日常 profile。把自己的插件放在练习目录，用 schema doctor 和离线检查确认结构，再复制到临时 `DSH_HOME` 做安装和移除，插件出现异常时删掉临时目录即可，日常环境不会跟着一起坏掉。

如果你在给别人提供插件，README 里也可以把这条本地命令写进去，让使用者在安装前拿到一份明确回执。它不能代替锁定依赖、审阅构建脚本和测试卸载，但至少能把最容易被忽略的参数根问题提前暴露，用户也不会把一个工具 schema 错误归到模型能力上。

这份回执还适合放进插件的版本记录，和 DSH 版本、Node.js 版本一起保存。以后参数结构发生变化，维护者可以看出是工具定义改了，还是运行时环境换了，不必只凭一句模型报错回忆当时的配置。

对学习者来说，这样保存一条结果也很有用，下一次换电脑或换插件时，可以拿旧回执和新回执逐项比较，知道自己是在同一层继续练习，还是已经进入了新的安装变量。

这张卡的验证覆盖 dsh-learn 自带工具示例、故意构造的错误 schema 和本地检查脚本，没有使用 API Key，没有安装未知第三方插件，也没有发起模型请求。DSH 仍然处在 Developer Preview，升级版本以后，工具注册契约和插件生命周期都要重新复测。

# 备用标题

1. DSH 插件报 400 时别先重装，先看 `parameters` 有没有 `type: object`
2. 第一个 DSH 工具插件怎么自检：本地检查 schema，不需要 API Key
3. 从一个图片插件故障开始，学会给 DSH 工具加上正确的参数根

# 编辑附录

- 官方讨论：[Discussion #297](https://github.com/deepseek-ai/deepseek-harness/discussions/297)。
- 官方工具文档：[开发一个工具](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/tool.zh.md)。
- 本地检查器：`scripts/tool-schema-doctor.mjs`。
- 本地验证命令：`pnpm validate:tool-schema-doctor`、`pnpm validate:tool-plugin-offline`、`pnpm validate:tool-plugin-lab`。
- 本卡只验证本地注册契约，没有调用模型，没有使用或保存 API Key，没有安装第三方插件；知乎不自动发布。

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

# DSH Code Mode 报参数错误，先分清外层 `run_code` 和内层 `bash`

DeepSeek Harness 的 Code Mode 有一种报错很容易把人带偏，模型看起来已经写了 `description`，DSH 却继续返回 `INVALID_ARGS`，随后模型又把相似的调用发一遍，用户只看到一轮接一轮的失败。

官方 Discussion #558 记录的就是这种情况，问题出在外层 `run_code` 和内层工具调用都可能要求 `description`，模型把说明放进了代码字符串，外层 JSON 里却没有自己的字段。固定 commit 的源码还显示，`run_code` 的参数包含必填的 `code` 与 `description`，后者是界面显示的程序摘要，和代码文本里出现的同名文字不在同一个对象里。


我觉得这个问题很适合拿来给新手讲 Code Mode，因为它不要求你一上来就读 Agent 循环，先把一层 JSON 和里面的一次工具调用分开，很多看起来很吓人的报错就有了回查位置。


## Discussion #558 记录的那次循环

帖子给出了一次完整会话的计数，同一会话发出了 160 次 `run_code`，其中 156 次只有 `code`，这 156 次全部因为缺少外层 `run_code.description` 而失败，剩下 4 次补上外层字段以后，3 次成功，另 1 次又卡在内层 `bash` 没有携带 `description`。

更容易让人误判的地方在于，那 156 次调用中有 120 次已经在 `code` 字符串里写了类似 `tools.bash({ command, description })` 的内容，模型确实写过说明，只是说明落在了程序文本或内层调用里，外层参数校验看到的对象仍然只有 `code`。

这不是一次普通的字段拼写错误就能概括完的故障，外层和内层使用相同的字段名，错误提示又没有把层级说得足够清楚，模型收到反馈以后容易沿着原来的形状继续尝试。讨论里有人建议在错误提示中带上工具名称，也有人建议把界面摘要字段改成 `summary` 或 `label`，这些属于帖子里的社区建议，不能写成固定版本已经采用的改动。


如果你只是想把一次失败记录下来，那么把外层工具名、外层参数、内层工具名和内层参数分别记住，比把一整段模型输出复制下来更有用，因为下一次回看时，你能知道错误到底落在 `run_code` 还是 `bash`。


## 两个 description 属于两个调用

可以先把一次 Code Mode 调用想成两层，第一层由 DSH 先接收，工具名是 `run_code`，它需要 `code` 和 `description`，其中 `description` 描述整段程序准备做什么。

第二层发生在代码运行以后，程序通过 `tools.bash` 或其他可见工具继续发起调用，这一次的 `description` 描述一条具体的命令。外层摘要可以写成检查当前目录，内层摘要可以写成显示当前目录，两者说的是同一件事也没有关系，字段仍然要各自放在各自的参数对象里。

所以只在内层补上字段，外层仍然会在创建 `run_code` 时被拒绝，只在外层补上字段，内层 `bash` 如果也要求摘要，程序继续执行时仍然可能失败。把同名字段当成两个位置来检查，排错时才不会在模型、provider、API Key 和插件代码之间来回切换。

对完全新手来说，可以把验证顺序压缩成几个相互独立的结果，Node.js 和 DSH 能不能启动是一层，外层 JSON 能不能通过参数校验是一层，内层工具有没有真的执行是一层，provider 有没有返回模型结果又是另一层。每层都留下自己的回执，下一次换版本时才有比较依据。

## 在模型请求前跑本地体检

dsh-learn 里加了一个小型的 Code Mode 参数分层体检器，它读取一份教学用 JSON 夹具，分别检查外层 `run_code` 和夹具中列出的内层 `bash`，不会执行夹具里的 JavaScript，也不会要求你先配置 provider。

在 dsh-learn 根目录运行默认夹具。

```bash
node scripts/code-mode-args-doctor.mjs
```

正常输出会分别确认外层 `code` 与 `description`，以及内层 `command` 与 `description`。外层缺字段的故意失败夹具可以这样运行。

```bash
node scripts/code-mode-args-doctor.mjs \
  labs/code-mode-args-doctor/fixtures/missing-outer-description.json
```

上面的命令只读取本地夹具。

输出会指出 `外层 run_code.arguments.description`，同时说明代码字符串里的同名文字不能代替这个字段。内层缺字段的夹具可以这样运行。

```bash
node scripts/code-mode-args-doctor.mjs \
  labs/code-mode-args-doctor/fixtures/missing-inner-description.json
```

这个命令只检查内层夹具。

这一次输出会指出 `内层 tools.bash[0].arguments.description`，你可以回到具体的内层调用，不用先重装 Node.js，也不用先更换模型。

项目的验证脚本覆盖正常夹具、外层缺字段和内层缺字段三条路径。

```bash
node scripts/validate-code-mode-args-doctor.mjs
```

遇到只写出 `description` 的错误时，错误对应的工具名、参数对象和 `code` 文本最好一起记下，排错记录会比只截取最后一行报错更完整。

如果你已经有自己的记录，可以参考 `labs/code-mode-args-doctor/fixtures/valid.json`，把外层调用放进 `outer`，把已经观察到的内层调用放进 `nested`，再把文件路径传给体检器。记录里不要放 API Key、Cookie 或完整私有日志，保留代码片段和必要参数就够了。

这项检查只回答本地夹具里的字段层级是否完整，它没有启动 DSH，没有模拟工具调度，也没有调用模型。它适合帮助你定位错误，不适合拿来证明某个版本已经在真实 provider 上完成了一次 Code Mode 会话。

夹具格式故意把两个层级写成 `outer` 和 `nested`，这样新手打开文件时能先看见调用关系，再去看每个对象里的字段。它和官方会话日志的保存格式不等同，也不要求你把一次完整对话搬进仓库，记录一条外层调用和已经观察到的内层调用就够了。

体检器只读取这些字段，不会执行 `code` 里的命令，不会导入夹具列出的插件，也不会访问网络。即使你把 `command` 写成删除文件或修改配置的内容，体检器也只把它当作文字检查，不会在电脑上运行。这个限制对刚开始排错的人很重要，因为检查参数时不应当顺便触发工具副作用。

如果你从错误日志整理夹具，先把用户名、工作目录、公司名称和访问令牌换成示例值，再保留字段名称与空值状态。外层字段缺失和字段为空是两种记录，内层字段缺失也应当单独留下，这样别人复测时知道自己要观察哪一个失败分支，报告不会变成一段无法重放的私有日志。

当默认夹具通过、两个故意失败夹具也能给出不同路径以后，新手已经完成了本地参数层检查。下一步可以回到[完全新手快速上手卡](dsh-beginner-quickstart-rc6.md)，先确认 DSH 能启动，再把模型配置与 Code Mode 运行放到后面，顺序不会因为一次 `INVALID_ARGS` 就被打乱。

## 通过以后还要看运行环境

本地字段体检通过以后，固定版本 DSH 的 profile 是否加载了 Code Mode，要单独看启动和配置回执，`bash` 是否执行，要看工具结果，provider 是否返回模型响应，要看真实请求，如果调用来自第三方插件，还要审阅它的入口文件、构建脚本和权限范围。

这也是 dsh-learn 把这项资产写成事实卡的原因，Discussion #558 中的 160 次调用来自原帖作者的社区报告，`code-mode.ts` 中的必填字段是固定 commit 的源码事实，本地 doctor 通过的是 dsh-learn 自己的教学夹具，三者的证据等级并不相同。

本文没有把这次社区报告写成官方已经修复，也没有把本地夹具通过写成模型调用已经复现。以后如果 DSH 修改界面摘要字段、错误提示或 Code Mode 的参数契约，需要重新读取源码和讨论，再对现有夹具做一次兼容性复测。


我更建议新手把这条命令当成排错的第一张小卡片，看到错误时先确认它属于哪一层，再去处理模型和运行环境，至少不会因为一条字段提示就把整套配置全部推倒重来。

## 验证范围与来源

- 官方 Discussion：[Discussion #558](https://github.com/deepseek-ai/deepseek-harness/discussions/558)。
- 固定 commit 的 Code Mode 源码：[packages/core/tools/src/code-mode.ts](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/tools/src/code-mode.ts)。
- 官方工具说明：[packages/core/tools/README.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/tools/README.zh.md)。
- 本地体检器：`scripts/code-mode-args-doctor.mjs`。
- 本地夹具：`labs/code-mode-args-doctor/fixtures/`。
- 基线：DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`，npm 包 `@deepseek-ai/dsh@0.1.0-rc.6`。
- 证据边界：Discussion #558 的调用次数属于社区报告；本地体检只检查教学 JSON 的字段层级，没有启动 DSH、调用模型或安装未知插件。
- 凭据边界：本文不使用、不保存、不展示任何 API Key；知乎发布仍需主理人明确同意。

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

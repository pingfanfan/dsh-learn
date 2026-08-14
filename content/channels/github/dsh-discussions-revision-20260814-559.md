# DSH 接第三方 OpenAI 兼容网关，为什么还会 400

> 事实基线是 2026年8月14日，DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`，`@deepseek-ai/dsh@0.1.0-rc.6`。DSH 仍处于 Developer Preview，下面的社区报告、增强 fork 和测试代码都不等于官方已经合并的功能。

## OpenAI 兼容只说明了一部分

很多新手接入 DSH 时，会把配置想成三格，接口地址、API Key、模型名，只要第三方网关写着 OpenAI-compatible，理论上填完这三格就应该能用。

Discussion #559 把这个想法拆开了。不同网关虽然都能接收相似的 Chat Completions 请求，但仍可能在系统消息的角色、思考参数的写法、输出上限字段和工具结果回放上做不同选择，私有网关的 URL 本身并不能告诉 DSH 这些细节。

于是就会出现一种很让人困惑的错误，模型列表能拉出来，模型也能添加，发送消息时却返回 400。问题不一定在 API Key，也不一定在模型名称，可能只是 DSH 把一个网关不接受的字段发出去了。

## #559 展示了什么，暂时没有证明什么

#559 的作者提出了三件事。第一，在添加模型时向端点发几个最小请求，探测思考档位、系统角色和输出字段，第二，用按主机名匹配的 preset 保存已经测过的网关事实，第三，在一个增强 fork 里把更多 compat 开关接进 DSH。

这个方向很适合做生态资产，因为新网关的差异可以沉淀成数据，不必每遇到一个中转站就改一次核心代码，不过这篇 Discussion 是 Show and tell，不是官方发布说明，作者链接的 `dsh-gateway-presets` 仓库在本次核对时返回 GitHub 404，不能把它当成已经可以安装的插件。

作者的增强 fork 分支可以公开读取，里面确实有 `llm-gateway-presets` 包、模型能力探测模块、注册表测试和 9 个 compat 字段的代码，分支最新提交是 `42e228e`。但它仍然是 `Menger-8/deepseek-harness` 的 fork，不是 `deepseek-ai/deepseek-harness` 官方主仓的合并状态，代码里写了测试，也不等于 dsh-learn 已经用真实网关跑过一次。

官方固定版本的 `PiAiCompatProfile` 当前只暴露 `thinkingFormat` 和 `supportsReasoningEffort` 两个思考相关字段，增强 fork 把 `supportsDeveloperRole`、`maxTokensField` 等更多字段接进来，说明它在解决一个真实的配置缺口，但不能据此写成官方 DSH 已经支持 9 个开关。

## 新手最容易遇到的 4 类误判

如果请求因为 `messages.role` 被拒绝，先检查网关是否接受 `developer`，不要马上重装 DSH，#559 的案例是，某些 OpenAI 兼容端点仍然只接受 `system`、`assistant`、`user` 和 `tool`，同一个请求改用 `developer` 就会失败。

如果思考强度选择器没有出现，原因也可能不在接口地址，而在当前模型配置没有声明 `reasoningEfforts`，反过来，选择器出现了也只说明配置层准备发送思考参数，不等于端点已经接受过这个参数。

如果错误指向 `max_tokens`、`max_completion_tokens` 或类似字段，先把错误原文保存下来，再记录网关、模型和 DSH 版本。兼容层的字段名称不同，不能把一个网关的配置照抄给另一个网关。

#558 还展示了另一种容易被误判的情况，code 模式里，外层 `run_code` 和内层 `bash` 都要求一个叫 `description` 的字段，模型把内层字段写进代码，却漏掉了外层 JSON，结果反复收到同一句缺少参数的错误。这个问题和网关 400 不是一回事，但它们看起来都像工具调用随机坏了。

最近的 #553–#558 都在提醒同一件事，动态插件的服务面、Cordis preset 的挂载范围、Windows 安装状态、本地插件路径和工具参数层次，应该分别排查，不要看到 DSH 报错就把所有问题归到模型或 API Key 上。

## 新手应该怎样接入自己的网关

第一步仍然是确认 DSH 本身可用。先按照 dsh-learn 的[完全新手教程](dsh-zero-to-first-plugin-rc6.md)安装 Node.js，用固定版本启动 Web UI，并在没有 API Key 的情况下确认页面能打开，再进入模型配置。这样可以把 DSH 没装好与网关不兼容分开。

第二步只记录本地配置，不要把真实 Key 写进教程、截图、Issue 或 Git 仓库。需要记录的是网关的主机名、完整的 DSH 版本、模型 ID、接口协议、错误状态码和响应中的关键字段，凭据本身不属于排障证据。

第三步一次只改变一个兼容变量。先确认模型列表能否取得，再确认普通请求能否返回，然后再打开思考档位、工具调用和图片输入。每一层都留下原始回执，遇到失败时回到上一层，不要同时替换模型、网关地址和 preset。

如果社区里有人说支持任意 OpenAI 兼容网关，还要继续看它提供的到底是什么，是官方 DSH 已合并的功能，还是 fork，是一个能用 `dsh plugin add` 安装的 bundle，还是需要自己编译的源码，是已经对真实端点做过探测，还是只写了模拟服务器测试。对新手来说，这几个区别比功能列表更重要。

## dsh-learn 现在能负责哪一层

dsh-learn 可以先提供不依赖 API Key 的 DSH 安装、Web UI 启动和 hello-plugin 实验，让新用户建立一个稳定基线，第三方网关则进入单独的兼容性记录，不混进第一个插件已经安装成功的教程里。

后续如果要做网关矩阵，最小记录可以只包括网关主机模式、模型 ID、协议、思考参数、角色字段、输出字段和复测时间，任何一项没有真实回执，就标记为未验证。这样即使某个社区仓库突然消失，读者仍然能看懂这条信息来自哪里、验证到了哪一步，以及自己还需要补哪一项。

当前不宜安装 #559 的 fork，先把自己的 DSH 版本、网关和错误回执记录下来。等官方主仓或社区包给出明确的安装入口，并且有不依赖私人凭据的兼容性验证，再把它加入新手路径。

## 一条回执应该包含什么

假设你已经能打开 DSH 页面，接入一个第三方网关后收到 400，最有用的记录应当包含一组能让别人复查的上下文，里面包括 DSH 版本、操作系统、网关主机名、模型 ID、使用的 API 协议、是否打开思考档位、错误状态码和服务端返回的字段。

接口地址可以保留到主机名和公开路径，Key 用环境变量或本机设置保存，日志里的 Authorization 内容要删掉，工作区路径、Cookie 和带有个人信息的请求内容也不应上传。这样别人能判断是角色、思考参数、输出上限还是工具层的问题，又不会因为一条排障记录暴露凭据。

如果同一个模型在普通请求下成功，在打开思考档位后失败，记录就应该把这两次请求分开，不要只写成网关不可用。如果模型列表请求成功但消息请求失败，也要把这两个结果分开，因为列表接口能用，只说明网关允许读取模型清单，不能推导聊天端点接受 DSH 发出的全部字段。

对完全新手来说，这种记录方式比记住 9 个 compat 字段更重要，字段会随版本变化，分层的回执却能帮助你在换网关、换模型和升级 DSH 后重新定位问题。

## 兼容性不是一次性的标签

网关的兼容性还会跟模型和接口版本一起变化，同一个主机名下可能有普通聊天端点、代码端点和不同版本的 API 路径，它们未必拥有完全相同的请求规则。因此预设按主机名提供默认值时，只能作为起点，模型配置和具体路径仍然要纳入记录。

这也是 #559 里能力探测有价值的地方，它没有把某个模型名称当成能力证明，而是尝试用最小请求观察端点的回应。探测结果依旧需要标出模型、路径和时间，因为一条旧回执不能替代升级后的复测，网关服务商也可能在不改域名的情况下调整兼容层。

对于 dsh-learn，新手不需要一上来理解这套实现的全部代码，可以先学会识别每一层的输入和结果，模型列表请求得到什么，普通消息得到什么，思考参数打开后发生什么，工具调用失败时错误来自外层还是内层。每次只增加一个变量，记录就能逐渐变成一张可复查的兼容性卡。

这张卡以后既可以帮助用户自己排障，也可以帮助社区作者贡献 preset，前提是它把真实回执、适用范围和未测试的部分一起写出来，不能只留下一个看起来很完整的字段表。

维护基线（2026-08-14）：官方 Discussions 当前已复核到 6 页、600 条公开讨论，编号从 `#12` 到 `#614`。#559 链接的 `dsh-gateway-presets` 已在后续核验中恢复可访问，但这只更新来源状态，不改写本卡对 #553–#559 的历史观察，也不把 #560–#614 的其他报告混入结论。

## 验证范围与来源

- [官方 Discussions 第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [#553](https://github.com/deepseek-ai/deepseek-harness/discussions/553) · [#554](https://github.com/deepseek-ai/deepseek-harness/discussions/554) · [#555](https://github.com/deepseek-ai/deepseek-harness/discussions/555)
- [#556](https://github.com/deepseek-ai/deepseek-harness/discussions/556) · [#557](https://github.com/deepseek-ai/deepseek-harness/discussions/557) · [#558](https://github.com/deepseek-ai/deepseek-harness/discussions/558) · [#559](https://github.com/deepseek-ai/deepseek-harness/discussions/559)
- [官方固定 commit 的 `catalog.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/llm/llm-pi-ai/src/catalog.ts)
- [增强 fork 分支](https://github.com/Menger-8/deepseek-harness/tree/feature/third-party-gateway-compat)
- [网关 compat 设计记录](https://github.com/Menger-8/deepseek-harness/blob/feature/third-party-gateway-compat/.agents/notes/implemented/architecture/2026-08-14-gateway-compat-presets.md)
- [增强 fork 的 gateway presets 中文说明](https://github.com/Menger-8/deepseek-harness/blob/feature/third-party-gateway-compat/packages/llm/llm-gateway-presets/README.zh.md)
- [#559 链接的 `dsh-gateway-presets` 仓库（核对时返回 404）](https://github.com/Menger-8/dsh-gateway-presets)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。

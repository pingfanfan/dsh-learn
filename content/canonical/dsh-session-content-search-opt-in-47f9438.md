# 标题候选

| 标题 | 点击欲 | 信息量 | 跟我有关 | 可信 | 差异化 | 总分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 推荐标题：DeepSeek Harness 的会话内容搜索为什么默认关闭？看懂 `openAt: never` | 9 | 10 | 9 | 10 | 10 | 48 |

# 正文

DeepSeek Harness 当前主分支有一个很容易被误读的变化，默认部署里的会话内容搜索被关掉了，但 `sessionQuery` 这个能力没有被删掉。

结果是你在 Web 侧边栏里仍然可以按标题和工作区名称找到内容，想按会话正文搜索时却会收到 `当前部署已禁用会话搜索` 的提示，搜索功能并没有坏掉，SQLite 没有安装失败，官方只是把全文索引从默认交付改成了部署方主动打开的选项。

## `openAt` 设为 `never` 具体关掉了哪一层

官方在 `@deepseek-ai/dsh-session-query-sqlite` 这一行把配置写成 `openAt` 为 `never`，它控制的是 SQLite 提供方什么时候打开，也没有把整个会话服务从运行时拔掉。

在这个阶段，`searchSessions()` 和 `searchEvents()` 会在请求规范化以前返回类型化的 `SESSION_QUERY_SEARCH_DISABLED` 错误，Node 的 SQLite 模块不会被导入，也不会创建派生的全文索引，更不会运行来源观察和对账，对于默认安装来说，这一组动作都不会悄悄发生在后台。

精确读取、过滤和会话 lineage 跟踪仍然可用，因此会话导出、分叉 Workspace 的继承关系和标题读取不受影响。你仍然可以读取一个已知会话、沿着它的关系继续追踪，只是不能把整份会话语料库交给全文搜索去扫。

这里的 `openAt` 控制索引何时启动，`never` 表示永不打开，`first-search` 表示第一次搜索时才打开，`startup` 表示服务启动时打开。它们影响索引创建时机和部署成本，不影响模型本身回答问题的能力。

## 官方为什么没有删掉这一行

如果只是从 bundle 里删掉 `session-query-sqlite` 这一行，看起来更干净，实际会破坏另一条依赖关系。官方记录里提到，`ApiProxyService` 仍然要求 `sessionQuery` 存在，宿主 API 网关和 Web GUI 都要通过这条 seam 访问会话能力，卸载提供方以后，主机启动就可能失败。

官方在提供方处关闭全文搜索，让上层仍然拿到一个稳定的 `sessionQuery` 服务。搜索工具如果被挂载却没有覆盖 `openAt`，调用时会得到模型可以理解的 `session search is disabled in this deployment`，而不是把 SQLite 的异常堆栈暴露给模型。

Web 侧边栏也保留了降级路径，标题和工作区匹配继续工作，同时显示内容搜索不可用。这个设计对维护者比较友好，你可以先把 DSH 作为一个不带派生索引的默认 profile 交付，等确认数据规模、存储位置和隐私边界以后，再决定是否开放正文搜索。

## 想要正文搜索，需要在后续 patch 里明确打开

官方给出的路径很清楚，部署者在后续 patch 层重新覆盖 `session-query-sqlite` 这一行，把 `openAt` 改成 `first-search` 或 `startup`，通常还要给 SQLite 配一个持久化 `path`。配置示意放在本文附录里，正文只需要记住这三个字段的关系。

这段配置用于你的 profile 或 patch overlay，对官方 bundle 做明确覆盖，实际放置位置要跟当前 profile 的 patch 结构一致。一旦把 `openAt` 改成可启动的阶段，搜索就会带来派生索引、SQLite 文件和后续对账，`path` 放在哪里、谁能读到、升级时是否保留，都应该由部署者自己决定。

`first-search` 更适合先验证功能，它不会在用户从未搜索正文时提前打开 SQLite，第一次搜索才承担初始化成本，`startup` 更适合已经确认服务会稳定使用全文搜索、希望把初始化放到启动阶段的部署。Web bundle 目前把路径写成内存数据库，官方的 e2e 脚手架则专门覆盖了内容搜索开启的测试路径，这两者都不等于所有生产部署都应该照抄。

如果你的部署只是想保留会话导出、标题匹配和 Workspace 继承，就不要为了让搜索按钮看起来完整而打开索引。默认关闭省下的不只是一个文件，还包括 SQLite 的导入、搜索来源的观察和派生数据的维护，尤其是在会话内容可能包含敏感信息的场景里，测试配置不能悄悄变成生产配置。

## 看旧教程时，先核对它到底打开了什么

早期资料如果写着 `启动后默认可以搜索会话内容`，不能套到当前主分支。你至少需要同时核对官方 commit、`packages/bundle/base/cordis.patch.yml` 和 `packages/bundle/web-app/cordis.patch.yml`，确认 `session-query-sqlite` 行上的 `openAt`，再看自己的 profile 有没有后续覆盖。

还有一种组合很容易制造误判，工具已经挂载，但提供方仍然把 `openAt` 设为 `never`。这时工具列表看起来像支持搜索，调用却会返回禁用错误，读者可能会把它写成 `DSH 的搜索 API 不稳定`。更准确的记录方式是把 `工具存在` 和 `索引已启用` 分开，前者是运行时接口，后者是部署选择。

对中文教程来说，这个变化值得单独写出来，因为新手先遇到的往往是 `照着文档却找不到正文`，而不是查询语法。把默认状态、错误代码、保留能力和 opt-in 配置放在同一篇里，读者才能判断自己缺的是配置、数据目录还是版本，不必一上来重装 DSH。

当前这项能力最适合的验证动作也很小。固定到官方 `47f943859bef60e4160492346772ded9b24f765a`，检查两个 bundle 是否把 `openAt` 设为 `never`，确认默认 profile 没有生成派生索引，再用一个后续 patch 覆盖成 `first-search`，观察第一次搜索时才出现的初始化行为。等上游再次改变默认策略，这张卡应该重新复测，不要继续把旧命令当成 `最新版`。

如果你维护的是插件，还要多看一层。插件可以依赖 `ctx.sessionQuery` 的精确读取和 lineage 跟踪，但不能假定全文搜索一定可用，调用 `searchSessions()` 或 `searchEvents()` 时要处理 `SESSION_QUERY_SEARCH_DISABLED`，必要时回退到已知会话读取、标题匹配或人工指定的会话 ID。这样插件才不会把默认 profile 当成异常环境，也不会因为用户没有打开索引就把整条工作流卡死。

从旧版本升级的部署也要留一份配置记录。检查当前 profile 的 patch 覆盖、SQLite `path` 和是否存在历史派生数据库，分别记录 `现在会不会搜索` 和 `磁盘上以前有没有文件`，不要只看目录里有没有一个 `.sqlite` 就推断服务已经启用。当前请求取决于提供方的打开阶段，历史文件是否保留则是另一项运维决定。

这件事还有一个很现实的取舍。正文搜索省掉了人工记住会话 ID 的麻烦，但它也会把原本只在会话存储里的内容变成可被索引、查询和维护的派生数据。对于个人 profile，`first-search` 可能已经足够，对于多人共享的部署，搜索范围、存储目录、备份和清理方式都要写进运维说明，不能只把它当成一个界面按钮。

DSH 把全文搜索从默认能力改成部署选项以后，使用者需要记住的是一个很具体的判断，你到底需要搜索正文，还是只需要读取已知会话和它的继承关系。前一种需求要主动承担索引和存储，后一种需求可以继续使用默认 profile，两个场景没有必要共用一套开机配置。

搜索没有打开时，用户仍然可以依靠已知的会话 ID、标题和工作区关系继续工作，插件也可以把需要回看的会话交给用户指定。只有当任务要求从大量历史正文里找关键词时，全文索引才是必要条件，这个差别决定了部署是否需要额外存储，也决定了教程应该把排查重点放在配置还是数据检索上。

如果团队只是试用 DSH，先保留默认状态会更容易观察升级变化，等确实出现跨会话检索需求，再用独立 patch 打开索引并记录目录、权限和备份策略。配置一旦被写进 profile，后面每次升级都应把 `openAt` 和 `path` 当成兼容项重新检查，不能只看 CLI 版本号。

# 备用标题

1. DSH 会话搜索不见了？先检查 `openAt: never`
2. DeepSeek Harness 默认不建全文索引，想搜索正文要自己 opt-in
3. `session-query-sqlite` 还在，但全文搜索为什么关了

# 编辑附录（不随正文发布）

- 事实基线：DeepSeek Harness 官方 master commit `47f943859bef60e4160492346772ded9b24f765a`，访问时间为 2026-08-13。
- 关键实现说明：官方 implemented note 明确记录 `openAt: never`、`SESSION_QUERY_SEARCH_DISABLED`、SQLite 不导入/不打开、后续 patch 可覆盖为 `first-search` 或 `startup`。
- 配置核对：base bundle 与 web bundle 的 `session-query-sqlite` 行都固定为 `openAt: never`，base 与 web 的路径均为 `:memory:`。
- 配置示意：在后续 patch 层覆盖同一个 `session-query-sqlite` 行，使用 `path` 指向持久目录，并将 `openAt` 设为 `first-search`；这是部署示意，不替代当前 profile 的 patch 语法核对。
- 复测边界：本文完成官方文件级核对，未把本地未运行的 DSH 进程结果写成实测，下一次上游 commit 或 bundle patch 改变时应重新检查配置和行为。
- 官方实现记录：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/architecture/2026-08-13-session-content-search-opt-in.zh.md>
- base bundle：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/bundle/base/cordis.patch.yml>
- web bundle：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/bundle/web-app/cordis.patch.yml>
- session-query subsystem：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/session-query.zh.md>
- 维护规则：官方 commit、bundle patch、错误码或部署行为发生变化时，资产标记为 `STALE`，先更新 EvidencePack，再修订各渠道版本。

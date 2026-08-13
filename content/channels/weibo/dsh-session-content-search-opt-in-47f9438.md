# DSH 会话正文搜索为什么不见了

DeepSeek Harness 当前 master 的默认 bundle，把 `session-query-sqlite` 的 `openAt` 设成了 `never`。

所以标题和工作区匹配还在，`searchSessions()`、`searchEvents()` 做正文搜索时会返回 `SESSION_QUERY_SEARCH_DISABLED`，Node 的 SQLite 模块也不会被导入或打开。

这不是搜索坏了，`sessionQuery` 也没有被删。会话精确读取、导出、标题读取和分叉 Workspace 的 lineage 仍然保留，官方只是把全文索引改成部署方 opt-in。

需要正文搜索时，在后续 profile patch 覆盖同一个 `session-query-sqlite` 行，把 `openAt` 改成 `first-search` 或 `startup`，并按部署需要设置持久化 `path`。这会带来索引、SQLite 文件和派生数据维护，别只把它当成一个按钮。

基线：DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`。

来源：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/architecture/2026-08-13-session-content-search-opt-in.zh.md>

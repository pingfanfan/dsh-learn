# Runtime state

`pnpm ops:init` 会在本目录生成 `snapshot.json` 和 `events.jsonl`。它们分别保存本机机会队列快照和追加式事件账本，用于租约、发布协调、崩溃恢复与反馈迭代。

实时运行状态不进入公开 Git 历史。仓库只跟踪本说明；状态契约由 `src/types.ts`、`src/validation.ts` 和 `src/store.ts` 定义，测试使用临时目录覆盖初始化、并发、事务日志与恢复行为。

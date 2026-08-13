# Python SDK 做 Agent 自动化前，先把三个边界锁住

## 结论

DSH 的 Python SDK 很适合接 CI、批量任务和自动化队列，但不应该把官方最小示例直接复制进生产环境。官方文档明确提到 workspace、可复用 session 和 `danger-full-access`；这些能力很强，也意味着路径、日志和重试边界必须先设计。

## dsh-learn 的前置配方

```bash
python3 labs/python-sdk-safety/preflight.py \
  --workspace /absolute/path/to/disposable-workspace \
  --session-root /absolute/path/to/private-sessions \
  --session-id task-001
```

无 `DEEPSEEK_API_KEY` 时，脚本只输出 `BLOCKED_NO_CREDENTIAL`，不会启动模型；session root 会被收紧为 `0700`。有凭据时也只输出“可以进入另一个明确授权的 keyed smoke”，不会替用户自动调用。

## 为什么要这样分层

独立任务应该使用新 session id，续跑才复用原 id；JSONL 会话日志可能包含模型请求、工具参数和文件内容，不能直接进入 CI artifact；workspace 应该是可丢弃 checkout 或容器，而不是用户主目录。

这份配方只验证安全前置检查，没有验证 provider、真实模型请求、Headless 或 ACP 运行时兼容。完整说明见 [Python SDK 安全自动化配方](../../labs/python-sdk-safety/README.md)。


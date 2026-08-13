# 用 Python SDK 做 Agent 自动化，第一步不是填 Key

官方 Python SDK 示例里有三个容易被忽略的边界：workspace 可被 Agent 修改；复用 session id 会保留 Bash 状态；示例组合使用 `danger-full-access`，会把请求和工具调用写进 JSONL。

所以 dsh-learn 先做了一层无 Key preflight：检查 workspace、session root、session id 和凭据存在性；没有凭据只输出 `BLOCKED_NO_CREDENTIAL`，不会启动模型。

配方与固定 commit：[labs/python-sdk-safety/README.md](../../labs/python-sdk-safety/README.md)。真实模型请求、provider smoke、Headless/ACP 运行时暂未验证。


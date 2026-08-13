# Python SDK 安全自动化配方：先隔离，再让 Agent 工作

这是一份面向 CI、批量任务和 Python 用户的安全前置配方。它不重新包装官方 SDK，也不声称已经完成真实模型调用；它把官方示例中最容易被忽略的边界先固定下来，再决定是否进入 keyed smoke。

## 官方示例里最值得先处理的三个事实

固定基线为 DeepSeek Harness `47f9438` 与 `deepseek-harness-sdk` 文档对应版本。

1. 官方 Python SDK 需要一个 Agent 可以修改的隔离 workspace。
2. `DeepSeekHarness` 可以复用同一运行时；复用同一个 `session_id` 会保留该会话拥有的 Bash 进程、工作目录、导出变量和 shell 函数。
3. 官方 `jsonrpc-agent` 组合使用 `danger-full-access`，会把会话请求与工具调用写入未压缩 JSONL；这不是适合直接放进生产 CI 的默认安全边界。

因此，第一版配方的目标是“拒绝不安全启动”，而不是“自动替用户执行模型任务”。

## 先跑无 Key 前置检查

```bash
python3 labs/python-sdk-safety/preflight.py \
  --workspace /absolute/path/to/disposable-workspace \
  --session-root /absolute/path/to/private-sessions \
  --session-id task-001
```

前置检查只做本地路径和环境判断：

- workspace 与 session root 必须是绝对路径；
- workspace 不得等于项目根目录或用户主目录；
- session root 自动创建为仅当前用户可读写的目录；
- session id 只能包含字母、数字、点、下划线和短横线；
- 没有 `DEEPSEEK_API_KEY` 时只输出 `BLOCKED_NO_CREDENTIAL`，不会尝试启动模型；
- 不打印 Key 内容，也不把环境变量写入日志。

这个脚本是 dsh-learn 的安全护栏，不是官方 SDK API 的一部分。

## 有授权后再接官方 SDK

只有前置检查通过、workspace 可丢弃、session 日志不会进入公开构建产物时，才进入下一层。官方调用形态大致如下，具体参数仍以固定版本的官方文档为准：

```python
from pathlib import Path
from deepseek_harness import DeepSeekHarness

workspace = Path("/absolute/path/to/disposable-workspace").resolve()
sessions = Path("/absolute/path/to/private-sessions").resolve()

with DeepSeekHarness(
    provider="deepseek-official",
    model="deepseek-v4-flash",
    cwd=str(workspace),
    session_root=str(sessions),
    cordis=str(Path("minimal.cordis.yml").resolve()),
) as harness:
    result = harness.run(
        "Run the pre-approved task.",
        session_id="task-001",
    )

print(result.final_response)
```

不要把下面几件事混在一次自动化任务里：

- 独立任务与续跑任务：独立任务必须使用新的 session id；
- 可丢弃 checkout 与个人工作区：`cwd` 不应指向包含密钥、浏览器资料或生产代码的目录；
- 运行日志与公开产物：JSONL 可能包含模型请求、工具参数和文件内容，默认按敏感数据保存；
- 失败重试与任务重做：没有先定义幂等键和副作用边界时，不要自动重复运行。

## 配方状态矩阵

| 检查项 | 状态 | 说明 |
| --- | --- | --- |
| Python SDK 的安装与调用形态 | `DOC_CONFIRMED` | 来自官方固定 commit 文档 |
| 隔离 workspace / session root | `RECIPE_REQUIRED` | 本项目的安全前置护栏 |
| `danger-full-access` 组合 | `DOC_CONFIRMED` | 官方示例明确使用，生产使用前必须单独评估 |
| 真实模型请求 | `NOT_RUN` | 需要用户授权和脱敏凭据 |
| provider keyed smoke | `NOT_RUN` | 本项目不代填凭据 |
| Headless / ACP 运行时兼容 | `NOT_RUN` | 当前机会先不把它们写成已验证能力 |

## 生产前最小清单

- [ ] workspace 是可删除的临时 checkout 或容器，而不是用户主目录。
- [ ] session root 不会被 CI artifact、日志采集或公开上传收集。
- [ ] 使用一次性 session id；只有明确续跑时才复用 id。
- [ ] 任务拥有人工批准的操作范围和超时策略。
- [ ] 任务前后记录输入版本、profile、model 和失败阶段，但不记录凭据。
- [ ] 明确哪些动作可以重试，哪些动作必须升级给用户。
- [ ] 真实 smoke 通过后再把结果写入兼容矩阵，不用“安装成功”代替“运行成功”。

## 官方依据

- [Python SDK 快速上手（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/python-sdk.zh.md)
- [Python SDK 参考（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/python/sdk/README.md)
- [Cordis 入门（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-primer.zh.md)


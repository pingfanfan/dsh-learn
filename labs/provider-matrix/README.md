# 国产模型与网关接入实测矩阵

> 基线：DeepSeek Harness `47f9438`，npm 包 `@deepseek-ai/dsh@0.1.0-rc.6`。本页先建立“能确认什么、还没有确认什么”的边界，不把配置字段存在误写成某个模型已经兼容。

## 先看结论

官方 provider 指南确认了三条接入路径：DeepSeek 专用卡片、已安装目录中的提供方，以及自定义提供方。自定义提供方至少需要小写 Provider ID、基础 URL、API 协议、凭据和一个模型；Provider ID 会被请求、会话、默认模型和凭据引用长期使用，不能把它当成随手可改的显示名称。

截至本基线，dsh-learn 只完成了无 Key 的 DSH CLI/profile 冒烟，没有调用任何模型接口。因此矩阵中的“官方字段已确认”不等于“网络请求已成功”。真正的 Hunyuan、Qwen、Kimi、GLM、Doubao、Ollama 或企业网关兼容性，必须用对应端点和精确模型逐项复测。

## 状态定义

| 状态 | 含义 |
| --- | --- |
| `DOC_CONFIRMED` | 当前官方文档明确描述了这条配置路径或字段。 |
| `NO_KEY_SMOKE_PASS` | 只通过了不调用模型、不需要 Key 的本地检查。 |
| `KEYED_SMOKE_NOT_RUN` | 需要真实凭据或可用端点；本轮没有运行。 |
| `PROVIDER_SPECIFIC_UNCONFIRMED` | 官方通用文档没有证明该具体厂商已经可用，不能写成兼容承诺。 |
| `STALE` | DSH 基线、provider 文档或端点行为变化，旧结果必须重测。 |

## 当前矩阵

详细机器可读版本在 [`compatibility.json`](compatibility.json)。

| 提供方或场景 | DSH 路径 | 当前状态 | 已知边界 | 下一步 |
| --- | --- | --- | --- | --- |
| DeepSeek | 官方 DeepSeek 模型卡片 | `DOC_CONFIRMED` + `KEYED_SMOKE_NOT_RUN` | 文档确认密钥配置路径；本地没有调用模型 | 有 Key 后做一次最小文本请求 |
| OpenAI / Anthropic 目录提供方 | 已安装目录 | `DOC_CONFIRMED` + `KEYED_SMOKE_NOT_RUN` | 具体目录版本和认证方式仍需记录 | 按目录实际字段做 keyed smoke |
| 企业网关 / 自建 OpenAI 兼容端点 | 自定义提供方 | `DOC_CONFIRMED` | 需要真实 base URL、协议、凭据和模型 | 先用脱敏配置卡登记，再做端点测试 |
| Hunyuan | 自定义提供方候选 | `PROVIDER_SPECIFIC_UNCONFIRMED` | 当前固定指南没有给出 Hunyuan 专用成功样例 | 确认端点协议、模型 ID 和认证方式后测试 |
| Qwen | 自定义提供方候选 | `PROVIDER_SPECIFIC_UNCONFIRMED` | 不能从“OpenAI 兼容”四个字推导完整 Agent 兼容 | 先测文本请求，再测流式和错误映射 |
| Kimi | 自定义提供方候选 | `PROVIDER_SPECIFIC_UNCONFIRMED` | 需确认目标端点的协议与模型列表 | 记录 `/models` 或手动模型配置结果 |
| GLM | 自定义提供方候选 | `PROVIDER_SPECIFIC_UNCONFIRMED` | 尚无本基线下的 provider-specific 回执 | 做最小文本请求并保存脱敏错误 |
| Doubao | 自定义提供方候选 | `PROVIDER_SPECIFIC_UNCONFIRMED` | 原生认证或网关协议不能凭名称判断 | 先确认认证和 base URL，再决定测试 |
| Ollama | 自定义提供方候选 | `PROVIDER_SPECIFIC_UNCONFIRMED` | 本页没有把本地服务启动或可达写成已验证 | 在本机服务可达时单独测，不上传本地配置 |
| 视觉模型 | 自定义 provider 的 `input` / `defaultInput` | `DOC_CONFIRMED` | 这是对端点能力的声明，不是 DSH 对端点的探测 | 文本通过后再单独测图片请求 |

## 脱敏配置卡

这段只展示字段形状，不能直接作为某一家厂商的完整配置。不要把真实 Key 写入 Git、Issue、Discussion、日志或截图。

```yaml
llm-pi-ai:
  providers:
    my-gateway:
      apiKeyEnv: DSH_PROVIDER_API_KEY
      api: openai-completions
      baseURL: https://gateway.example/v1
      models:
        - id: text-model-id
```

如果端点确实支持图片，才能在模型或路由上声明：

```yaml
models:
  - id: vision-model-id
    input: [text, image]
```

`input` 和 `defaultInput` 是能力断言，不是健康检查。把端点并不具备的图片能力写进去，不会让端点获得该能力；请求最终仍可能被提供方拒绝。

## 每个 provider 的最小测试卡

### A. 无 Key 层

- 固定 DSH 包版本和 Node.js 版本。
- 在临时 `DSH_HOME` 中检查 CLI、profile 和配置导出。
- 验证配置文件结构中没有真实凭据。
- 结果只能记为 `NO_KEY_SMOKE_PASS`，不能记为模型兼容。

### B. 端点层

由拥有该端点权限的人在本地运行：

1. 记录认证类型、base URL、协议、模型 ID；
2. 如果端点支持模型发现，再记录脱敏的 `GET /models` 结果，否则明确记为手动录入；
3. 发送一条最小文本请求；
4. 记录 HTTP 状态、DSH 错误类别、是否流式、是否产生会话；
5. 只有实际通过的请求才进入 `KEYED_SMOKE_PASS`，并注明端点和模型版本。

### C. Agent 能力层

文本请求通过后再分别测试流式输出、长上下文、工具调用、图片输入、取消/超时和错误恢复。不要因为文本请求成功，就替厂商宣称完整 Agent 能力已经兼容。

## 结果记录格式

```json
{
  "provider": "Hunyuan",
  "dshBaseline": "47f943859bef60e4160492346772ded9b24f765a",
  "package": "@deepseek-ai/dsh@0.1.0-rc.6",
  "route": "custom-provider",
  "protocol": "openai-completions / native / unknown",
  "model": "exact-model-id-or-redacted",
  "status": "PROVIDER_SPECIFIC_UNCONFIRMED",
  "checks": {
    "noKeyCli": "PASS",
    "modelDiscovery": "NOT_RUN",
    "minimalTextRequest": "NOT_RUN",
    "streaming": "NOT_RUN",
    "vision": "NOT_RUN",
    "tools": "NOT_RUN"
  },
  "notes": "没有凭据时只能记录字段和待测项。"
}
```

## 什么时候不能继续自动测试

需要用户提供 Key、购买额度、访问私有网关、启动本地服务或公开安全问题时，自动流程只生成测试卡和待办，不自行执行。测试完成后，回写脱敏结果；不要回写 Key、完整请求头、Cookie 或私人网络信息。

## 参考

- [官方 provider 指南（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/providers.zh.md)
- [官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- [无 Key CLI 冒烟实验](../rc6-cli-smoke/README.md)

当官方 HEAD、npm latest、provider 指南或任一端点发生变化时，本矩阵必须重新复测；旧结果进入 `STALE`，不能继续当作当前兼容性结论。

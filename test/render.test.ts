import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { renderLongform } from "../src/render.ts";

const canonical = `# 标题候选

| 标题 | 分数 |
| --- | ---: |
| 推荐标题：可发布标题 | 10 |

# 正文

正文开头。

【可选口述区 01 开始｜发布前删除本行】
这一段可以直接发布。
【可选口述区 01 结束｜发布前删除本行】

# 备用标题

1. 备用

# 编辑附录（不随正文发布）

- 验证边界：只覆盖 CLI。
- 官方来源：<https://example.com>
- 维护规则：变化后复测。
`;

test("longform renderer removes editorial scaffolding but keeps publishable optional prose", () => {
  const rendered = renderLongform(canonical, "zhihu");
  assert.match(rendered, /^# 可发布标题/m);
  assert.match(rendered, /这一段可以直接发布/);
  assert.match(rendered, /验证范围与来源/);
  assert.doesNotMatch(rendered, /标题候选|备用标题|发布前删除本行|维护规则/);
});

test("longform renderer accepts a clean canonical article for GitHub", () => {
  const clean = `# 可发布标题

正文第一段。

## 验证范围与来源

- 官方来源：<https://example.com>
- 维护规则：变化后复测。
`;
  const rendered = renderLongform(clean, "github");
  assert.match(rendered, /^# 可发布标题/m);
  assert.match(rendered, /正文第一段/);
  assert.match(rendered, /验证范围与来源/);
  assert.doesNotMatch(rendered, /维护规则/);
});

test("checked-in Zhihu and WeChat variants match the canonical renderer", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const canonicalArticle = await readFile(`${root}content/canonical/dsh-change-card-47f9438.md`, "utf8");
  const zhihu = await readFile(`${root}content/channels/zhihu/dsh-change-card-47f9438.md`, "utf8");
  const wechat = await readFile(`${root}content/channels/wechat/dsh-change-card-47f9438.md`, "utf8");
  assert.equal(zhihu, renderLongform(canonicalArticle, "zhihu"));
  assert.equal(wechat, renderLongform(canonicalArticle, "wechat"));
});

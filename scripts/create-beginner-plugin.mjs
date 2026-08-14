#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const slug = process.argv[2] ?? "my-first-plugin";
const usage = "用法：node scripts/create-beginner-plugin.mjs <英文小写插件名>";

if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error(`FAIL 插件名只能使用小写字母、数字和连字符，并且以字母开头。\n${usage}`);
  process.exit(2);
}

const target = resolve(process.cwd(), slug);
try {
  await access(target);
  console.error(`FAIL 目标目录已存在：${slug}。为避免覆盖文件，请换一个名称。`);
  process.exit(1);
} catch {
  // The target is expected not to exist.
}

const packageName = `dsh-${slug}`;
const files = new Map([
  ["package.json", `${JSON.stringify({
    name: packageName,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "index.js",
    files: ["index.js", "cordis.patch.yml"],
    dsh: { bundle: { patch: "./cordis.patch.yml" } },
  }, null, 2)}\n`],
  ["index.js", `export const name = "${slug}";\n\nexport function apply(ctx) {\n  ctx.effect(() => {\n    console.log("[${slug}] loaded");\n    return () => console.log("[${slug}] unloaded");\n  });\n}\n`],
  ["cordis.patch.yml", `- insert:\n    - id: ${slug}\n      name: ${packageName}\n`],
  ["README.md", `# ${slug}\n\n这是由 dsh-learn 新手脚手架生成的最小 DSH 插件。\n\n## 先验证，不接模型\n\n回到 dsh-learn 根目录运行：\n\n~~~bash\nnode labs/hello-plugin/verify.mjs ./${slug}\n~~~\n\n这个验证会使用临时 DSH_HOME，检查安装、profile 配置、插件加载和移除；它不读取现有凭据，也不发起模型请求。\n\n## 可以先改哪里\n\n只修改 index.js 中的加载日志，先不要改 package.json 和 cordis.patch.yml。确认最小闭环通过以后，再逐步学习 Cordis 生命周期和 profile bundle。\n`],
]);

await mkdir(target);
for (const [name, content] of files) await writeFile(resolve(target, name), content, "utf8");

console.log(`PASS 已创建 ./${slug}`);
console.log(`下一步：node labs/hello-plugin/verify.mjs ./${slug}`);
console.log("这个脚手架只生成本地文件，不联网、不读取或发送任何 API Key。");

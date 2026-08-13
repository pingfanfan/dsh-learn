import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const [canonicalPath, channelPath] = process.argv.slice(2);
if (!canonicalPath || !channelPath) {
  throw new Error("usage: node scripts/validate-beginner-entry.mjs <canonical> <channel>");
}

const canonical = await readFile(canonicalPath, "utf8");
const channel = await readFile(channelPath, "utf8");
const root = resolve(dirname(canonicalPath), "..");
const requiredCanonical = [
  "# 标题候选",
  "# 正文",
  "# 备用标题",
  "node --version",
  "npm --version",
  "node scripts/beginner-doctor.mjs",
  "node scripts/plugin-doctor.mjs",
  "npm install --global pnpm",
  "npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web",
  "node labs/hello-plugin/verify.mjs",
  "dsh plugin --profile demo add ./my-first-plugin",
  "DEEPSEEK_API_KEY",
  "不使用、不保存、不展示任何 API Key",
];
const requiredImages = [
  "01-official-run-readme.jpg",
  "02-official-plugin-publish.jpg",
  "03-terminal-node-version.svg",
  "04-terminal-dsh-web.svg",
  "05-terminal-plugin.svg",
  "06-terminal-beginner-doctor.svg",
  "07-dsh-first-run-api-key-prompt.jpg",
  "08-dsh-web-ui-no-key.jpg",
];
const failures = [];

for (const item of requiredCanonical) {
  if (!canonical.includes(item)) failures.push("canonical missing " + item);
}
for (const filename of requiredImages) {
  await access(resolve(root, "assets", "dsh-beginner", filename)).catch(() => {
    failures.push("missing screenshot asset " + filename);
  });
  if (!canonical.includes("../assets/dsh-beginner/" + filename)) {
    failures.push("canonical missing image link " + filename);
  }
  if (!channel.includes("../../assets/dsh-beginner/" + filename)) {
    failures.push("channel missing image link " + filename);
  }
}
if (channel.includes("# 标题候选") || channel.includes("# 编辑附录") || channel.includes("# 备用标题")) {
  failures.push("channel contains editor-only sections");
}
if (channel.includes("](../assets/dsh-beginner/")) failures.push("channel has unresolved canonical image path");
if (/sk-[A-Za-z0-9]{20,}/.test(canonical + channel)) failures.push("possible API key pattern");

if (failures.length > 0) {
  console.error("FAIL " + canonicalPath);
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("PASS " + canonicalPath + " and " + channelPath + " checks=" + (requiredCanonical.length + requiredImages.length * 3 + 3));

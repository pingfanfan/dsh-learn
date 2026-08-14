import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const [canonicalPath, channelPath] = process.argv.slice(2);
if (!canonicalPath || !channelPath) {
  throw new Error("usage: node scripts/validate-beginner-quickstart.mjs <canonical> <channel>");
}

const canonical = await readFile(canonicalPath, "utf8");
const channel = await readFile(channelPath, "utf8");
const root = resolve(dirname(canonicalPath), "..");
const required = [
  "# DSH 完全新手快速上手",
  "node --version",
  "node scripts/beginner-doctor.mjs",
  "npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web",
  "http://127.0.0.1:3080",
  "Configure later",
  "node scripts/plugin-doctor.mjs",
  "node scripts/plugin-doctor.mjs --network",
  "node labs/hello-plugin/verify.mjs",
  "临时 `DSH_HOME`",
  "DEEPSEEK_API_KEY",
  "BLOCKED_NETWORK",
  "发布必须经过主理人明确同意",
];
const images = [
  "10-github-download-zip.jpg",
  "09-nodejs-download-page.jpg",
  "06-terminal-beginner-doctor.svg",
  "01-official-run-readme.jpg",
  "04-terminal-dsh-web.svg",
  "07-dsh-first-run-api-key-prompt.jpg",
  "08-dsh-web-ui-no-key.jpg",
  "05-terminal-plugin.svg",
  "11-plugin-edit-indexjs.jpg",
];
const failures = [];
for (const item of required) {
  if (!canonical.includes(item)) failures.push(`canonical missing ${item}`);
}
for (const image of images) {
  await access(resolve(root, "assets", "dsh-beginner", image)).catch(() => failures.push(`missing image ${image}`));
  if (!canonical.includes(`../assets/dsh-beginner/${image}`)) failures.push(`canonical missing image link ${image}`);
  if (!channel.includes(`../../assets/dsh-beginner/${image}`)) failures.push(`channel missing image link ${image}`);
}
if (channel.includes("](../assets/dsh-beginner/")) failures.push("channel has unresolved canonical image path");
if (/sk-[A-Za-z0-9]{20,}/.test(canonical + channel)) failures.push("possible API key pattern");
if (channel.includes("知乎发布必须经过主理人明确同意")) failures.push("channel contains editor policy note");

if (failures.length > 0) {
  console.error(`FAIL ${canonicalPath}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS ${canonicalPath} and ${channelPath} checks=${required.length + images.length * 3 + 3}`);

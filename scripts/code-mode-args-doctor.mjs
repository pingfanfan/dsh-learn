#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";

const requestedPath = process.argv.slice(2).find((argument) => !argument.startsWith("--"))
  ?? "labs/code-mode-args-doctor/fixtures/valid.json";

if (process.argv.includes("--help")) {
  console.log("用法：node scripts/code-mode-args-doctor.mjs [本地 JSON 夹具]");
  console.log("默认检查 labs/code-mode-args-doctor/fixtures/valid.json");
  console.log("LOCAL_ONLY 不联网、不启动 DSH、不调用模型，也不读取 API Key");
  process.exit(0);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toolArguments(call) {
  if (!isObject(call)) return undefined;
  return isObject(call.arguments) ? call.arguments : undefined;
}

const absolutePath = resolve(process.cwd(), requestedPath);
let input;
let raw;
const failures = [];
try {
  raw = await readFile(absolutePath, "utf8");
  input = JSON.parse(raw);
} catch (error) {
  const label = error instanceof Error ? error.message : String(error);
  console.error("FAIL Code Mode 参数分层体检未通过");
  console.error(`- 无法读取或解析本地 JSON 夹具：${label}`);
  console.error("请确认路径存在，并且文件内容是 JSON；这一步不需要网络或 API Key。");
  process.exit(1);
}

if (/sk-[A-Za-z0-9]{20,}/.test(raw) || /DEEPSEEK_API_KEY\s*=/.test(raw)) {
  failures.push("输入夹具疑似包含凭据，请删除凭据后再运行，不要把 Key 放进诊断文件");
}

const outer = isObject(input?.outer) ? input.outer : input;
const outerTool = isObject(outer) ? outer.tool ?? outer.name : undefined;
const outerArgs = toolArguments(outer);

if (outerTool !== "run_code") {
  failures.push(`外层工具应为 run_code，当前是 ${typeof outerTool === "string" ? outerTool : "缺失"}`);
}
if (!outerArgs) {
  failures.push("外层 run_code 缺少 arguments 对象");
} else {
  if (!nonEmptyString(outerArgs.code)) {
    failures.push("外层 run_code.arguments.code 缺失或为空");
  }
  if (!nonEmptyString(outerArgs.description)) {
    failures.push("外层 run_code.arguments.description 缺失；这是 UI 用的程序摘要，不是写在 code 字符串里的字段");
  }
}

const nested = Array.isArray(input?.nested)
  ? input.nested
  : Array.isArray(input?.nestedCalls) ? input.nestedCalls : [];
const bashCalls = nested.filter((call) => isObject(call) && (call.tool ?? call.name) === "bash");
for (const [index, call] of nested.entries()) {
  if (!isObject(call) || (call.tool ?? call.name) !== "bash") continue;
  const args = toolArguments(call);
  if (!args) {
    failures.push(`内层 tools.bash[${index}] 缺少 arguments 对象`);
    continue;
  }
  if (!nonEmptyString(args.command)) {
    failures.push(`内层 tools.bash[${index}].arguments.command 缺失或为空`);
  }
  if (!nonEmptyString(args.description)) {
    failures.push(`内层 tools.bash[${index}].arguments.description 缺失；这是 bash 调用的 UI 摘要，和外层字段属于不同层`);
  }
}

if (failures.length > 0) {
  console.error("FAIL Code Mode 参数分层体检未通过");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`检查文件：${basename(absolutePath)}`);
  console.error("层级提示：外层检查 run_code，内层只对已列出的 bash 调用检查 description。");
  console.error("LOCAL_ONLY 不联网、不启动 DSH、不调用模型；它不能替代真实模型调用复现。");
  process.exit(1);
}

console.log("PASS 外层 run_code 参数：code 和 description 都存在");
if (bashCalls.length > 0) {
  console.log(`PASS 内层 bash 参数：${bashCalls.length} 个调用的 command 和 description 都存在`);
} else {
  console.log("INFO 没有列出内层 bash 调用，本次只完成外层检查");
}
console.log("PASS Code Mode 参数分层体检完成");
console.log("LOCAL_ONLY 不联网、不启动 DSH、不调用模型；通过只代表本地夹具的字段层级完整");

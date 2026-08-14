#!/usr/bin/env node

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    path: { type: "string" },
  },
  strict: true,
});

const input = values.path ?? "C:\\Users\\XIAOPAN\\Desktop\\安卓开发";
if (!input || input.includes("\u0000")) {
  console.error("FAIL 路径不能为空，也不能包含 NUL 字符");
  process.exitCode = 1;
}

function flawedUtf16Read(bytes) {
  let end = 0;
  while (end + 1 < bytes.length && bytes[end] !== 0) end += 2;
  return bytes.toString("utf16le", 0, end);
}

function correctUtf16Read(bytes) {
  let end = 0;
  while (end + 1 < bytes.length && !(bytes[end] === 0 && bytes[end + 1] === 0)) end += 2;
  return bytes.toString("utf16le", 0, end);
}

const bytes = Buffer.from(`${input}\u0000`, "utf16le");
const flawed = flawedUtf16Read(bytes);
const corrected = correctUtf16Read(bytes);
const truncated = flawed !== input;

console.log("WIN32_PATH_DOCTOR");
console.log(`INPUT_PATH=${input}`);
console.log(`BUGGY_UTF16_RESULT=${flawed}`);
console.log(`CORRECT_UTF16_RESULT=${corrected}`);

if (corrected !== input) {
  console.error("FAIL 正确的 UTF-16 NUL 判定仍未保留完整路径");
  process.exitCode = 1;
} else {
  console.log("PASS 正确的 UTF-16 NUL 判定保留完整路径");
}

if (truncated) {
  console.log("PASS 检出低字节为 0 时的提前截断风险");
} else {
  console.log("PASS 当前样例没有触发低字节截断；可换一个包含中文路径的样例复测");
}

console.log("LOCAL_ONLY 不访问 Windows、网络、模型或 API Key；这是对官方 readUtf16 逻辑的离线回归");

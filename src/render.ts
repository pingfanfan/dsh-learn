import { writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { readPublicContent, resolvePublicWriteFile } from "./content.ts";

export function renderLongform(canonical: string, channel: "github" | "zhihu" | "wechat"): string {
  const titleBlock = canonical.includes("# 标题候选") && canonical.includes("# 正文")
    ? between(canonical, "# 标题候选", "# 正文")
    : "";
  const recommended = titleBlock.match(/^\|\s*推荐标题[：:]\s*([^|]+?)\s*\|/m)?.[1]?.trim()
    ?? canonical.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!recommended) throw new Error("Canonical article is missing a recommended title");
  const body = canonical.includes("# 正文") && canonical.includes("# 备用标题")
    ? between(canonical, "# 正文", "# 备用标题")
    : canonical
      .replace(/^#\s+.+\n?/, "")
      .split("\n## 验证范围与来源", 2)[0];
  const cleanBody = body
    .split("\n")
    .filter((line) => !(line.trim().startsWith("【") && line.includes("发布前删除本行")))
    .join("\n")
    .trim();
  if (!cleanBody) throw new Error("Canonical article body is empty");
  const appendix = canonical.includes("# 编辑附录")
    ? canonical.split("# 编辑附录", 2)[1]
      .split("\n")
      .filter((line) => line.trim().startsWith("-") && !line.includes("维护规则"))
      .join("\n")
      .trim()
    : canonical.includes("## 验证范围与来源")
      ? canonical.split("## 验证范围与来源", 2)[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-") && !line.includes("维护规则"))
        .join("\n")
        .trim()
    : "";
  const brand = channel === "wechat"
    ? "> 平凡心智主理，dsh-learn Agent 持续维护。"
    : "> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。";
  return [
    `# ${recommended}`,
    "",
    cleanBody,
    appendix ? "\n## 验证范围与来源\n\n" + appendix : "",
    "",
    brand,
    "",
  ].join("\n").replace(/\n{4,}/g, "\n\n\n");
}

export async function renderLongformFile(
  root: string,
  inputPath: string,
  outputPath: string,
  channel: "github" | "zhihu" | "wechat",
): Promise<{ path: string; bytes: number }> {
  const input = await readPublicContent(root, inputPath);
  const content = renderLongform(input.content, channel);
  const absolute = await resolvePublicWriteFile(root, outputPath);
  await writeFile(absolute, content, { encoding: "utf8", mode: 0o600 });
  return { path: relative(root, absolute), bytes: Buffer.byteLength(content) };
}

function between(text: string, start: string, end: string): string {
  if (!text.includes(start) || !text.includes(end)) throw new Error(`Missing article section: ${start} / ${end}`);
  return text.split(start, 2)[1].split(end, 2)[0];
}

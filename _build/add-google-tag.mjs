// Runs on every Vercel deploy (see vercel.json).
// Copies the site into dist/ and adds the Google tag right after <head> on EVERY .html page,
// so new pages get the tag automatically. To change the tag, edit _build/google-tag.html only.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist");
const TAG = fs.readFileSync(path.join(ROOT, "_build", "google-tag.html"), "utf8").trim();
const SKIP = new Set([".git", "dist", "_build", "node_modules", ".vercel", "vercel.json", ".gitignore", ".DS_Store"]);
const TAG_MARKER = "googletagmanager.com/gtag/js";

fs.rmSync(OUT, { recursive: true, force: true });
const problems = [];
let pages = 0;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) { copyDir(from, to); continue; }
    if (!entry.name.toLowerCase().endsWith(".html")) { fs.copyFileSync(from, to); continue; }

    const rel = path.relative(ROOT, from);
    let html = fs.readFileSync(from, "utf8");
    if (html.includes(TAG_MARKER)) {
      problems.push(`${rel}: already has a Google tag in the file. Remove it so the page doesn't get two.`);
    } else if (!/<head[^>]*>/i.test(html)) {
      problems.push(`${rel}: no <head> element found, so the Google tag could not be added.`);
    } else {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${TAG}`);
    }
    fs.writeFileSync(to, html);
    pages++;
  }
}

copyDir(ROOT, OUT);

if (problems.length) {
  console.error("Google tag check FAILED. Deploy stopped:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Google tag added to ${pages} page(s).`);

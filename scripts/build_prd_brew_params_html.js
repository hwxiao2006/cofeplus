#!/usr/bin/env node
/**
 * 从 tasks/prd-recipe-brew-params.md 生成自包含 HTML 版本。
 *
 * - 截图内联为 base64 data URI，产物不依赖外部文件
 * - 目录只列顶级章节（## 级）
 * - 用法：node scripts/build_prd_option_status_html.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MD_PATH = path.join(ROOT, 'tasks', 'prd-recipe-brew-params.md');
const OUT_PATH = path.join(ROOT, 'tasks', 'prd-recipe-brew-params.html');
const TITLE = '产品需求文档：咖啡萃取参数配置';

const markdown = fs.readFileSync(MD_PATH, 'utf8');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 行内格式：先转义，再恢复受支持的标记（code、bold、链接）
function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function inlineImage(src) {
  const resolved = path.normalize(path.join(ROOT, 'tasks', src));
  if (!fs.existsSync(resolved)) {
    throw new Error(`screenshot missing: ${src}`);
  }
  const ext = path.extname(resolved).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const data = fs.readFileSync(resolved).toString('base64');
  return `data:${mime};base64,${data}`;
}

function slugify(text) {
  return text.replace(/[`*[\]（）()：:／/·、\s]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

const lines = markdown.split('\n');
const body = [];
const toc = [];
let i = 0;
let listOpen = null; // 'ul' | 'ol' | 'checks'

function closeList() {
  if (listOpen) {
    body.push(listOpen === 'ol' ? '</ol>' : '</ul>');
    listOpen = null;
  }
}

while (i < lines.length) {
  const line = lines[i];

  // 表格
  if (/^\|/.test(line) && /^\|[\s:-]+\|/.test(lines[i + 1] || '')) {
    closeList();
    const headers = line.split('|').slice(1, -1).map((cell) => cell.trim());
    body.push('<table><thead><tr>' + headers.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>');
    i += 2;
    while (i < lines.length && /^\|/.test(lines[i])) {
      const cells = lines[i].split('|').slice(1, -1).map((cell) => cell.trim());
      body.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
      i += 1;
    }
    body.push('</tbody></table>');
    continue;
  }

  // 标题
  const heading = line.match(/^(#{1,3}) (.*)$/);
  if (heading) {
    closeList();
    const level = heading[1].length;
    const text = heading[2];
    const id = slugify(text);
    if (level === 1) {
      body.push(`<h1>${inline(text)}</h1>`);
    } else if (level === 2) {
      toc.push({ id, text });
      body.push(`<h2 id="${id}">${inline(text)}</h2>`);
    } else {
      body.push(`<h3 id="${id}">${inline(text)}</h3>`);
    }
    i += 1;
    continue;
  }

  // 引用块
  if (/^> /.test(line)) {
    closeList();
    const quote = [];
    while (i < lines.length && /^> /.test(lines[i])) {
      quote.push(inline(lines[i].slice(2)));
      i += 1;
    }
    body.push(`<blockquote><p>${quote.join('<br>')}</p></blockquote>`);
    continue;
  }

  // 图片
  const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (img) {
    closeList();
    body.push(`<figure class="doc-image"><img src="${inlineImage(img[2])}" alt="${escapeHtml(img[1])}" loading="lazy"><figcaption>${inline(img[1])}</figcaption></figure>`);
    i += 1;
    continue;
  }

  // 复选清单
  const check = line.match(/^- \[ \] (.*)$/);
  if (check) {
    if (listOpen !== 'checks') { closeList(); body.push('<ul class="checklist">'); listOpen = 'checks'; }
    body.push(`<li>${inline(check[1])}</li>`);
    i += 1;
    continue;
  }

  // 无序列表
  const ul = line.match(/^- (.*)$/);
  if (ul) {
    if (listOpen !== 'ul') { closeList(); body.push('<ul>'); listOpen = 'ul'; }
    body.push(`<li>${inline(ul[1])}</li>`);
    i += 1;
    continue;
  }

  // 有序列表
  const ol = line.match(/^\d+\. (.*)$/);
  if (ol) {
    if (listOpen !== 'ol') { closeList(); body.push('<ol>'); listOpen = 'ol'; }
    body.push(`<li>${inline(ol[1])}</li>`);
    i += 1;
    continue;
  }

  // 空行
  if (!line.trim()) {
    closeList();
    i += 1;
    continue;
  }

  // 普通段落
  closeList();
  body.push(`<p>${inline(line)}</p>`);
  i += 1;
}
closeList();

const tocHtml = toc.map((item) => `<a href="#${item.id}">${inline(item.text)}</a>`).join('');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<style>
  :root { color-scheme: light; --ink: #17202a; --muted: #5b6670; --line: #d9dee5; --accent: #0b6bcb; --bg: #f7f8fa; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; color: var(--ink); background: var(--bg); line-height: 1.75; }
  main { max-width: 960px; margin: 0 auto; padding: 40px 28px 96px; background: #fff; min-height: 100vh; box-shadow: 0 0 24px rgba(15, 23, 42, .05); }
  h1 { font-size: 26px; line-height: 1.35; margin: 0 0 16px; }
  h2 { font-size: 20px; margin: 44px 0 14px; padding-top: 18px; border-top: 1px solid var(--line); }
  h3 { font-size: 16px; margin: 30px 0 10px; }
  p { margin: 10px 0; }
  blockquote { margin: 14px 0; padding: 10px 16px; border-left: 3px solid var(--accent); background: #f0f6fd; color: var(--muted); border-radius: 0 8px 8px 0; }
  blockquote p { margin: 0; }
  code { background: #eef1f5; border-radius: 4px; padding: 1px 6px; font-size: .92em; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }
  th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f1f4f8; }
  ul, ol { margin: 10px 0; padding-left: 24px; }
  li { margin: 4px 0; }
  ul.checklist { list-style: none; padding-left: 4px; }
  ul.checklist li { padding-left: 26px; position: relative; }
  ul.checklist li::before { content: ""; position: absolute; left: 0; top: 7px; width: 14px; height: 14px; border: 1.5px solid #9aa4b2; border-radius: 4px; }
  figure.doc-image { margin: 18px 0; }
  figure.doc-image img { max-width: 100%; border: 1px solid var(--line); border-radius: 10px; display: block; }
  figure.doc-image figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; }
  nav.toc { margin: 20px 0 8px; padding: 14px 16px; background: #f7f9fc; border: 1px solid var(--line); border-radius: 10px; display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 14px; }
  nav.toc a { color: var(--accent); text-decoration: none; }
  nav.toc a:hover { text-decoration: underline; }
  @media (max-width: 640px) { main { padding: 24px 16px 72px; } h1 { font-size: 22px; } }
</style>
</head>
<body>
<main>
${body[0]}
<nav class="toc">${tocHtml}</nav>
${body.slice(1).join('\n')}
</main>
</body>
</html>
`;

fs.writeFileSync(OUT_PATH, html);
const stats = fs.statSync(OUT_PATH);
console.log(`written ${OUT_PATH} (${(stats.size / 1024).toFixed(0)} KB)`);

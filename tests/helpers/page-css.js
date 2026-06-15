const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..'); // tests/helpers -> repo root

// Returns a page's effective CSS: inline <style> blocks + all local <link rel=stylesheet> files, concatenated.
// External (http/protocol-relative) stylesheets are skipped.
function getPageCss(file) {
  const htmlPath = path.join(ROOT, file);
  const html = fs.readFileSync(htmlPath, 'utf8');
  let css = '';
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html)) !== null) css += '\n' + m[1];
  const linkRe = /<link[^>]+rel="stylesheet"[^>]*>/gi;
  let lm;
  while ((lm = linkRe.exec(html)) !== null) {
    const hm = lm[0].match(/href="([^"]+)"/i);
    if (!hm) continue;
    const href = hm[1];
    if (/^(https?:)?\/\//i.test(href)) continue; // skip external
    const cssPath = path.join(path.dirname(htmlPath), href);
    if (fs.existsSync(cssPath)) css += '\n' + fs.readFileSync(cssPath, 'utf8');
  }
  return css;
}

module.exports = { getPageCss };

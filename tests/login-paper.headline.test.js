const assert = require('assert');
const fs = require('fs');
const path = require('path');

const paperHtml = fs.readFileSync(path.join(__dirname, '..', 'login-paper.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('paper 登录页标题应使用人工断句的三行结构', () => {
  const lineMatches = paperHtml.match(/class="stage-title-line"/g) || [];

  assert.strictEqual(lineMatches.length, 3, '标题应包含 3 个 stage-title-line');
  assert.ok(/<span class="stage-title-line">把门店现场，<\/span>/.test(paperHtml), '缺少第一行标题');
  assert.ok(/<span class="stage-title-line">印进更有记忆点的<\/span>/.test(paperHtml), '缺少第二行标题');
  assert.ok(/<span class="stage-title-line">登录纸卡。<\/span>/.test(paperHtml), '缺少第三行标题');
});

test('paper 登录页标题应使用更适合中文的宽度和字距', () => {
  assert.ok(/\.stage-body\s*\{[\s\S]*max-width:\s*460px;/.test(paperHtml), '标题容器宽度应放宽到 460px');
  assert.ok(/\.stage-body h2\s*\{[\s\S]*font-size:\s*50px;/.test(paperHtml), '标题字号应调整到 50px');
  assert.ok(/\.stage-body h2\s*\{[\s\S]*line-height:\s*1\.06;/.test(paperHtml), '标题行高应调整到 1.06');
  assert.ok(/\.stage-body h2\s*\{[\s\S]*letter-spacing:\s*-0\.03em;/.test(paperHtml), '标题字距应调整到 -0.03em');
  assert.ok(/\.stage-title-line\s*\{[\s\S]*display:\s*block;/.test(paperHtml), '标题分行钩子应显式设为 block');
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const morningHtml = fs.readFileSync(path.join(__dirname, '..', 'login-morning.html'), 'utf8');
const counterHtml = fs.readFileSync(path.join(__dirname, '..', 'login-counter.html'), 'utf8');
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

test('morning 登录页应包含统一品牌和表单骨架', () => {
  assert.ok(/COFE\+/.test(morningHtml));
  assert.ok(/欢迎登录/.test(morningHtml));
  assert.ok(/开始今天的门店运营与设备巡检/.test(morningHtml));
  assert.ok(/id="loginAccount"/.test(morningHtml));
  assert.ok(/id="loginPassword"/.test(morningHtml));
  assert.ok(/进入控制台/.test(morningHtml));
});

test('morning 登录页应暴露主题钩子和移动端断点', () => {
  assert.ok(/login-page-morning/.test(morningHtml));
  assert.ok(/@media\s*\(max-width:\s*768px\)/.test(morningHtml));
  assert.ok(/class="login-stage"/.test(morningHtml));
  assert.ok(/class="login-card"/.test(morningHtml));
});

test('counter 登录页应包含统一表单骨架和专属文案', () => {
  assert.ok(/欢迎登录/.test(counterHtml));
  assert.ok(/进入运营后台，查看设备、订单与门店状态/.test(counterHtml));
  assert.ok(/id="loginAccount"/.test(counterHtml));
  assert.ok(/id="loginPassword"/.test(counterHtml));
  assert.ok(/login-page-counter/.test(counterHtml));
});

test('paper 登录页应包含统一表单骨架和专属文案', () => {
  assert.ok(/欢迎登录/.test(paperHtml));
  assert.ok(/连接每日出杯现场，进入运营工作台/.test(paperHtml));
  assert.ok(/id="loginAccount"/.test(paperHtml));
  assert.ok(/id="loginPassword"/.test(paperHtml));
  assert.ok(/login-page-paper/.test(paperHtml));
});

test('paper 登录页移动端应压缩头图区并把登录卡片提到首屏中段', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.login-stage\s*\{[\s\S]*min-height:\s*220px;/.test(paperHtml));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.stage-footer\s*\{[\s\S]*display:\s*none;/.test(paperHtml));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.stage-header\s*\{[\s\S]*margin-bottom:\s*14px;/.test(paperHtml));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.login-card\s*\{[\s\S]*align-items:\s*flex-start;[\s\S]*margin-top:\s*-68px;/.test(paperHtml));
});

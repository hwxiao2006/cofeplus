const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error('inline script not found');
  }
  return match[1];
}

function createRuntime(file) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const accountInput = { value: '', focus() {} };
  const passwordInput = { value: '', focus() {} };
  const errorNode = { textContent: '' };
  const submitButton = { disabled: false, textContent: '进入控制台' };
  const form = {
    handler: null,
    addEventListener(type, handler) {
      if (type === 'submit') {
        this.handler = handler;
      }
    }
  };
  const store = {};
  const locationState = { href: file, replacedWith: null };
  const script = `${extractInlineScript(html)}
this.__test = { handleLoginSubmit, validateLoginForm, LOGIN_SESSION_KEY, SIDEBAR_LOGIN_PROFILE_KEY };`;

  vm.runInNewContext(script, {
    console,
    document: {
      getElementById(id) {
        if (id === 'loginForm') return form;
        if (id === 'loginAccount') return accountInput;
        if (id === 'loginPassword') return passwordInput;
        if (id === 'loginError') return errorNode;
        if (id === 'loginSubmit') return submitButton;
        return null;
      },
      addEventListener() {}
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      }
    },
    setTimeout(fn) {
      fn();
      return 1;
    },
    clearTimeout() {},
    window: {
      location: {
        href: file,
        replace(target) {
          locationState.replacedWith = target;
        }
      },
      addEventListener() {}
    }
  });

  return {
    accountInput,
    passwordInput,
    errorNode,
    submitButton,
    form,
    store,
    locationState
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

test('morning 登录页缺少账号时应提示并阻止提交', () => {
  const runtime = createRuntime('login-morning.html');
  runtime.passwordInput.value = 'secret';
  runtime.form.handler({ preventDefault() {} });
  assert.strictEqual(runtime.errorNode.textContent, '请输入账号');
});

test('morning 登录页提交成功后应写入 session、侧栏资料并跳转', () => {
  const runtime = createRuntime('login-morning.html');
  runtime.accountInput.value = 'ops-admin';
  runtime.passwordInput.value = 'secret';
  runtime.form.handler({ preventDefault() {} });
  assert.ok(runtime.store.cofeLoginSession);
  assert.ok(runtime.store.sidebarLoginProfile);
  assert.strictEqual(runtime.locationState.replacedWith, 'overview.html');
});

const { test, expect } = require('@playwright/test');

const seededStaffManagers = [
  {
    id: 'S001',
    merchantId: 'C001',
    merchantName: '星巴克咖啡',
    username: '王运维',
    phone: '13800138021',
    accountEnabled: true,
    opsOpenid: 'ops_wang_001',
    wechatOpenid: 'wx_wang_001',
    permissions: ['ops.overview', 'ops.devices', 'ops.products', 'ops.products.edit', 'ops.products.recipe', 'ops.orders', 'ops.orders.refund', 'ops.staff', 'ops.staff.manage'],
    pushChannels: ['ops', 'admin'],
    devices: ['RCK386', 'RCK385', 'RCK384', 'RCK409', 'RCK410', 'RCK406'],
    createdAt: '2026-02-15'
  },
  {
    id: 'S002',
    merchantId: 'C001',
    merchantName: '星巴克咖啡',
    username: '李财务',
    phone: '13800138022',
    accountEnabled: false,
    opsOpenid: '',
    wechatOpenid: 'wx_li_001',
    permissions: ['ops.orders'],
    pushChannels: ['none'],
    devices: ['RCK384'],
    createdAt: '2026-02-17'
  }
];

test('staff management desktop default and expanded states', async ({ page }) => {
  await page.addInitScript((staffManagers) => {
    localStorage.clear();
    localStorage.setItem('staffManagersData', JSON.stringify(staffManagers));
    localStorage.setItem('currentMerchantId', 'C001');
  }, seededStaffManagers);

  await page.goto('http://127.0.0.1:8080/staff-management.html', { waitUntil: 'networkidle' });

  await expect(page.locator('.staff-toolbar')).toBeVisible();
  await expect(page.locator('.manager-row').first()).toBeVisible();
  await expect(page.locator('.manager-device-toggle').first()).toHaveText('查看全部');

  await page.screenshot({ path: '/tmp/staff-desktop-default.png', fullPage: true });

  await page.locator('.manager-device-toggle').first().click();
  await expect(page.locator('.manager-device-toggle').first()).toHaveText('收起');
  await expect(page.locator('.manager-device-expanded').first()).toBeVisible();
  await expect(page.locator('.manager-device-chip')).toHaveCount(6);

  await page.screenshot({ path: '/tmp/staff-desktop-expanded.png', fullPage: true });
});

#!/usr/bin/env node
/*
 * Capture real-browser screenshots of locations.html for the location PRD.
 * Output: screenshots/location-prd/*.png
 * Usage: node scripts/generate_location_prd_screenshots.js [baseUrl]
 */
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://127.0.0.1:8090';
const OUT_DIR = path.join(__dirname, '..', 'screenshots', 'location-prd');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  // Deterministic state: default mock data only, no leftover local edits.
  await page.goto(`${BASE_URL}/locations.html`);
  await page.evaluate(() => localStorage.clear());
  // Seed devices bound to two locations so the list shows the device-count
  // badge and the disabled delete affordance (delete-protection feature).
  await page.evaluate(() => {
    localStorage.setItem('devicesData', JSON.stringify([
      { id: 'RCK386', location: 'k8298' },
      { id: 'RCK385', location: 'k8298' },
      { id: 'RCK384', location: 'k8298' },
      { id: 'RCK410', location: 'k8667' }
    ]));
  });
  await page.reload();
  await page.waitForSelector('.location-item');

  // UF-001: overview stats + full list (desktop)
  await page.screenshot({ path: path.join(OUT_DIR, 'uf001-overview.png'), fullPage: true });

  // UF-002: category filter narrowed to exhibition + keyword search
  await page.selectOption('#pointCategoryFilter', 'exhibition');
  await page.fill('#searchInput', '上海');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'uf002-filter.png'), fullPage: true });
  await page.fill('#searchInput', '');
  await page.selectOption('#pointCategoryFilter', 'all');

  // UF-003: create modal with auto-generated code prefilled
  await page.click('.header-right .btn-primary');
  await page.waitForSelector('#locationModal.active');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'uf003-create-modal.png') });

  // UF-005: edit modal with fields backfilled
  await page.click('#locationModal .btn-default');
  await page.evaluate(() => editLocation('L001'));
  await page.waitForSelector('#locationModal.active');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'uf005-edit-modal.png') });
  await page.click('#locationModal .btn-default');

  // Mobile layout: drawer sidebar hidden, two-column stat cards
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, 'uf001-mobile.png'), fullPage: true });

  await browser.close();
  console.log('done');
}

main().catch(err => { console.error(err); process.exit(1); });

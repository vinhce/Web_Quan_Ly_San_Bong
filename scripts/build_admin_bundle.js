#!/usr/bin/env node
/**
 * Build script for Admin Portal JS bundles (zero external dependencies).
 * Concatenates core and admin JS files in exact load order from portal-admin/index.php
 * and runs `node --check` on both generated bundles.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT_DIR, 'js');

const BUNDLES = [
  {
    name: 'core.bundle.js',
    output: path.join(JS_DIR, 'core.bundle.js'),
    files: [
      'data.js',
      'helpers.js',
      'db_core.js',
      'db_pricing.js',
      'db_bookings.js',
      'db_operations.js',
      'db.js',
      'ui.js',
      'vn_datepicker.js',
      'app.js',
      'api.js'
    ]
  },
  {
    name: 'admin.bundle.js',
    output: path.join(JS_DIR, 'admin.bundle.js'),
    files: [
      'admin_dialogs.js',
      'admin.js',
      'admin_overview.js',
      'admin_pitches.js',
      'admin_payments.js',
      'admin_ops.js',
      'admin_crm.js',
      'admin_customers.js',
      'admin_reports.js',
      'admin_expenses.js',
      'admin_pricing.js',
      'admin_security.js',
      'admin_settings.js',
      'admin_finance.js',
      'admin_inplay.js',
      'admin_vouchers.js',
      'admin_staff.js',
      'admin_catalog.js',
      'admin_shifts.js',
      'admin_invoices.js',
      'admin_qr.js',
      'admin_recurring.js',
      'admin_waitlist_match.js',
      'admin_logs.js'
    ]
  }
];

function buildBundle(bundle) {
  const chunks = [];
  for (const relFile of bundle.files) {
    const absPath = path.join(JS_DIR, relFile);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Missing source file for ${bundle.name}: ${absPath}`);
    }
    const content = fs.readFileSync(absPath, 'utf8');
    chunks.push(`/* === ${relFile} === */\n${content}`);
  }

  const combined = chunks.join('\n;\n') + '\n';
  fs.writeFileSync(bundle.output, combined, 'utf8');

  execFileSync(process.execPath, ['--check', bundle.output], { stdio: 'inherit' });
  const sizeKb = (Buffer.byteLength(combined, 'utf8') / 1024).toFixed(1);
  console.log(`[build_admin_bundle] OK: js/${bundle.name} (${bundle.files.length} files, ${sizeKb} KB)`);
}

function main() {
  for (const bundle of BUNDLES) {
    buildBundle(bundle);
  }
}

try {
  main();
} catch (err) {
  console.error('[build_admin_bundle] FAILED:', err && err.message ? err.message : err);
  process.exit(1);
}

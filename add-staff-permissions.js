/**
 * Run this once to add missing permission columns to the staff table.
 * Usage: node add-staff-permissions.js
 */
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to database');

  const columns = [
    { name: 'canViewDashboard',  default: true },
    { name: 'canMakeSales',      default: true },
    { name: 'canManageExpenses', default: false },
  ];

  for (const col of columns) {
    // Convert camelCase to snake_case for Postgres
    const colName = col.name.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    try {
      await client.query(
        `ALTER TABLE staff ADD COLUMN IF NOT EXISTS "${colName}" boolean NOT NULL DEFAULT ${col.default}`
      );
      console.log(`✓ Column "${colName}" added (or already exists)`);
    } catch (err) {
      console.error(`✗ Failed to add "${colName}":`, err.message);
    }
  }

  await client.end();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });

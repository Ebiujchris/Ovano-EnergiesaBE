/**
 * Run once to add missing columns to the database
 * Usage: node fix-columns.js
 */
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wnOYsaj59TLH@ep-shiny-brook-anhnwti6-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to database');

  const fixes = [
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS category varchar`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory varchar`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand varchar`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS "createdByStaffId" varchar`,
  ];

  for (const sql of fixes) {
    try {
      await client.query(sql);
      console.log('✓', sql);
    } catch (e) {
      console.log('⚠', e.message);
    }
  }

  await client.end();
  console.log('Done!');
}

run().catch(console.error);

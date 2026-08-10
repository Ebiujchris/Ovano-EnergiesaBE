const { Client } = require('pg');
require('dotenv').config();

async function backfillStaffNames() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Update sales that have createdByStaffId but no createdByStaffName
    const result = await client.query(`
      UPDATE sales
      SET "createdByStaffName" = staff.name
      FROM staff
      WHERE sales."createdByStaffId"::uuid = staff.id
        AND sales."createdByStaffName" IS NULL;
    `);

    console.log(`✅ Updated ${result.rowCount} sales with staff names`);
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

backfillStaffNames();

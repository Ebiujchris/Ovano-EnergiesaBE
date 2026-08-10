const { Client } = require('pg');
require('dotenv').config();

async function addStaffTrackingColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add createdByStaffName column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sales' AND column_name = 'createdByStaffName'
        ) THEN
          ALTER TABLE sales ADD COLUMN "createdByStaffName" varchar;
          RAISE NOTICE 'Added createdByStaffName column';
        ELSE
          RAISE NOTICE 'createdByStaffName column already exists';
        END IF;
      END
      $$;
    `);

    console.log('✅ Migration complete: staff tracking columns added');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addStaffTrackingColumns();

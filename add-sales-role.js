const { Client } = require('pg');
require('dotenv').config();

async function addSalesRole() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // First, find the enum type name for the staff.role column
    const enumCheck = await client.query(`
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname LIKE '%staff%role%' OR t.typname LIKE '%role%'
      GROUP BY t.typname;
    `);

    console.log('Found enum types:', enumCheck.rows);

    if (enumCheck.rows.length === 0) {
      console.log('No staff role enum found. Checking staff table column type...');
      
      // Check the actual column type
      const columnCheck = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          udt_name
        FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'role';
      `);
      
      console.log('Staff role column info:', columnCheck.rows);
      
      if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'USER-DEFINED') {
        const enumTypeName = columnCheck.rows[0].udt_name;
        console.log(`Found enum type: ${enumTypeName}`);
        
        // Add 'sales' to the enum
        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'sales' 
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumTypeName}')
            ) THEN
              ALTER TYPE ${enumTypeName} ADD VALUE 'sales';
              RAISE NOTICE 'Added sales role to enum';
            ELSE
              RAISE NOTICE 'sales role already exists';
            END IF;
          END
          $$;
        `);
        
        console.log('✅ Migration complete: sales role added');
      } else {
        console.log('Staff role column is not an enum type. It may be a varchar.');
        console.log('No migration needed - TypeORM will handle it as a varchar column.');
      }
    } else {
      // Use the found enum type
      const enumTypeName = enumCheck.rows[0].enum_name;
      const currentValues = enumCheck.rows[0].enum_values;
      
      console.log(`Enum type: ${enumTypeName}`);
      console.log(`Current values: ${currentValues.join(', ')}`);
      
      if (currentValues.includes('sales')) {
        console.log('✅ sales role already exists in the enum');
      } else {
        await client.query(`ALTER TYPE ${enumTypeName} ADD VALUE 'sales';`);
        console.log('✅ Migration complete: sales role added');
      }
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addSalesRole();

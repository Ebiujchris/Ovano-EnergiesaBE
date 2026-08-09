/**
 * Migration script to add createdByStaffId column to sales table
 * Run this after deploying the Sale entity changes
 * Usage: node add-createdByStaffId-column.js
 */

const { createConnection } = require('typeorm');
const path = require('path');

async function runMigration() {
  const connection = await createConnection({
    type: process.env.DATABASE_TYPE || 'sqlite',
    database: process.env.DATABASE_URL || './shop.db',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    entities: [path.join(__dirname, 'dist/src/entities/*.js')],
    synchronize: false,
  });

  const queryRunner = connection.createQueryRunner();

  try {
    console.log('Adding createdByStaffId column to sales table...');
    
    await queryRunner.addColumn('sales', new (require('typeorm').TableColumn)({
      name: 'createdByStaffId',
      type: 'varchar',
      isNullable: true,
    }));
    
    console.log('✓ createdByStaffId column added successfully');
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('✓ createdByStaffId column already exists');
    } else {
      console.error('✗ Error adding column:', error.message);
      throw error;
    }
  } finally {
    await connection.close();
    console.log('Migration completed');
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

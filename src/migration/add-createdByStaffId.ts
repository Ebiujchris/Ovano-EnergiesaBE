import { DataSource } from 'typeorm';

export async function ensureCreatedByStaffIdColumn(dataSource: DataSource) {
  try {
    const queryRunner = dataSource.createQueryRunner();
    
    try {
      // For PostgreSQL - check if column exists
      const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'createdByStaffId'
      `;
      
      const result = await queryRunner.query(query);
      
      if (result.length === 0) {
        console.log('[DB] Adding createdByStaffId column to sales table...');
        await queryRunner.query(`
          ALTER TABLE "sales" ADD COLUMN "createdByStaffId" varchar NULL
        `);
        console.log('[DB] ✓ createdByStaffId column added successfully');
      }
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.warn('[DB] Warning during migration:', (error as any).message);
    // Don't throw - allow app to continue
  }
}

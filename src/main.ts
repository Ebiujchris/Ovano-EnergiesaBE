import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

async function runMigrations(dataSource: DataSource) {
  const q = dataSource.createQueryRunner();
  try {
    // Add missing columns to products table if they don't exist
    const cols = [
      { name: 'category', type: 'varchar', nullable: true },
      { name: 'subcategory', type: 'varchar', nullable: true },
      { name: 'brand', type: 'varchar', nullable: true },
      { name: 'createdByStaffId', type: 'varchar', nullable: true },
    ];
    for (const col of cols) {
      const result = await q.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = '${col.name}'
      `);
      if (result.length === 0) {
        await q.query(`ALTER TABLE "products" ADD COLUMN "${col.name}" varchar NULL`);
        console.log(`[DB] Added column products.${col.name}`);
      }
    }
    // Add createdByStaffId to sales
    const saleCol = await q.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name = 'createdByStaffId'
    `);
    if (saleCol.length === 0) {
      await q.query(`ALTER TABLE "sales" ADD COLUMN "createdByStaffId" varchar NULL`);
      console.log('[DB] Added column sales.createdByStaffId');
    }
  } catch (e) {
    console.warn('[DB] Migration warning:', (e as any)?.message);
  } finally {
    await q.release();
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Run migrations on startup
  try {
    const dataSource = app.get(DataSource);
    await runMigrations(dataSource);
  } catch (e) {
    console.warn('[DB] Could not run migrations:', (e as any)?.message);
  }
  
  // CORS should be working - redeploying to fix
  // TODO: Run migrations once createdByStaffId is properly working
  // try {
  //   const dataSource = app.get(DataSource);
  //   await ensureCreatedByStaffIdColumn(dataSource);
  // } catch (error) {
  //   console.warn('Migration warning:', error);
  // }
  
  // Always include these origins; CORS_ORIGIN env can add more
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://ovano-energies.vercel.app',
    'https://ovano-energiesa-fe.vercel.app',
    'https://e-duuka-fe.vercel.app',
  ];

  const extraOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  const allowedOrigins = [...new Set([...defaultOrigins, ...extraOrigins])];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow any vercel.app preview deployment for this project
      if (origin.includes('ovano-energies') && origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  
  // Set global prefix for API routes
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health'],
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Ovano Energies API is running on: http://localhost:${port}`);
  console.log(`📱 Mobile API endpoints: http://localhost:${port}/api`);
  console.log(`🏠 Homepage: http://localhost:${port}`);
}
bootstrap();

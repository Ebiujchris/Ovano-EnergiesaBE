import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);

  // Cookies (for HttpOnly auth cookies in admin panel)
  await app.register(fastifyCookie);

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Managed per-client (Next.js, Flutter)
  });

  // Register multipart for file uploads (10MB max)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Serve uploaded files locally only when S3/R2 is not configured
  const useLocalStorage = !configService.get<string>('S3_ENDPOINT');
  if (useLocalStorage) {
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    await app.register(fastifyStatic, {
      root: uploadsDir,
      prefix: '/uploads/',
      decorateReply: false,
    });
  }

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health'],
  });

  // Health check (outside versioned prefix for load balancers)
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.get('/health', async () => ({ status: 'ok' }));

  // Global exception filter (prevents stack trace leaks)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  app.enableCors({
    origin: isProduction
      ? [
          configService.get<string>('FRONTEND_URL', 'https://tavuel-front.vercel.app'),
          configService.get<string>('APP_URL', 'https://tavuel.com'),
        ].filter(url => url && url !== '*')
      : true,
    credentials: true,
  });

  // Validate critical secrets
  const jwtSecret = configService.get<string>('JWT_SECRET', '');
  if (isProduction && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  // Swagger (only in explicit development mode)
  if (configService.get<string>('NODE_ENV') === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tavuel API')
      .setDescription('API para la plataforma de servicios del hogar Tavuel')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`Tavuel API running on http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();

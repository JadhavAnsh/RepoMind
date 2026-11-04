import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { getCorsOptions } from './config/cors.config';
import { setupOpenApi } from './config/openapi.config';
import { AllExceptionsFilter } from './common/filters/error.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS matching coach-backend configuration
  app.enableCors(getCorsOptions());

  // Global prefix with root ping excluded
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // URI-based API Versioning (/api/v1/...)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ApiResponseInterceptor(),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // OpenAPI / Swagger documentation
  setupOpenApi(app);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  logger.log(`API server running on http://localhost:${port}`);
  logger.log(`OpenAPI Swagger documentation at http://localhost:${port}/docs`);
}

bootstrap();

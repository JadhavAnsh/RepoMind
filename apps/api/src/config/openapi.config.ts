import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('RepoMind API')
    .setDescription(
      'Organizational Memory Engine API. Connects to GitHub repositories to answer engineering questions with traceable citations.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'BearerAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'api_key',
        description: 'Server API key',
      },
      'ApiKey',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-tenant-id',
        description: 'Tenant or workspace identifier',
      },
      'TenantId',
    )
    .addTag('App', 'General application information and base endpoints')
    .addTag('Health', 'Liveness and readiness checks')
    .addTag('Auth', 'Authentication and session management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json',
  });
}

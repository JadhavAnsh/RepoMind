import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getCorsOptions(): CorsOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  const origins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: isProd ? origins : true,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'auth_token',
      'api_key',
      'API_KEY',
      'x-tenant-id',
      'X-TENANT-ID',
      'x-correlation-id',
      'x-bootstrap-token',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  };
}

export interface EnvironmentVariables {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL?: string;
  CORS_ORIGINS?: string;
  SITE_URL?: string;
  API_KEY?: string;
  RETRIEVAL_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  return {
    PORT: Number(config.PORT ?? 4000),
    NODE_ENV: (config.NODE_ENV as string) ?? 'development',
    DATABASE_URL: config.DATABASE_URL as string,
    CORS_ORIGINS: config.CORS_ORIGINS as string,
    SITE_URL: config.SITE_URL as string,
    API_KEY: config.API_KEY as string,
    RETRIEVAL_URL: config.RETRIEVAL_URL as string,
  };
}

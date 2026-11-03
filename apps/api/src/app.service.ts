import { Injectable } from '@nestjs/common';

export interface AppBaseInfo {
  name: string;
  version: string;
  description: string;
  status: string;
  timestamp: string;
  docs: string;
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to RepoMind API! Visit /docs for OpenAPI documentation.';
  }

  getBaseInfo(): AppBaseInfo {
    return {
      name: 'RepoMind API',
      version: '1.0.0',
      description:
        'Organizational Memory Engine API. Connects to GitHub repositories to answer engineering questions with traceable citations.',
      status: 'ok',
      timestamp: new Date().toISOString(),
      docs: '/docs',
    };
  }
}

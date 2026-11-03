import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    // In future iterations, add DB / Redis ping here
    return {
      status: 'ok',
      database: true,
      timestamp: new Date().toISOString(),
    };
  }
}

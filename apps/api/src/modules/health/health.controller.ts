import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('ping')
  @ApiOperation({ summary: 'Ping check', description: 'Simple OK response; no auth.' })
  @ApiResponse({ status: 200, description: 'Ping response' })
  ping() {
    return { ok: true };
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Reports API status plus real db and retrieval connectivity checks.',
  })
  @ApiResponse({ status: 200, description: 'Health report' })
  checkHealth() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Runs the same real db and retrieval checks as /health.',
  })
  @ApiResponse({ status: 200, description: 'Readiness report' })
  checkReady() {
    return this.healthService.getReadiness();
  }
}

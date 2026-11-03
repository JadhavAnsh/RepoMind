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
  @ApiOperation({ summary: 'Liveness check', description: 'Returns system health status.' })
  @ApiResponse({ status: 200, description: 'Liveness status' })
  checkHealth() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check', description: 'Returns dependency and worker readiness.' })
  @ApiResponse({ status: 200, description: 'Readiness status' })
  checkReady() {
    return this.healthService.getReadiness();
  }
}

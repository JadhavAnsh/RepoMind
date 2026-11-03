import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService, AppBaseInfo } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get()
  @ApiOperation({
    summary: 'Base endpoint',
    description: 'Returns API metadata, service description, and documentation link.',
  })
  @ApiResponse({ status: 200, description: 'Base application info' })
  getBase(): AppBaseInfo {
    return this.appService.getBaseInfo();
  }

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('hello')
  @ApiOperation({
    summary: 'Welcome greeting',
    description: 'Returns a simple welcome message.',
  })
  @ApiResponse({ status: 200, description: 'Welcome greeting' })
  getHello(): string {
    return this.appService.getHello();
  }
}

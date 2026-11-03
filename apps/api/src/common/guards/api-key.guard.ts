import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['api_key'] || request.headers['x-api-key'];
    const configuredKey = this.configService.get<string>('API_KEY');

    if (!configuredKey) {
      return true; // If no API key configured, pass through
    }

    if (!apiKey || apiKey !== configuredKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

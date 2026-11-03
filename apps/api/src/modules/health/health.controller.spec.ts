import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should return ok for root ping', () => {
    expect(controller.ping()).toEqual({ ok: true });
  });

  it('should return ok for health check', () => {
    const result = controller.checkHealth();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });

  it('should return ok for readiness check', async () => {
    const result = await controller.checkReady();
    expect(result.status).toBe('ok');
    expect(result.database).toBe(true);
  });
});

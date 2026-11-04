import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  const originalEnv = { ...process.env };
  let controller: HealthController;
  let service: HealthService;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    delete process.env.RETRIEVAL_URL;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get(HealthController);
    service = module.get(HealthService);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('should return ok for root ping', () => {
    expect(controller.ping()).toEqual({ ok: true });
  });

  it('all-ok: status ok when db and retrieval are reachable', async () => {
    jest.spyOn(service, 'checkDatabase').mockResolvedValue('ok');
    process.env.RETRIEVAL_URL = 'http://worker.test:8000';
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const result = await controller.checkHealth();
    expect(result.status).toBe('ok');
    expect(result.services).toEqual({ api: 'ok', db: 'ok', retrieval: 'ok' });
  });

  it('db not_configured: degraded when DATABASE_URL is unset', async () => {
    process.env.RETRIEVAL_URL = 'http://worker.test:8000';
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const result = await controller.checkHealth();
    expect(result.status).toBe('degraded');
    expect(result.services.db).toBe('not_configured');
    expect(result.services.retrieval).toBe('ok');
  });

  it('db unreachable: degraded for an unroutable DATABASE_URL', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/repomind';
    process.env.RETRIEVAL_URL = 'http://worker.test:8000';
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const result = await controller.checkHealth();
    expect(result.status).toBe('degraded');
    expect(result.services.db).toBe('unreachable');
  });

  it('ready: uses real checks and no longer hardcodes database', async () => {
    const result = await controller.checkReady();
    expect(result.ready).toBe(false);
    expect(result.status).toBe('degraded');
    expect(result).not.toHaveProperty('database');
  });
});

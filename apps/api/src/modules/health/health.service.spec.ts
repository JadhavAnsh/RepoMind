import { HealthService } from './health.service';

describe('HealthService', () => {
  const originalEnv = { ...process.env };
  let service: HealthService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.RETRIEVAL_URL;
    service = new HealthService();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    process.env = { ...originalEnv };
  });

  it('reports not_configured for db and retrieval when env is unset', async () => {
    const report = await service.getLiveness();
    expect(report.status).toBe('degraded');
    expect(report.services).toEqual({
      api: 'ok',
      db: 'not_configured',
      retrieval: 'not_configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports ok when db and retrieval are reachable', async () => {
    jest.spyOn(service, 'checkDatabase').mockResolvedValue('ok');
    process.env.RETRIEVAL_URL = 'http://worker.test:8000/';
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const report = await service.getLiveness();
    expect(report.status).toBe('ok');
    expect(report.services).toEqual({ api: 'ok', db: 'ok', retrieval: 'ok' });
    expect(report.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://worker.test:8000/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports db unreachable for an unroutable DATABASE_URL', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/repomind';
    expect(await service.checkDatabase()).toBe('unreachable');
  });

  it('reports db unreachable for a malformed DATABASE_URL', async () => {
    process.env.DATABASE_URL = 'not a url';
    expect(await service.checkDatabase()).toBe('unreachable');
  });

  it('reports retrieval unreachable on non-2xx', async () => {
    process.env.RETRIEVAL_URL = 'http://worker.test:8000';
    fetchMock.mockResolvedValue({ ok: false, status: 500 } as Response);
    expect(await service.checkRetrieval()).toBe('unreachable');
  });

  it('reports retrieval unreachable on network failure or timeout', async () => {
    process.env.RETRIEVAL_URL = 'http://worker.test:8000';
    fetchMock.mockRejectedValue(new Error('timeout'));
    expect(await service.checkRetrieval()).toBe('unreachable');
  });

  it('readiness uses the same checks and is not ready when degraded', async () => {
    const ready = await service.getReadiness();
    expect(ready.ready).toBe(false);
    expect(ready.services.db).toBe('not_configured');
  });
});

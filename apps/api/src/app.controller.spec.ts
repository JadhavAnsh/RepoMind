import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getBase', () => {
    it('should return base application metadata', () => {
      const result = appController.getBase();
      expect(result.name).toBe('RepoMind API');
      expect(result.version).toBe('1.0.0');
      expect(result.status).toBe('ok');
      expect(result.docs).toBe('/docs');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getHello', () => {
    it('should return welcome message', () => {
      expect(appController.getHello()).toContain('RepoMind API');
    });
  });
});

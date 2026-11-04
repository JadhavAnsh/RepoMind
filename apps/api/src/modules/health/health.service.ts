import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { resolve } from 'node:path';

export type DependencyStatus = 'ok' | 'unreachable' | 'not_configured';

export interface HealthReport {
  status: 'ok' | 'degraded';
  version: string;
  timestamp: string;
  services: {
    api: 'ok';
    db: DependencyStatus;
    retrieval: DependencyStatus;
  };
}

export interface ReadinessReport extends HealthReport {
  ready: boolean;
}

export const HEALTH_CHECK_TIMEOUT_MS = 1500;

function readApiVersion(): string {
  try {
    const raw = readFileSync(
      resolve(__dirname, '../../../package.json'),
      'utf8',
    );
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      typeof parsed.version === 'string'
    ) {
      return parsed.version;
    }
  } catch {
    // fall through
  }
  return 'unknown';
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version = readApiVersion();

  /** Real checks for db and retrieval; "ok" only when the check succeeded. */
  async getLiveness(): Promise<HealthReport> {
    const [db, retrieval] = await Promise.all([
      this.checkDatabase(),
      this.checkRetrieval(),
    ]);
    return {
      status: db === 'ok' && retrieval === 'ok' ? 'ok' : 'degraded',
      version: this.version,
      timestamp: new Date().toISOString(),
      services: { api: 'ok', db, retrieval },
    };
  }

  async getReadiness(): Promise<ReadinessReport> {
    const report = await this.getLiveness();
    return { ...report, ready: report.status === 'ok' };
  }

  /** TCP connect to the host/port in DATABASE_URL, bounded by a timeout. */
  async checkDatabase(): Promise<DependencyStatus> {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) return 'not_configured';

    let host: string;
    let port: number;
    try {
      const parsed = new URL(url);
      host = parsed.hostname;
      port = parsed.port ? Number(parsed.port) : 5432;
      if (!host || !Number.isInteger(port)) return 'unreachable';
    } catch {
      this.logger.warn('DATABASE_URL is not a valid URL');
      return 'unreachable';
    }

    return new Promise<DependencyStatus>((done) => {
      const socket = connect({ host, port });
      let settled = false;
      const finish = (status: DependencyStatus) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        done(status);
      };
      socket.setTimeout(HEALTH_CHECK_TIMEOUT_MS);
      socket.once('connect', () => finish('ok'));
      socket.once('timeout', () => finish('unreachable'));
      socket.once('error', () => finish('unreachable'));
    });
  }

  /** HTTP GET {RETRIEVAL_URL}/health, bounded by a timeout. */
  async checkRetrieval(): Promise<DependencyStatus> {
    const base = process.env.RETRIEVAL_URL?.trim();
    if (!base) return 'not_configured';

    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/health`, {
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      return response.ok ? 'ok' : 'unreachable';
    } catch {
      return 'unreachable';
    }
  }
}

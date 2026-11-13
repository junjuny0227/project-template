import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { PrismaService } from '../prisma/prisma.service.js';

// DB에 실제 쿼리를 보내 연결을 확인한다. 실패하면 down으로 표시하고 Terminus가 503을 응답한다.
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string) {
    const result = this.indicator.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return result.up();
    } catch {
      return result.down();
    }
  }
}

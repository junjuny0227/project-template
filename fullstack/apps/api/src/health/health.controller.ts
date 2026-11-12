import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';

import { Public } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        const database = this.indicator.check('database');
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return database.up();
        } catch {
          return database.down();
        }
      },
    ]);
  }
}

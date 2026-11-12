import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { validateEnv } from './config/env.js';
import { loggingOptions } from './config/logging.js';
import { HealthModule } from './health/health.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot(loggingOptions()),
    AuthModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter],
})
export class AppModule {}

import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, type ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { type NodeEnv, validateEnv } from './config/env.js';
import { loggingOptions } from './config/logging.js';
import { HealthModule } from './health/health.module.js';
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loggingOptions(config.getOrThrow<NodeEnv>('NODE_ENV')),
    }),
    AuthModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter],
})
export class AppModule {
  static register(options: ConfigModuleOptions = {}): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, ...options })],
    };
  }
}

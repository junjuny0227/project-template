import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
@Module({ imports: [TerminusModule, PrismaModule], controllers: [HealthController] })
export class HealthModule {}

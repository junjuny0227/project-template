import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

import 'reflect-metadata';
const app = await NestFactory.create(AppModule, { bufferLogs: true });
configureApp(app);
await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));

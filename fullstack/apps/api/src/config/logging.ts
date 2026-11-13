import { randomUUID } from 'node:crypto';
import type { Options } from 'pino-http';

import type { NodeEnv } from './env.js';

export function loggingOptions(nodeEnv: NodeEnv): { pinoHttp: Options } {
  return {
    pinoHttp: {
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      redact: ['req.headers.cookie', 'req.headers.authorization'],
      autoLogging: { ignore: (req) => req.url?.split('?')[0] === '/health' },
      ...(nodeEnv === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
    },
  };
}

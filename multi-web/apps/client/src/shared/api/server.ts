import { createServerApiInstance } from '@repo/core/server';

import { env } from '@/shared/config';

import 'server-only';

export const serverAxiosInstance = createServerApiInstance(env.API_BASE_URL);

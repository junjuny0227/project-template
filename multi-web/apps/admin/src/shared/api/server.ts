import { createApiInstance } from '@repo/core/shared/api';

import { env } from '@/shared/config';

import 'server-only';

export const serverAxiosInstance = createApiInstance(env.API_BASE_URL);

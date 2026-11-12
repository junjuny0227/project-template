import axios from 'axios';

import { env } from '@/shared/config';

import { applyInterceptors } from './interceptors';

import 'server-only';

export const serverAxiosInstance = applyInterceptors(
  axios.create({
    baseURL: env.API_BASE_URL,
    timeout: 10000,
  }),
);

import axios from 'axios';

import { applyInterceptors } from './interceptors';

export const axiosInstance = applyInterceptors(
  axios.create({
    baseURL: '/backend',
    timeout: 10000,
  }),
);

import axios from 'axios';

import { API_BASE_URL } from '@/shared/config';

import 'server-only';

export const serverAxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

serverAxiosInstance.interceptors.response.use((response) => response.data);

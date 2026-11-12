import { createApiMethods } from '@repo/core';

import { axiosInstance } from './client';

export { axiosInstance } from './client';
export { ApiError, getQueryClient, setOnUnauthorized } from '@repo/core';

export const { del, get, patch, post, put } = createApiMethods(axiosInstance);

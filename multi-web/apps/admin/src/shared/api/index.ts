import { createApiMethods } from '@repo/core/shared/api';

import { axiosInstance } from './client';

export { axiosInstance } from './client';
export { ApiError, getQueryClient, setOnUnauthorized } from '@repo/core/shared/api';

export const { del, get, patch, post, put } = createApiMethods(axiosInstance);

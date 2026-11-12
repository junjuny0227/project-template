import { axiosInstance } from './client';
import { createApiMethods } from './createApiMethods';

export { ApiError } from './apiError';
export { axiosInstance } from './client';
export { setOnUnauthorized } from './interceptors';

export const { del, get, patch, post, put } = createApiMethods(axiosInstance);

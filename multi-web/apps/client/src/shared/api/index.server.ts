import { createApiMethods } from '@repo/core';

import { serverAxiosInstance } from './server';

export { serverAxiosInstance } from './server';

export const { del, get, patch, post, put } = createApiMethods(serverAxiosInstance);

import { createApiMethods } from './createApiMethods';
import { serverAxiosInstance } from './server';

export { serverAxiosInstance } from './server';

export const { del, get, patch, post, put } = createApiMethods(serverAxiosInstance);

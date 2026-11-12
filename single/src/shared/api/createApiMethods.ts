import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// 응답의 .data만 돌려준다. 응답 타입은 첫 번째 제네릭으로, body 타입은 두 번째 제네릭이나 인자에서 정한다.
export const createApiMethods = (instance: AxiosInstance) => ({
  get: async <TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> =>
    (await instance.get<TResponse>(url, config)).data,

  post: async <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> =>
    (await instance.post<TResponse, AxiosResponse<TResponse>, TBody>(url, body, config)).data,

  patch: async <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> =>
    (await instance.patch<TResponse, AxiosResponse<TResponse>, TBody>(url, body, config)).data,

  put: async <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> =>
    (await instance.put<TResponse, AxiosResponse<TResponse>, TBody>(url, body, config)).data,

  del: async <TResponse = void>(url: string, config?: AxiosRequestConfig): Promise<TResponse> =>
    (await instance.delete<TResponse>(url, config)).data,
});

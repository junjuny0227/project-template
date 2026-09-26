import { axiosInstance } from './client';

export const del = async <T>(...args: Parameters<typeof axiosInstance.delete>): Promise<T> =>
  (await axiosInstance.delete<T>(...args)).data;

export const get = async <T>(...args: Parameters<typeof axiosInstance.get>): Promise<T> =>
  (await axiosInstance.get<T>(...args)).data;

export const patch = async <T>(...args: Parameters<typeof axiosInstance.patch>): Promise<T> =>
  (await axiosInstance.patch<T>(...args)).data;

export const post = async <T>(...args: Parameters<typeof axiosInstance.post>): Promise<T> =>
  (await axiosInstance.post<T>(...args)).data;

export const put = async <T>(...args: Parameters<typeof axiosInstance.put>): Promise<T> =>
  (await axiosInstance.put<T>(...args)).data;

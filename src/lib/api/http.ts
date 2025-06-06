import { axiosInstance } from './axiosInstance';

export const del = async <T>(...args: Parameters<typeof axiosInstance.delete>) =>
  axiosInstance.delete<T, T>(...args);

export const get = async <T>(...args: Parameters<typeof axiosInstance.get>) =>
  axiosInstance.get<T, T>(...args);

export const patch = async <T>(...args: Parameters<typeof axiosInstance.patch>) =>
  axiosInstance.patch<T, T>(...args);

export const post = async <T>(...args: Parameters<typeof axiosInstance.post>) =>
  axiosInstance.post<T, T>(...args);

export const put = async <T>(...args: Parameters<typeof axiosInstance.put>) =>
  axiosInstance.put<T, T>(...args);

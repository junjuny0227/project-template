import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: '/backend',
  timeout: 10000,
});

import axios, { AxiosRequestHeaders } from "axios";
import {getSession} from "../lib/action"
export const BASE_URL = "/";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(async (config) => {
  const session = await getSession()
  
  const token = session?.token;

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  get: async (endpoint: string, headers?: Partial<AxiosRequestHeaders>) => {
    const response = await axiosInstance.get(endpoint, {
      headers: headers as AxiosRequestHeaders,
    });
    return response.data;
  },

  post: async (
    endpoint: string,
    data: unknown,
    headers?: Partial<AxiosRequestHeaders>
  ) => {
    const response = await axiosInstance.post(endpoint, data, {
      headers: headers as AxiosRequestHeaders,
    });
    return response.data;
  },

  put: async (
    endpoint: string,
    data: unknown,
    headers?: Partial<AxiosRequestHeaders>
  ) => {
    const response = await axiosInstance.put(endpoint, data, {
      headers: headers as AxiosRequestHeaders,
    });
    return response.data;
  },

  patch: async (
    endpoint: string,
    data: unknown,
    headers?: Partial<AxiosRequestHeaders>
  ) => {
    const response = await axiosInstance.patch(endpoint, data, {
      headers: headers as AxiosRequestHeaders,
    });
    return response.data;
  },

  delete: async (endpoint: string, headers: Partial<AxiosRequestHeaders>) => {
    const response = await axiosInstance.delete(endpoint, {
      headers: headers as AxiosRequestHeaders,
    });
    return response.data;
  },
};
